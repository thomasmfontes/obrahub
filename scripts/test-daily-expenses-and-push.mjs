import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

let rows = [{ id_despesa: 'E_NEW', dc_valor_despesa: 85, t_data_despesa: '2026-11-05' }];
let calls = [];

const source = fs.readFileSync('src/services/neon.ts', 'utf8').replace(/const dbUrl =[\s\S]*?;\r?\n/, 'const dbUrl = "validation";\n');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const exports = {};

vm.runInNewContext(code, {
  exports,
  console: { error() {}, warn() {} },
  require: name => {
    if (name === '@neondatabase/serverless') {
      return {
        neonConfig: {},
        neon: () => ({
          query: async (sql, params) => {
            calls.push({ sql, params });
            return rows;
          }
        })
      };
    }
    if (name === '../utils/reportSharing') return {};
    if (name === '../utils/formatters') return { normalizeDateToInput: value => value || '' };
    throw new Error(name);
  }
});

// 1. Testa inserção de nova despesa com data específica
const novaDespesa = {
  id_relatorio: 'R_TEST',
  nm_rubrica: 'Almoço em trânsito',
  t_icone_identificador: 'utensils',
  dc_valor_despesa: 85,
  t_data_despesa: '2026-11-05'
};

const resultInsert = await exports.saveDespesaRubrica(novaDespesa);
assert.equal(resultInsert.id_despesa, 'E_NEW');
assert.ok(calls[0].sql.includes('INSERT INTO tb_despesa_rubrica'));
assert.ok(calls[0].sql.includes('t_data_despesa'));
assert.equal(calls[0].params[6], '2026-11-05');

// 2. Testa atualização de despesa mantendo ou alterando a data
rows = [{ id_despesa: 'E_EXISTING', dc_valor_despesa: 90, t_data_despesa: '2026-11-06' }];
calls = [];

const despesaAtualizada = {
  id_despesa: 'E_EXISTING',
  id_relatorio: 'R_TEST',
  nm_rubrica: 'Almoço ajustado',
  t_icone_identificador: 'utensils',
  dc_valor_despesa: 90,
  t_data_despesa: '2026-11-06'
};

const resultUpdate = await exports.saveDespesaRubrica(despesaAtualizada);
assert.equal(resultUpdate.id_despesa, 'E_EXISTING');
assert.ok(calls[0].sql.includes('UPDATE tb_despesa_rubrica'));
assert.ok(calls[0].sql.includes('t_data_despesa = $8'));
assert.ok(calls[0].sql.includes('WHERE id_despesa = $6 AND id_relatorio = $7'));
assert.equal(calls[0].params[5], 'E_EXISTING');
assert.equal(calls[0].params[6], 'R_TEST');
assert.equal(calls[0].params[7], '2026-11-06');

// 3. Testa registro de token FCM
calls = [];
await exports.registerPushDeviceToken('fcm_token_sample_123', 'M_123');
assert.ok(calls[0].sql.includes('INSERT INTO tb_dispositivo_push'));
assert.equal(calls[0].params[0], 'fcm_token_sample_123');
assert.equal(calls[0].params[1], 'M_123');

console.log('Passed: daily expense linking, date-scoped persistence, update with date and push device token registration.');
