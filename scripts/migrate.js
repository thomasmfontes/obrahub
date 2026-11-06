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
  if (match) {
    databaseUrl = match[1];
  }
}

if (!databaseUrl) {
  console.error("ERRO: DATABASE_URL não encontrada em .env.local");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function runMigration() {
  console.log("Aplicando migração no Neon PostgreSQL...");
  const sqlFile = path.resolve(__dirname, '../sql/001_initial_schema.sql');
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');

  try {
    // Separa comandos individuais por ponto e vírgula
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      await sql.query(statement);
    }

    console.log("✅ Migração aplicada com sucesso no Neon!");

    // Verificação das tabelas criadas
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    console.log("Tabelas no banco de dados Neon:");
    console.table(tables);
  } catch (error) {
    console.error("Falha ao executar migração:", error);
    process.exit(1);
  }
}

runMigration();
