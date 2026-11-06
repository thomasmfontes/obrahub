import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/utils/saveQueue.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { SaveQueue } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const states = [];
const queue = new SaveQueue(state => states.push(state));
const writes = [];
const write = async value => { writes.push(value); };
queue.update('report', { name: 'A', destination: '' }, write, 60_000);
queue.update('report', { name: 'A', destination: 'B' }, write, 60_000);
assert.equal(states.at(-1), 'pending');
assert.equal(await queue.flush(), true);
assert.deepEqual(writes, [{ name: 'A', destination: 'B' }], 'Debounced updates must preserve all fields and write the latest snapshot once');
assert.equal(states.at(-1), 'saved');
queue.update('report', { name: 'A', destination: 'B' }, write, 60_000);
assert.equal(await queue.flush(), true);
assert.equal(writes.length, 1, 'Blur and navigation must not duplicate a confirmed write');

let release;
let entered;
const started = new Promise(resolve => { entered = resolve; });
const blockingWrite = async value => {
  writes.push(value);
  entered();
  await new Promise(resolve => { release = resolve; });
};
queue.update('report', { name: 'old' }, blockingWrite, 60_000);
const firstFlush = queue.flush();
await started;
assert.equal(states.at(-1), 'saving');
queue.update('report', { name: 'new' }, write, 60_000);
assert.notEqual(states.at(-1), 'saved');
release();
assert.equal(await firstFlush, true);
assert.deepEqual(writes.slice(-2), [{ name: 'old' }, { name: 'new' }], 'Edits made during a request must be written after the old request finishes');
assert.equal(queue.hasPending, false);

let online = false;
let attempts = 0;
const retryWrite = async value => { attempts++; if (!online) throw new Error('Offline'); writes.push(value); };
queue.update('day:2026-09-30', { text: 'Must be preserved' }, retryWrite, 60_000);
assert.equal(await queue.flush(), false, 'Navigation must remain blocked after failure');
assert.equal(queue.hasPending, true);
assert.equal(states.at(-1), 'error');
queue.update('report', { name: 'another confirmed change' }, write, 60_000);
assert.equal(await queue.flush(), false, 'Success on one resource must not hide another failed resource');
assert.equal(states.at(-1), 'error');
online = true;
assert.equal(await queue.flush(), true);
assert.equal(queue.hasPending, false);
assert.equal(states.at(-1), 'saved');
assert.deepEqual(writes.at(-1), { text: 'Must be preserved' });
assert.equal(attempts, 3);
queue.dispose();

const disposedWrites = [];
const disposed = new SaveQueue(() => {});
disposed.update('report', 'stale session', async data => disposedWrites.push(data), 60_000);
disposed.dispose();
await disposed.flush();
assert.deepEqual(disposedWrites, [], 'Leaving a session must cancel its pending timers');

// Real persistence functions with a stub transport: no database writes.
const original = fs.readFileSync(new URL('../src/services/neon.ts', import.meta.url), 'utf8');
function service(connected, query, storage = { setItem() { throw new Error('Storage denied'); } }) {
  const source = original.replace(/const dbUrl =[\s\S]*?;\r?\n/, `const dbUrl = ${JSON.stringify(connected ? 'validation' : '')};\n`);
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, console: { error() {}, warn() {} }, localStorage: storage, require: name => {
    if (name === '@neondatabase/serverless') return { neonConfig: {}, neon: () => ({ query }) };
    if (name === '../utils/reportSharing') return { reportLink: protocol => 'https://example.test/?relatorio=' + encodeURIComponent(protocol) };
  if (name === '../utils/formatters') return { normalizeDateToInput: value => value || '' };
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}
const offline = service(false);
await assert.rejects(offline.saveRelatorioBasico({ nm_documento_protocolo: 'TEST' }), /Conexão/);
await assert.rejects(offline.saveDiarioAtividade({ id_relatorio: 'TEST' }), /Conexão/);
await assert.rejects(offline.saveEvidenciaFoto({ id_diario: 'TEST' }), /Conexão/);
await assert.rejects(offline.saveDespesaRubrica({ id_relatorio: 'TEST' }), /Conexão/);
await assert.rejects(offline.getDiarioPorData('TEST', '2026-09-30'), /Conexão/, 'A read failure must not become a blank day');
const missingConfirmation = service(true, async () => []);
await assert.rejects(missingConfirmation.saveRelatorioBasico({ nm_documento_protocolo: 'TEST' }), /não confirmou/);
await assert.rejects(missingConfirmation.saveDiarioAtividade({ id_relatorio: 'TEST' }), /não confirmou/);
await assert.rejects(missingConfirmation.saveEvidenciaFoto({ id_diario: 'TEST' }), /não confirmou/);
await assert.rejects(missingConfirmation.saveDespesaRubrica({ id_relatorio: 'TEST' }), /não confirmou/);
const confirmed = service(true, async sql => sql.includes('tb_diario_atividade') ? [{ id_diario: 'DAY' }] : [{ id_relatorio: 'REPORT' }]);
assert.equal((await confirmed.saveRelatorioBasico({ nm_documento_protocolo: 'TEST' })).id_relatorio, 'REPORT', 'Unavailable storage must not undo a server confirmation');
assert.equal((await confirmed.saveDiarioAtividade({ id_relatorio: 'TEST' })).id_diario, 'DAY');
console.log('Passed: coalescing, serial writes, in-flight edits, blocked navigation, retry, per-resource errors, duplicate avoidance, timer cleanup and server-only confirmation.');
