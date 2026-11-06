import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (match) dbUrl = match[1];
}

if (!dbUrl) {
  console.error("ERRO: DATABASE_URL não encontrada no .env.local.");
  process.exit(1);
}

const sql = neon(dbUrl);

async function verifyFullStack() {
  console.log("=================================================");
  console.log("🔍 DIAGNÓSTICO INTEGRADO DO SISTEMA (OBRAHUB)");
  console.log("=================================================");

  // 1. Tabelas
  const expectedTables = [
    'tb_relatorio_viagem',
    'tb_diario_atividade',
    'tb_despesa_rubrica',
    'tb_evidencia_fotografica',
    'tb_missionario',
    'tb_polo_missionario',
    'tb_agenda_atendimento',
    'tb_destinatario_notificacao',
    'tb_indicador_ministerial'
  ];

  console.log("\n1. Verificando Tabelas no PostgreSQL Neon:");
  const tableRows = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `;
  const existingTables = new Set(tableRows.map(r => r.table_name));

  for (const table of expectedTables) {
    if (existingTables.has(table)) {
      const res = await sql.query(`SELECT count(*)::int as count FROM ${table};`);
      const count = res.rows ? res.rows[0].count : (res[0] ? res[0].count : 0);
      console.log(`  ✅ [OK] ${table.padEnd(30)} -> ${count} registro(s)`);
    } else {
      console.log(`  ❌ [FALTANDO] ${table}`);
    }
  }

  // 2. Protocolo automático
  console.log("\n2. Verificando Geração Atômica de Protocolo:");
  try {
    const protoRes = await sql`SELECT fn_proximo_protocolo_relatorio() as protocolo;`;
    console.log(`  ✅ Próximo protocolo reservável: ${protoRes[0].protocolo}`);
  } catch (err) {
    console.log(`  ⚠️ Erro na função de protocolo:`, err.message);
  }

  // 3. Indicadores de Dashboard
  console.log("\n3. Verificando Indicadores do Dashboard:");
  const indicadores = await sql`SELECT * FROM tb_indicador_ministerial ORDER BY nr_ano_vigente DESC LIMIT 1;`;
  if (indicadores.length > 0) {
    const ind = indicadores[0];
    console.log(`  ✅ Indicadores disponíveis (Ano ${ind.nr_ano_vigente}):`);
    console.log(`     - Ceias celebradas: ${ind.nr_ceias_celebradas} / ${ind.nr_ceias_meta}`);
    console.log(`     - Batizados total: ${ind.nr_total_batizados} (Trimestre: ${ind.nr_batizados_trimestre})`);
    console.log(`     - Status do ciclo: ${ind.t_status_ciclo}`);
  } else {
    console.log(`  ⚠️ Nenhum registro em tb_indicador_ministerial.`);
  }

  // 4. Verificação de Integridade dos Relatórios
  console.log("\n4. Verificando Integridade Contábil dos Relatórios:");
  const relatorios = await sql`
    SELECT 
      r.id_relatorio,
      r.nm_documento_protocolo,
      p.nm_polo,
      r.t_data_saida,
      r.t_data_retorno,
      r.t_status,
      r.dc_total_realizado,
      COALESCE((SELECT SUM(dc_valor_despesa) FROM tb_despesa_rubrica WHERE id_relatorio = r.id_relatorio), 0) AS total_calculado_despesas,
      (SELECT COUNT(*) FROM tb_diario_atividade WHERE id_relatorio = r.id_relatorio) AS total_dias_diario,
      (SELECT COUNT(*) FROM tb_evidencia_fotografica f JOIN tb_diario_atividade a ON a.id_diario = f.id_diario WHERE a.id_relatorio = r.id_relatorio) AS total_fotos
    FROM tb_relatorio_viagem r
    LEFT JOIN tb_polo_missionario p ON p.id_polo = r.id_polo
    ORDER BY r.created_at DESC
    LIMIT 5;
  `;

  if (relatorios.length === 0) {
    console.log("  ℹ️ Nenhum relatório cadastrado ainda.");
  } else {
    console.log(`  Encontrados ${relatorios.length} relatório(s) recente(s):`);
    for (const r of relatorios) {
      const match = Math.abs(Number(r.dc_total_realizado) - Number(r.total_calculado_despesas)) < 0.01;
      console.log(`  - [${r.nm_documento_protocolo}] ${r.nm_polo || 'Polo não vinculado'} (${r.t_status})`);
      console.log(`    Período: ${r.t_data_saida} até ${r.t_data_retorno}`);
      console.log(`    Total: R$ ${r.dc_total_realizado} (Soma rubricas: R$ ${r.total_calculado_despesas}) -> ${match ? '✅ Consistente' : '❌ Divergente'}`);
      console.log(`    Diários de Atividade: ${r.total_dias_diario} dia(s), Fotos: ${r.total_fotos}`);
    }
  }

  console.log("\n=================================================");
  console.log("✨ DIAGNÓSTICO CONCLUÍDO COM SUCESSO!");
  console.log("=================================================");
}

verifyFullStack().catch(console.error);
