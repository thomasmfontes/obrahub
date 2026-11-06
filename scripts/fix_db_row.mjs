import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL="?([^"\n]+)"?/);
const sql = neon(match[1]);

async function fix() {
  await sql`
    UPDATE tb_diario_atividade 
    SET dc_km_percorridos = 200.00,
        nr_tempo_minutos_trajeto = 240,
        t_deslocamento_ativo = true
    WHERE t_data_registro = '2026-11-05'
  `;
  const rows = await sql`
    SELECT id_diario, t_data_registro, t_deslocamento_ativo, dc_km_percorridos, nr_tempo_minutos_trajeto 
    FROM tb_diario_atividade 
    WHERE t_data_registro = '2026-11-05'
  `;
  console.log("Diário atualizado no banco:", rows);
}

fix();
