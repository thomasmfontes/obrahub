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
  console.log("=== Validando TASK-DB-03 e TASK-DB-04 no Neon PostgreSQL ===");

  // 1. Validar Índices no Catálogo do PostgreSQL
  const expectedIndexes = [
    { table: 'tb_evidencia_fotografica', name: 'idx_foto_diario' },
    { table: 'tb_relatorio_viagem', name: 'idx_relatorio_created_at' },
    { table: 'tb_relatorio_viagem', name: 'idx_relatorio_status_created' },
    { table: 'tb_agenda_atendimento', name: 'idx_agenda_data_inicio' },
    { table: 'tb_destinatario_notificacao', name: 'idx_destinatario_listagem' },
    { table: 'tb_missionario', name: 'idx_missionario_ativo_nome' },
    { table: 'tb_polo_missionario', name: 'idx_polo_ativo_nome' },
    { table: 'tb_despesa_rubrica', name: 'idx_despesa_relatorio_valor' }
  ];

  for (const idx of expectedIndexes) {
    const res = await sql`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = ${idx.table} 
        AND indexname = ${idx.name};
    `;
    if (!res.length) {
      throw new Error(`Índice ${idx.name} em ${idx.table} não encontrado!`);
    }
    console.log(`✅ Índice ${idx.name} verificado em ${idx.table}.`);
  }

  // 2. Validar remoção do índice redundante idx_diario_relatorio
  const redundantCheck = await sql`
    SELECT indexname 
    FROM pg_indexes 
    WHERE schemaname = 'public' 
      AND tablename = 'tb_diario_atividade' 
      AND indexname = 'idx_diario_relatorio';
  `;
  if (redundantCheck.length > 0) {
    throw new Error("Índice redundante idx_diario_relatorio ainda está presente!");
  }
  console.log("✅ Índice redundante idx_diario_relatorio devidamente removido (coberto por uq_relatorio_data).");

  // 3. Validar Constraints no Catálogo do PostgreSQL
  const expectedConstraints = [
    { table: 'tb_relatorio_viagem', name: 'chk_relatorio_datas', type: 'c' },
    { table: 'tb_relatorio_viagem', name: 'chk_relatorio_valores', type: 'c' },
    { table: 'tb_relatorio_viagem', name: 'chk_relatorio_status', type: 'c' },
    { table: 'tb_despesa_rubrica', name: 'chk_despesa_valor', type: 'c' },
    { table: 'tb_agenda_atendimento', name: 'chk_agenda_datas', type: 'c' },
    { table: 'tb_agenda_atendimento', name: 'chk_agenda_tipo', type: 'c' },
    { table: 'tb_agenda_atendimento', name: 'chk_agenda_status', type: 'c' },
    { table: 'tb_destinatario_notificacao', name: 'uq_destinatario_email', type: 'u' }
  ];

  for (const c of expectedConstraints) {
    const res = await sql`
      SELECT conname, contype 
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public'
        AND conrelid = ${c.table}::regclass
        AND conname = ${c.name}
        AND contype = ${c.type};
    `;
    if (!res.length) {
      throw new Error(`Constraint ${c.name} em ${c.table} (tipo ${c.type}) não encontrada!`);
    }
    console.log(`✅ Constraint ${c.name} [tipo: ${c.type}] verificada em ${c.table}.`);
  }

  // 4. Testes Funcionais de Rejeição de Violação de Constraints
  // 4.1 Teste chk_relatorio_datas (data_retorno < data_saida)
  let rejectedDatas = false;
  try {
    await sql`
      INSERT INTO tb_relatorio_viagem (
        nm_documento_protocolo, t_data_saida, t_data_retorno, t_status
      ) VALUES (
        'RM-TEST-INVALID-DATE', '2026-10-15', '2026-10-10', 'Em Aberto'
      );
    `;
  } catch (err) {
    rejectedDatas = true;
  }
  if (!rejectedDatas) {
    await sql`DELETE FROM tb_relatorio_viagem WHERE nm_documento_protocolo = 'RM-TEST-INVALID-DATE'`;
    throw new Error("chk_relatorio_datas FALHOU em rejeitar data_retorno < data_saida!");
  }
  console.log("✅ chk_relatorio_datas rejeitou com sucesso registro com retorno anterior à saída.");

  // 4.2 Teste chk_despesa_valor (dc_valor_despesa < 0)
  let rejectedValor = false;
  try {
    await sql`
      INSERT INTO tb_despesa_rubrica (
        id_relatorio, nm_rubrica, t_icone_identificador, dc_valor_despesa
      ) VALUES (
        (SELECT id_relatorio FROM tb_relatorio_viagem LIMIT 1), 'Despesa Negativa', 'DollarSign', -50.00
      );
    `;
  } catch (err) {
    rejectedValor = true;
  }
  if (!rejectedValor) {
    throw new Error("chk_despesa_valor FALHOU em rejeitar valor negativo!");
  }
  console.log("✅ chk_despesa_valor rejeitou com sucesso despesa com valor negativo.");

  // 4.3 Teste chk_agenda_tipo (tipo inválido)
  let rejectedTipo = false;
  try {
    await sql`
      INSERT INTO tb_agenda_atendimento (
        nm_titulo, t_tipo, t_status, t_data_inicio, nm_local, nm_responsavel
      ) VALUES (
        'Evento Inválido', 'tipo_inexistente', 'confirmado', '2026-10-01', 'Auditório', 'Pr. Teste'
      );
    `;
  } catch (err) {
    rejectedTipo = true;
  }
  if (!rejectedTipo) {
    throw new Error("chk_agenda_tipo FALHOU em rejeitar tipo inválido!");
  }
  console.log("✅ chk_agenda_tipo rejeitou com sucesso tipo inválido fora do enum permitido.");

  // 4.4 Teste uq_destinatario_email (e-mail duplicado)
  const existingEmailRow = await sql`
    SELECT t_email FROM tb_destinatario_notificacao LIMIT 1;
  `;
  if (existingEmailRow.length > 0) {
    const existingEmail = existingEmailRow[0].t_email;
    let rejectedDuplicate = false;
    try {
      await sql`
        INSERT INTO tb_destinatario_notificacao (
          nm_destinatario, t_email
        ) VALUES (
          'Clone Teste', ${existingEmail}
        );
      `;
    } catch (err) {
      rejectedDuplicate = true;
    }
    if (!rejectedDuplicate) {
      await sql`DELETE FROM tb_destinatario_notificacao WHERE nm_destinatario = 'Clone Teste'`;
      throw new Error("uq_destinatario_email FALHOU em rejeitar e-mail duplicado!");
    }
    console.log(`✅ uq_destinatario_email rejeitou com sucesso duplicata do e-mail ${existingEmail}.`);
  }

  console.log("\n🎉 TODAS AS VALIDAÇÕES DA SPRINT 2 (TASK-DB-03 e TASK-DB-04) PASSARAM COM SUCESSO!");
}

runTests().catch((err) => {
  console.error("❌ FALHA NO TESTE:", err);
  process.exit(1);
});
