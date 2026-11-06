import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env.local
const envPath = path.resolve(__dirname, '../.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (match) databaseUrl = match[1];
}

if (!databaseUrl) {
  console.error("ERRO: DATABASE_URL não encontrada.");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function runTests() {
  console.log("=== Validando TASK-DB-01 e TASK-DB-02 no Neon PostgreSQL ===");

  // 1. Validar Sequence seq_relatorio_protocolo_2026
  const seqCheck = await sql`
    SELECT sequence_name FROM information_schema.sequences WHERE sequence_name = 'seq_relatorio_protocolo_2026';
  `;
  if (!seqCheck.length) {
    throw new Error("Sequence seq_relatorio_protocolo_2026 não encontrada no banco!");
  }
  console.log("✅ Sequence seq_relatorio_protocolo_2026 verificada com sucesso.");

  // 2. Validar Função fn_proximo_protocolo_relatorio
  const protoTest = await sql`
    SELECT fn_proximo_protocolo_relatorio(2026) AS protocolo;
  `;
  const protocoloGerado = protoTest[0]?.protocolo;
  if (!protocoloGerado || !protocoloGerado.startsWith("RM-2026-")) {
    throw new Error(`Protocolo inválido gerado: ${protocoloGerado}`);
  }
  console.log(`✅ Função atômica fn_proximo_protocolo_relatorio funcionando. Gerou: ${protocoloGerado}`);

  // 3. Validar Trigger trg_sync_despesas_total
  const triggerCheck = await sql`
    SELECT trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_name = 'trg_sync_despesas_total' 
      AND event_object_table = 'tb_despesa_rubrica';
  `;
  if (!triggerCheck.length) {
    throw new Error("Trigger trg_sync_despesas_total não encontrado em tb_despesa_rubrica!");
  }
  console.log("✅ Trigger trg_sync_despesas_total verificado no catálogo PostgreSQL.");

  // 4. Teste funcional do trigger: INSERT, UPDATE, DELETE de despesa
  // Cria relatório temporário para teste
  const tempProtocolo = `RM-2026-TEST-${Date.now()}`;
  const insertedRel = await sql`
    INSERT INTO tb_relatorio_viagem (
      nm_documento_protocolo, nm_missionario, nm_polo_destino,
      t_data_saida, t_data_retorno, dc_teto_pre_aprovado, dc_total_realizado
    ) VALUES (
      ${tempProtocolo}, 'Missionário Teste QA', 'Polo Teste',
      '2026-09-01', '2026-09-05', 5000.00, 0.00
    ) RETURNING id_relatorio;
  `;
  const relId = insertedRel[0].id_relatorio;

  try {
    // 4.1 Inserir primeira despesa de 150.00
    const d1 = await sql`
      INSERT INTO tb_despesa_rubrica (id_relatorio, nm_rubrica, t_icone_identificador, dc_valor_despesa)
      VALUES (${relId}, 'Combustível Teste', 'fuel', 150.00)
      RETURNING id_despesa;
    `;
    const d1Id = d1[0].id_despesa;

    // Verificar se dc_total_realizado subiu para 150.00 automaticamente
    let check = await sql`SELECT dc_total_realizado FROM tb_relatorio_viagem WHERE id_relatorio = ${relId};`;
    if (Number(check[0].dc_total_realizado) !== 150.00) {
      throw new Error(`Trigger falhou no INSERT 1: esperado 150.00, obtido ${check[0].dc_total_realizado}`);
    }
    console.log("✅ Trigger: INSERT refletiu dc_total_realizado = 150.00 com sucesso.");

    // 4.2 Inserir segunda despesa de 75.50
    const d2 = await sql`
      INSERT INTO tb_despesa_rubrica (id_relatorio, nm_rubrica, t_icone_identificador, dc_valor_despesa)
      VALUES (${relId}, 'Alimentação Teste', 'utensils', 75.50)
      RETURNING id_despesa;
    `;
    const d2Id = d2[0].id_despesa;

    check = await sql`SELECT dc_total_realizado FROM tb_relatorio_viagem WHERE id_relatorio = ${relId};`;
    if (Number(check[0].dc_total_realizado) !== 225.50) {
      throw new Error(`Trigger falhou no INSERT 2: esperado 225.50, obtido ${check[0].dc_total_realizado}`);
    }
    console.log("✅ Trigger: Segundo INSERT acumulou dc_total_realizado = 225.50 com sucesso.");

    // 4.3 Atualizar despesa d1 de 150.00 para 200.00 (total deve ir para 275.50)
    await sql`
      UPDATE tb_despesa_rubrica SET dc_valor_despesa = 200.00 WHERE id_despesa = ${d1Id};
    `;
    check = await sql`SELECT dc_total_realizado FROM tb_relatorio_viagem WHERE id_relatorio = ${relId};`;
    if (Number(check[0].dc_total_realizado) !== 275.50) {
      throw new Error(`Trigger falhou no UPDATE: esperado 275.50, obtido ${check[0].dc_total_realizado}`);
    }
    console.log("✅ Trigger: UPDATE refletiu novo total dc_total_realizado = 275.50 com sucesso.");

    // 4.4 Excluir despesa d2 (total deve voltar para 200.00)
    await sql`
      DELETE FROM tb_despesa_rubrica WHERE id_despesa = ${d2Id};
    `;
    check = await sql`SELECT dc_total_realizado FROM tb_relatorio_viagem WHERE id_relatorio = ${relId};`;
    if (Number(check[0].dc_total_realizado) !== 200.00) {
      throw new Error(`Trigger falhou no DELETE: esperado 200.00, obtido ${check[0].dc_total_realizado}`);
    }
    console.log("✅ Trigger: DELETE refletiu novo total dc_total_realizado = 200.00 com sucesso.");

  } finally {
    // Limpeza do relatório de teste (despesas associadas sofrem ON DELETE CASCADE)
    await sql`DELETE FROM tb_relatorio_viagem WHERE id_relatorio = ${relId};`;
    console.log("✅ Registro temporário de teste limpo com sucesso.");
  }

  // 5. Verificar consistência em todos os relatórios reais
  const discrepancies = await sql`
    SELECT r.id_relatorio, r.nm_documento_protocolo, r.dc_total_realizado, COALESCE(SUM(d.dc_valor_despesa), 0.00) AS total_calculado
    FROM tb_relatorio_viagem r
    LEFT JOIN tb_despesa_rubrica d ON d.id_relatorio = r.id_relatorio
    GROUP BY r.id_relatorio, r.nm_documento_protocolo, r.dc_total_realizado
    HAVING r.dc_total_realizado != COALESCE(SUM(d.dc_valor_despesa), 0.00);
  `;
  if (discrepancies.length > 0) {
    throw new Error(`Foram encontradas ${discrepancies.length} divergências no banco de produção!`);
  }
  console.log("✅ Consistência contábil total: 100% dos relatórios em produção coincidem exatamente com o somatório de despesas!");
  console.log("\n🎉 TODAS AS VALIDAÇÕES DE BANCO & BACKEND PASSARAM COM SUCESSO!");
}

runTests().catch(err => {
  console.error("Falha no teste:", err);
  process.exit(1);
});
