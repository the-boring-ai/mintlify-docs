import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const migration = await readFile(new URL('migrations/2-0.mdx', root), 'utf8');
assert.match(migration, /current stable release is `2\.0\.8`/);
assert.match(migration, /npm install @bilyai\/js\n/);
const javascript = await readFile(new URL('sdk/javascript.mdx', root), 'utf8');
assert.match(javascript, /npm install @bilyai\/js\n/);
assert.match(javascript, /https:\/\/cdn\.jsdelivr\.net\/npm\/@bilyai\/js@2\/dist\/index\.js/);
assert.match(javascript, /lockfile/);
assert.match(javascript, /already-open page keeps its loaded code/);
assert.match(javascript, /Shopify theme files/);
const readiness = await readFile(new URL('api-reference/ready.mdx', root), 'utf8');
assert.match(readiness, /not merely when its bootstrap script loads/);
assert.match(readiness, /not a delivery receipt/);
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) await check(url);
    else if (entry.name.endsWith('.mdx')) {
      const source = await readFile(url, 'utf8');
      for (const block of source.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
        assert.doesNotMatch(block[1], /track\(["']PageView["']/, `${url.pathname}: manual page-view example duplicates runtime tracking`);
      }
    }
  }
}
await check(root);
console.log('SDK guidance passed: 2.0.8 readiness and no duplicate page-view examples.');
