import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL="?([^"\n]+)"?/);
if (!match) {
  console.error("DATABASE_URL não encontrada no .env.local");
  process.exit(1);
}

const sql = neon(match[1]);

async function run() {
  console.log("Aplicando migração: t_data_despesa e tb_dispositivo_push...");
  
  await sql`
    ALTER TABLE tb_despesa_rubrica 
    ADD COLUMN IF NOT EXISTS t_data_despesa DATE;
  `;
  console.log("✅ Coluna t_data_despesa adicionada com sucesso.");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_despesa_relatorio_data 
    ON tb_despesa_rubrica (id_relatorio, t_data_despesa);
  `;
  console.log("✅ Índice idx_despesa_relatorio_data criado.");

  await sql`
    CREATE TABLE IF NOT EXISTS tb_dispositivo_push (
        id_dispositivo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        id_missionario UUID REFERENCES tb_missionario(id_missionario) ON DELETE SET NULL,
        t_fcm_token TEXT NOT NULL UNIQUE,
        t_plataforma VARCHAR(50) DEFAULT 'web',
        t_ativo BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✅ Tabela tb_dispositivo_push criada com sucesso.");

  await sql`
    CREATE INDEX IF NOT EXISTS idx_push_ativo 
    ON tb_dispositivo_push (t_ativo);
  `;
  console.log("✅ Índice idx_push_ativo criado.");

  console.log("🎉 Migração concluída com 100% de sucesso!");
}

run().catch((err) => {
  console.error("❌ Erro ao aplicar migração:", err);
  process.exit(1);
});
