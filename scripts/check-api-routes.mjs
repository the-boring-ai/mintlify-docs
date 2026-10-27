import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Usage: node scripts/check-api-routes.mjs --dispatcher-root /path/to/app-workers-dispatcher');
assert.equal(args[0], '--dispatcher-root');
const dispatcher = resolve(args[1]);
const routes = JSON.parse(execFileSync(process.execPath, [resolve(dispatcher, 'scripts/customer-api-route-inventory.mjs')], { cwd: dispatcher, encoding: 'utf8' }));
const specification = JSON.parse(await readFile(new URL('../openapi.json', import.meta.url), 'utf8'));
const canonical = path => path.replace(/:[^/]+|\{[^}]+\}/g, '{}');
const registrations = new Set(routes.map(route => `${route.method} ${canonical(route.path)}`));
let operations = 0;
for (const [path, item] of Object.entries(specification.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (!['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) continue;
    operations++;
    assert.ok(registrations.has(`${method.toUpperCase()} ${canonical(path)}`), `Unregistered documented endpoint: ${method.toUpperCase()} ${path}`);
    const parameters = (operation.parameters ?? []).map(parameter => parameter.$ref ? specification.components.parameters[parameter.$ref.split('/').at(-1)] : parameter);
    const placeholders = [...path.matchAll(/\{([^}]+)\}/g)].map(match => match[1]).sort();
    assert.deepEqual(parameters.filter(parameter => parameter.in === 'path').map(parameter => parameter.name).sort(), placeholders, `Path parameter mismatch: ${path}`);
    assert.ok(operation.responses['503'], `Missing unavailable response: ${path}`);
  }
}
console.info(`API route parity passed: ${operations} documented operations match ${routes.length} registered customer operations. Other registrations remain outside the supported public reference.`);
