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

test('pending generation HTTP reads keep private selectors out of query parameters and retain exact saved request metadata', () => {
  const { paths, schemas } = adsSpec();
  const base = '/creative-intelligence/{storeUrl}/generation-requests';
  const list = paths[base].get;
  assert.deepEqual(list.parameters.filter(p => p.in === 'query').map(p => p.name).sort(), ['limit', 'offset', 'unresolvedOnly']);
  assert.equal(list.parameters.find(p => p.name === 'x-bily-generation-request-source').in, 'header');
  assert.equal(list.parameters.find(p => p.name === 'x-bily-generation-request-source').required, false);
  assert.equal(list.parameters.find(p => p.name === 'unresolvedOnly').schema.const, true);
  const find = paths[base + '/by-key'].get;
  assert.deepEqual(find.parameters.filter(p => p.in === 'header').map(p => p.name).sort(), ['x-bily-generation-request-key', 'x-bily-generation-request-source']);
  assert.ok(find.parameters.filter(p => p.in === 'header').every(p => p.required));
  assert.equal(find.parameters.some(p => p.in === 'query'), false);
  assert.equal(paths[base + '/{requestId}'].get.parameters.some(p => p.name === 'requestId' && p.in === 'query'), false);
  const output = list.responses['200'].content['application/json'].schema;
  assert.ok(output.required.includes('admission'));
  assert.ok(output.required.includes('resourceUrl'));
  assert.ok(output.required.includes('resourceType'));
  assert.equal(output.properties.admission.$ref, '#/components/schemas/CreativeGenerationAdmission');
  assert.equal(output.properties.requests.items.$ref, '#/components/schemas/CreativeGenerationRequest');
  assert.equal(find.responses['200'].content['application/json'].schema.properties.request.anyOf[0].type, 'null');
  for (const operation of [list, find, paths[base + '/{requestId}'].get, paths[base].post]) {
    assert.equal(operation.responses['200'].headers['Cache-Control'].schema.const, 'private, no-store');
    assert.match(operation.description, /Pending release/);
  }
  assert.equal(schemas.CreativeGenerationRequest.additionalProperties, false);
  for (const field of ['requestKey', 'executionToken', 'workflowId', 'planningOwner'])
    assert.equal(field in schemas.CreativeGenerationRequest.properties, false);
});

test('pending fresh admission remains finite while known-key input and recovery stay compatible', () => {
  const { paths, schemas } = adsSpec();
  const [available, disabled] = schemas.CreativeGenerationAdmission.anyOf;
  assert.equal(available.properties.protocol.const, 'creative-generation-admission-v1');
  assert.equal(available.properties.state.const, 'available');
  assert.equal(available.properties.keyPrefix.minLength, 69);
  assert.equal(available.properties.keyPrefix.maxLength, 69);
  assert.ok(new RegExp(available.properties.keyPrefix.pattern).test('cg1.' + 'a'.repeat(64) + '.'));
  assert.equal(disabled.properties.state.const, 'disabled');
  assert.equal(disabled.properties.keyPrefix.type, 'null');
  const input = schemas.AdsRequestStaticCreativeInput;
  assert.equal(input.additionalProperties, false);
  assert.deepEqual(input.required, ['sourceIntelligenceId', 'idempotencyKey']);
  assert.ok(new RegExp(input.properties.idempotencyKey.pattern).test('retained-original-key'));
  assert.equal(input.properties.idempotencyKey.pattern, '^[A-Za-z0-9._~-]{1,256}$', 'Fresh105-character admission is conditional; known saved keys must not be silently rewritten or rejected by a universal fresh-only input schema');
  const post = paths['/creative-intelligence/{storeUrl}/generation-requests'].post;
  assert.ok(post.responses['200'] && post.responses['202']);
  assert.equal(post.parameters.find(p => p.name === 'x-bily-generation-request-attempt').required, false);
  assert.ok(post.responses['410']);
  assert.ok(paths['/creative-intelligence/{storeUrl}/generation-requests/by-key'].get.responses['410']);
  assert.equal(paths['/creative-intelligence/{storeUrl}/generation-requests'].get.responses['410'], undefined);
  const accepted = post.responses['202'].content['application/json'].example.request;
  assert.equal(accepted.status, 'queued');
  assert.equal(accepted.phase, 'awaiting_dispatch');
  for (const field of ['generationId', 'pinnedAt', 'lastError']) assert.equal(accepted[field], null);
  assert.equal(post.responses['200'].content['application/json'].example.request.status, 'failed');
  const listExample = paths['/creative-intelligence/{storeUrl}/generation-requests'].get.responses['200'].content['application/json'].example;
  assert.deepEqual(listExample.admission, { protocol: 'creative-generation-admission-v1', state: 'disabled', keyPrefix: null });
  assert.deepEqual(listExample.requests, []);
  assert.equal(paths['/creative-intelligence/{storeUrl}/generation-requests/by-key'].get.responses['200'].content['application/json'].example.request, null);
});

