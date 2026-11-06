import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/utils/loadResource.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { loadResource } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const cache = new Map();
globalThis.localStorage = { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) };
const fail = async () => { throw new Error('Simulated connection failure'); };
let displayed;
let applications = 0;
const apply = data => { displayed = data; applications++; };
const load = (query, previous = false) => loadResource('test', query, previous, apply, Array.isArray);

assert.equal(await load(fail), 'error');
assert.equal(applications, 0, 'An initial failure must not become an empty list');
assert.equal(await load(async () => []), 'ready');
assert.deepEqual(displayed, [], 'A successful empty result is a genuine empty state');
assert.equal(await load(fail), 'cached');
assert.deepEqual(displayed, [], 'Empty confirmed results can be cached');
const records = [{ id: 'sample' }];
assert.equal(await load(async () => records), 'ready');
assert.equal(await load(fail), 'cached');
assert.deepEqual(displayed, records);
const before = applications;
assert.equal(await load(fail, true), 'stale');
assert.equal(applications, before, 'Failed refresh must not overwrite displayed data');
assert.equal(await load(async () => [], true), 'ready', 'Retry must recover, including a now-empty result');
assert.deepEqual(displayed, []);
cache.set('obrahub_read_v1_test', '{invalid');
assert.equal(await load(fail), 'error');
cache.set('obrahub_read_v1_test', JSON.stringify({ data: 'not an array' }));
assert.equal(await load(fail), 'error');
globalThis.localStorage = { getItem() { throw new Error('Storage denied'); }, setItem() { throw new Error('Storage denied'); } };
assert.equal(await load(async () => records), 'ready', 'Storage failure must not turn a successful query into a loading failure');
assert.equal(await load(fail), 'error');

// Exercise the actual readers with an unavailable client, without real database access.
let service = fs.readFileSync(new URL('../src/services/neon.ts', import.meta.url), 'utf8');
service = service.replace(/const dbUrl =[\s\S]*?;\r?\n/, 'const dbUrl = "";\n');
const serviceCode = ts.transpileModule(service, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(serviceCode, { exports, console, localStorage: globalThis.localStorage, require: name => {
  if (name === '@neondatabase/serverless') return { neonConfig: {}, neon() { throw new Error('Unexpected connection'); } };
  if (name === '../utils/reportSharing') return { reportLink: protocol => 'https://example.test/?relatorio=' + encodeURIComponent(protocol) };
  if (name === '../utils/formatters') return {};
  throw new Error(`Unexpected import: ${name}`);
} });
for (const name of ['getIndicadoresDashboard', 'getUltimoRelatorioAtivo', 'getAllRelatorios', 'getMissionarios', 'getPolos', 'getAgendaItems', 'getDestinatariosNotificacao']) {
  await assert.rejects(exports[name](), /Conexão com o banco indisponível/);
}
console.log('Passed: loading failure, confirmed empty list, cache, preserved data, retry, corrupt/unavailable storage and seven strict readers.');
