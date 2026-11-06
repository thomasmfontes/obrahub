import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL="?([^"\n]+)"?/);
const sql = neon(match[1]);

async function check() {
  const rows = await sql`SELECT id_diario, id_relatorio, t_data_registro, t_deslocamento_ativo, dc_km_percorridos, nr_tempo_minutos_trajeto, t_resumo_atividades FROM tb_diario_atividade ORDER BY created_at DESC LIMIT 5`;
  console.log("Diários recentes no banco:", JSON.stringify(rows, null, 2));
}

check();
