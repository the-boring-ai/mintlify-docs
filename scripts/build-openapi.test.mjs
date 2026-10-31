import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { addAdsContracts } from './ads-openapi.mjs';

test('OpenAPI check detects drift without rewriting it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bily-openapi-check-'));
  try {
    await mkdir(join(root, 'scripts'));
    const script = join(root, 'scripts/build-openapi.mjs');
    const output = join(root, 'openapi.json');
    await copyFile(new URL('./build-openapi.mjs', import.meta.url), script);
    for (const name of ['ads-openapi.mjs', 'ads-public-contracts.json']) {
      await copyFile(new URL(`./${name}`, import.meta.url), join(root, 'scripts', name));
    }
    const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: tmpdir() });
    assert.equal(run([]).status, 0);
    const original = await readFile(output, 'utf8');
    const specification = JSON.parse(original);
    const resolveRefs = value => {
      if (!value || typeof value !== 'object') return;
      if (value.$ref?.startsWith('#/')) {
        let target = specification;
        for (const segment of value.$ref.slice(2).split('/')) target = target?.[segment.replaceAll('~1', '/').replaceAll('~0', '~')];
        assert.notEqual(target, undefined, `Unresolved schema reference: ${value.$ref}`);
      }
      for (const child of Object.values(value)) resolveRefs(child);
    };
    resolveRefs(specification);
    const before = await stat(output);
    assert.equal(run(['--check']).status, 0);
    assert.equal((await stat(output)).mtimeMs, before.mtimeMs);
    const drift = original.replace('"version": "1.0.0"', '"version": "unreviewed"');
    assert.notEqual(drift, original);
    await writeFile(output, drift);
    const failed = run(['--check']);
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /out of date/);
    assert.equal(await readFile(output, 'utf8'), drift);
    assert.notEqual(run(['--unknown']).status, 0);
    assert.equal(await readFile(output, 'utf8'), drift);
    await rm(output);
    assert.notEqual(run(['--check']).status, 0);
    await assert.rejects(readFile(output), { code: 'ENOENT' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

const adsSpec = () => {
  const paths = {};
  const components = { schemas: {} };
  addAdsContracts({ paths, components });
  return { paths, schemas: components.schemas };
};

test('ad HTTP contracts preserve explicit draft review and durable job outcomes', () => {
  const { paths, schemas } = adsSpec();
  const prefix = '/platform/{resourceUrl}';
  assert.ok(paths[`${prefix}/action-drafts`].post.responses['201']);
  assert.ok(paths[`${prefix}/action-drafts/batch`].post.responses['201']);
  const batch = schemas.AdsPrepareAdDraftBatchInput;
  assert.equal(batch.properties.draftIds.minItems, 2);
  assert.equal(batch.properties.draftIds.maxItems, 100);
  assert.equal(batch.properties.draftIds.uniqueItems, true);
  assert.ok(paths[`${prefix}/action-jobs/{jobId}/start`].post.responses['202']);
  assert.equal(paths[`${prefix}/action-jobs/{jobId}/start`].post.requestBody, undefined);
  assert.match(paths[`${prefix}/action-jobs`].post.description, /auto-start unless autoStart is false/);
  assert.ok(paths[`${prefix}/action-jobs`].post.responses['201']);
  assert.ok(paths[`${prefix}/action-jobs`].post.responses['202']);
  assert.deepEqual(schemas.AdActionJob.required.includes('id'), true);
  assert.equal(schemas.AdActionJob.properties.jobId, undefined);
  assert.ok(schemas.AdActionJob.properties.status.enum.includes('completed_with_errors'));
  assert.ok(schemas.AdActionJob.properties.actions.items.properties.retryable);
  assert.equal(schemas.AdsSaveAdDraftInput.properties.storeUrl, undefined);
  assert.equal(schemas.AdsSaveAdDraftInput.required.includes('storeUrl'), false);
});

test('native budget schemas retain exact-source and conditional guard requirements', () => {
  const { paths, schemas } = adsSpec();
  const read = schemas.AdsReadAssetBudgetInput;
  assert.ok(read.required.includes('sourceAuthority'));
  assert.equal(read.properties.platform.type, 'string', 'Renderers must include the required platform enum in generated request examples');
  assert.deepEqual(read.properties.platform.enum, ['FACEBOOK', 'GOOGLE_ADS']);
  assert.equal(read.example.platform, 'FACEBOOK');
  assert.deepEqual(Object.keys(read.example).sort(), [...read.required].sort(), 'A native budget quote example includes every required HTTP field');
  assert.equal(read.properties.resourceUrl, undefined);
  assert.equal(read.properties.payload.oneOf[1].properties.parentAssetId.type, 'string');
  const update = schemas.UpdateAssetRequest;
  assert.equal(update.properties.budgetGuard.$ref, '#/components/schemas/NativeBudgetGuard');
  assert.deepEqual(update.allOf[0].then.properties.platform, { const: 'GOOGLE_ADS', type: 'string' });
  assert.deepEqual(update.allOf[1].then.required, ['adAccountId', 'budgetGuard']);
  assert.deepEqual(update.allOf[2].then.properties.updates.required, ['budget', 'budgetType']);
  assert.equal(update.allOf[2].then.properties.updates.additionalProperties, false);
  assert.ok(update.allOf.at(-1).then.required.includes('sourceAuthority'));
  const [meta, google] = schemas.NativeBudgetGuard.oneOf;
  assert.equal(meta.properties.platform.const, 'FACEBOOK');
  assert.ok(meta.required.includes('sourceAuthority'));
  assert.equal(google.properties.unitsPerCurrency.const, 1000000);
  assert.ok(google.required.includes('affectedCampaignIds'));
  assert.equal(google.properties.affectedCampaignIds.uniqueItems, true);
  assert.match(update.description, /Meta omits top-level sourceAuthority/);
  const unavailable = paths['/platform/{resourceUrl}/actions/read-asset-budget'].post.responses['200'].content['application/json'].example.result;
  assert.equal(unavailable.canEdit, false);
  assert.equal(unavailable.reason, 'native_budget_unavailable');
  assert.equal(unavailable.budgetGuard, undefined, 'An ineligible quote never fabricates an executable budget guard');
});

test('public creative and hierarchy routes exclude private transport and unsupported X ads', () => {
  const { paths, schemas } = adsSpec();
  assert.ok(paths['/platform/{resourceUrl}/actions/manage-google-demand-gen-asset']);
  assert.ok(paths['/platform/{resourceUrl}/actions/manage-meta-asset']);
  assert.ok(paths['/platform/{resourceUrl}/actions/manage-pinterest-asset']);
  assert.ok(paths['/platform/{resourceUrl}/actions/manage-snapchat-asset']);
  assert.ok(paths['/platform/{resourceUrl}/actions/manage-tiktok-asset']);
  assert.ok(paths['/creative-intelligence/{storeUrl}/generate'].post.responses['202']);
  assert.equal(schemas.GeneratedAdCreative.example.status, 'processing');
  assert.equal(schemas.GeneratedAdCreative.example.mediaUrl, null);
  assert.equal(schemas.UploadedAdCreative.example.status, 'pending');
  assert.equal(schemas.UploadedAdCreative.example.mediaUrl, null);
  const upload = paths['/creative-intelligence/{storeUrl}/uploads/{uploadId}/media'];
  assert.ok(upload.put.requestBody.content['image/png']);
  assert.ok(upload.get && upload.head);
  assert.match(upload.put.description, /OAuth MCP grant alone does not authenticate/);
  assert.deepEqual(upload.get.parameters.find(p => p.name === 'dpr').schema.enum, ['2']);
  assert.equal(schemas.AdsCreateGoogleCampaignInput.properties.payload.oneOf.some(branch => branch.properties.campaignType?.enum?.includes('VIDEO')), false);
  assert.equal(Object.keys(paths).some(path => /internal|signed|purpose|\/actions\/(?:create|manage)-x-/.test(path)), false);
});