test('qualified generation rejection schemas preserve all four exact status-code pairs and never turn generic errors into proof', () => {
  const { paths, schemas } = adsSpec();
  const post = paths['/creative-intelligence/{storeUrl}/generation-requests'].post;
  for (const [status, expected] of Object.entries({ 400: ['invalid_request', 'source_unavailable'], 409: ['admission_changed'], 429: ['generation_limit'] })) {
    const branches = post.responses[status].content['application/json'].schema.anyOf;
    assert.deepEqual(branches[0].allOf[1], { not: { required: ['nonAdmission'] } });
    assert.deepEqual(branches.slice(1).map(b => b.allOf[1].properties.code.const), expected);
    for (const b of branches.slice(1))
      assert.equal(b.allOf[1].properties.nonAdmission.properties.code.const, b.allOf[1].properties.code.const);
    assert.equal(post.responses[status].headers['Cache-Control'].schema.const, 'private, no-store');
  }
  assert.equal(post.responses['503'].$ref, '#/components/responses/ServiceUnavailable');
  const receipt = schemas.CreativeGenerationNonAdmission;
  assert.equal(receipt.additionalProperties, false);
  assert.equal(receipt.required.length, 7);
  assert.equal(receipt.properties.outcome.const, 'not_admitted');
  assert.equal(receipt.properties.scope.const, 'this_submission');
  assert.equal(receipt.properties.requestKeySha256.pattern, '^[a-f0-9]{64}$');
  assert.match(schemas.CreativeGenerationQualifiedRejection.description, /Shape alone is not rejection authority/);
});

test('pending Demand Gen IMAGE endpoints preserve separate paused image schema and exact-source draft advice', () => {
  const { paths, schemas } = adsSpec();
  const prefix = '/platform/{resourceUrl}/actions/';
  for (const id of ['read-google-demand-gen-image', 'manage-google-demand-gen-image']) {
    const operation = paths[prefix + id].post;
    assert.match(operation.description, /Pending release/);
    assert.ok(operation.requestBody);
    assert.ok(operation.responses['200']);
  }
  const write = schemas.AdsManageGoogleDemandGenImageInput;
  assert.ok(write.required.includes('sourceAuthority'));
  assert.ok(write.required.includes('adAccountId'));
  assert.equal(write.properties.storeUrl, undefined);
  assert.match(JSON.stringify(write), /"IMAGE"/);
  assert.equal(JSON.stringify(write).includes('"VIDEO"'), false);
  assert.match(paths[prefix + 'manage-google-demand-gen-image'].post.description, /immutable action draft/);
  assert.match(paths[prefix + 'manage-google-demand-gen-image'].post.description, /Marketing references total at most 20/);
  assert.ok(paths[prefix + 'read-google-demand-gen-asset'], 'Existing video read remains separate and unchanged');
  assert.ok(paths[prefix + 'manage-google-demand-gen-asset'], 'Existing video manage remains separate and unchanged');
});


test('Demand Gen IMAGE omits the native-less longHeadline while Display, PMax and VIDEO keep their contracts', () => {
  const { schemas } = adsSpec();
  for (const operation of ['Create', 'Validate']) {
    const root = `Ads${operation}GoogleCampaignInput`;
    const input = schemas[root];
    const sharedName = `${root}_googleCreative`;
    const imageName = `${root}_googleDemandGenImageCreative`;
    const shared = schemas[sharedName];
    const image = schemas[imageName];
    const families = input.properties.payload.oneOf;
    assert.equal(families[1].properties.creative.$ref, `#/components/schemas/${sharedName}`);
    assert.equal(families[3].properties.creative.$ref, `#/components/schemas/${sharedName}`);
    assert.ok(shared.required.includes('longHeadline'));
    assert.equal(families[2].properties.creative.oneOf[0].$ref, `#/components/schemas/${imageName}`);
    assert.ok(image);
    assert.ok(!image.required.includes('longHeadline'));
    assert.deepEqual(image.required, shared.required.filter(name => name !== 'longHeadline'));
    assert.deepEqual(
      { ...image.properties.longHeadline, description: undefined },
      { ...shared.properties.longHeadline, description: undefined }
    );
    assert.equal(image.properties.longHeadline.type, 'string');
    assert.equal(image.properties.longHeadline.minLength, 1);
    assert.equal(image.properties.longHeadline.maxLength, 90);
    assert.match(image.properties.longHeadline.description, /Deprecated compatibility.*no native effect.*Omit/u);
    const video = families[2].properties.creative.oneOf[1];
    assert.ok(video.required.includes('longHeadlines'));
    assert.equal(video.properties.longHeadlines.minItems, 1);
    assert.equal(video.properties.longHeadlines.maxItems, 5);
    assert.equal(video.properties.longHeadlines.items.maxLength, 90);
  }
});
