import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL="?([^"\n]+)"?/);
const sql = neon(match[1]);

async function check() {
  const relCols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'tb_relatorio_viagem'
  `;
  const diarioCols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'tb_diario_atividade'
  `;
  const fotoCols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'tb_evidencia_fotografica'
  `;
  const despesaCols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns 
    WHERE table_name = 'tb_despesa_rubrica'
  `;
  console.log("tb_relatorio_viagem:", relCols);
  console.log("tb_diario_atividade:", diarioCols);
  console.log("tb_evidencia_fotografica:", fotoCols);
  console.log("tb_despesa_rubrica:", despesaCols);
}
check();
