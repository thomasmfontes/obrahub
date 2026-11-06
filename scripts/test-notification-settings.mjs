import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);

if (!match) {
  console.error("DATABASE_URL não encontrada");
  process.exit(1);
}

const sql = neon(match[1]);

async function run() {
  console.log("=== Validando Configurações de Lembrete e Notificações (UX-15) ===");

  // 1. Verifica tabela no catálogo Neon
  const tableCheck = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'tb_configuracao_lembrete';
  `;
  if (!tableCheck.length) {
    throw new Error("Tabela tb_configuracao_lembrete não encontrada no banco!");
  }
  console.log("✅ Tabela tb_configuracao_lembrete verificada no catálogo Neon.");

  // 2. Insere configuração de teste
  const inserted = await sql`
    INSERT INTO tb_configuracao_lembrete (
      t_lembrete_ativo, hr_lembrete, t_somente_em_viagem, t_notificar_pendencias, t_som_ativo
    ) VALUES (true, '21:30', true, true, true)
    RETURNING *;
  `;
  if (!inserted.length || inserted[0].hr_lembrete.slice(0, 5) !== '21:30') {
    throw new Error("Falha ao inserir configuração de lembrete!");
  }
  console.log(`✅ Configuração inserida com sucesso: Horário ${inserted[0].hr_lembrete.slice(0, 5)}.`);

  // 3. Atualiza configuração
  const updated = await sql`
    UPDATE tb_configuracao_lembrete
    SET hr_lembrete = '22:00', updated_at = CURRENT_TIMESTAMP
    WHERE id_config = ${inserted[0].id_config}
    RETURNING *;
  `;
  if (updated[0].hr_lembrete.slice(0, 5) !== '22:00') {
    throw new Error("Falha ao atualizar horário de lembrete!");
  }
  console.log(`✅ Atualização de horário confirmada: ${updated[0].hr_lembrete.slice(0, 5)}.`);

  // 4. Limpa registro de teste
  await sql`
    DELETE FROM tb_configuracao_lembrete WHERE id_config = ${inserted[0].id_config};
  `;
  console.log("✅ Limpeza do registro de teste concluída com sucesso.");
  console.log("\n🎉 VALIDAÇÃO DE CONFIGURAÇÕES DE LEMBRETE APROVADA COM SUCESSO!");
}

run().catch((e) => {
  console.error("❌ Erro no teste de configurações:", e);
  process.exit(1);
});
