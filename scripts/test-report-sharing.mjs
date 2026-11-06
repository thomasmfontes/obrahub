import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/utils/reportSharing.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { reportLink } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const protocol = 'RM #42 & São Paulo';
const link = reportLink(protocol, 'https://example.test/obrahub/?old=1#section');
assert.equal(new URL(link).searchParams.get('relatorio'), protocol);
assert.equal(new URL(link).pathname, '/obrahub/');
assert.equal(new URL(link).searchParams.has('old'), false);
assert.equal(new URL(link).hash, '');

let rows = [];
const serviceSource = fs.readFileSync(new URL('../src/services/neon.ts', import.meta.url), 'utf8').replace(/const dbUrl =[\s\S]*?;\r?\n/, 'const dbUrl = "validation";\n');
const serviceCode = ts.transpileModule(serviceSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};
vm.runInNewContext(serviceCode, { exports, window: { location: { href: 'https://example.test/obrahub/' } }, localStorage: { removeItem() { throw new Error('Storage denied'); } }, console,
  require: name => name === '@neondatabase/serverless' ? { neonConfig: {}, neon: () => ({ query: async () => rows }) }
    : name === '../utils/reportSharing' ? { reportLink: value => reportLink(value, 'https://example.test/obrahub/') }
    : { normalizeDateToInput: value => value }
});
await assert.rejects(exports.finalizarRelatorio('id', 100, true), /não confirmou/);
rows = [{ id_relatorio: 'id', t_status: 'Em Aberto' }];
await assert.rejects(exports.finalizarRelatorio('id', 100, true), /não confirmou/);
rows = [{ id_relatorio: 'id', t_status: 'Concluído' }];
assert.equal((await exports.finalizarRelatorio('id', 100, true)).t_status, 'Concluído');
const draft = exports.gerarMailtoRelatorio({ destinatarios: ['qa@example.test'], protocolo: protocol, missionario: 'Teste', polo: 'Destino', totalRealizado: 100 });
assert.ok(draft.startsWith('mailto:qa@example.test?'));
const body = new URL(draft).searchParams.get('body');
assert.ok(body.includes(link));
assert.ok(!body.includes('homologado'));
console.log('Passed: encoded deep links, preserved deployment path, draft generation and server-confirmed finalization independent of local storage. No email sent.');
