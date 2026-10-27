import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, copyFile, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

test('OpenAPI check detects drift without rewriting it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'bily-openapi-check-'));
  try {
    await mkdir(join(root, 'scripts'));
    const script = join(root, 'scripts/build-openapi.mjs');
    const output = join(root, 'openapi.json');
    await copyFile(new URL('./build-openapi.mjs', import.meta.url), script);
    const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', cwd: tmpdir() });
    assert.equal(run([]).status, 0);
    const original = await readFile(output, 'utf8');
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
