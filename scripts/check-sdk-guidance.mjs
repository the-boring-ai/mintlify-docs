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

const eventReference = await readFile(new URL('api-reference/events.mdx', root), 'utf8');
const customEvents = await readFile(new URL('guides/custom-events.mdx', root), 'utf8');
for (const page of [eventReference, customEvents]) {
  assert.match(page, /UNSUPPORTED_EVENT/);
  assert.match(page, /Moment catalog/);
}
assert.match(eventReference, /Registration succeeded \| `CompleteRegistration`/);
assert.match(eventReference, /Appointment actually booked \| `Schedule`/);
assert.match(eventReference, /This table describes mapping, not a delivery guarantee/);
assert.match(customEvents, /TikTok, Google Ads and Snapchat use finite standard-event mappings/);
assert.doesNotMatch(customEvents, /track\("billing_checkout_completed"/);
console.log('Event guidance passed: standard outcomes, custom admission and destination boundaries.');


// Keep standalone recipes aligned with collector admission and recovery guards.
const verification = await readFile(new URL('guides/verification.mdx', root), 'utf8');
const tracking = await readFile(new URL('api-reference/track.mdx', root), 'utf8');
for (const [page, name] of [[verification, 'installation_verified'], [tracking, 'integration_connected']]) {
  assert.match(page, /configured Moment/);
  assert.match(page, /UNSUPPORTED_EVENT/);
  assert.ok(page.indexOf('configured Moment') < page.indexOf(`track("${name}"`), 'Admission prerequisite must precede example');
}
assert.match(readiness, /ownership.*conflict/);
assert.match(readiness, /reload the page/);
assert.match(readiness, /Calling `init\(\)` again does not clear/);
assert.doesNotMatch(readiness, /After a terminal load failure, call/);
console.log('Standalone recipes passed: custom admission and reload-required conflicts.');
