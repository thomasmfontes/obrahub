import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL="?([^"\n]+)"?/);
const sql = neon(match[1]);

async function checkAndFix() {
  const rows = await sql`
    SELECT id_diario, id_relatorio, t_data_registro, t_deslocamento_ativo, dc_km_percorridos, nr_tempo_minutos_trajeto 
    FROM tb_diario_atividade 
    WHERE t_data_registro = '2026-11-05'
  `;
  console.log("Diários do dia 05/11:", rows);

  // If dc_km_percorridos is 20000, fix to 200
  for (const r of rows) {
    if (Number(r.dc_km_percorridos) >= 10000) {
      await sql`UPDATE tb_diario_atividade SET dc_km_percorridos = 200.00 WHERE id_diario = ${r.id_diario}`;
      console.log(`Corrigido id_diario ${r.id_diario} de ${r.dc_km_percorridos} para 200.00`);
    }
  }
}

checkAndFix();
