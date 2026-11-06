import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL="?([^"\n]+)"?/);
const sql = neon(match[1]);

async function run() {
  console.log('Missionários:', await sql`SELECT * FROM tb_missionario;`);
  console.log('Polos:', await sql`SELECT * FROM tb_polo_missionario;`);
}
run();
