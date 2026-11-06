import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env.local se DATABASE_URL não estiver em process.env
const envPath = path.resolve(__dirname, '../.env.local');
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (match) {
    dbUrl = match[1];
  }
}

if (!dbUrl) {
  console.error("ERRO: DATABASE_URL não configurada. Defina a variável DATABASE_URL no .env.local ou nas variáveis de ambiente.");
  process.exit(1);
}

const sql = neon(dbUrl);

async function setup() {
  console.log('Criando tabela tb_destinatario_notificacao...');
  await sql`
    CREATE TABLE IF NOT EXISTS tb_destinatario_notificacao (
      id_destinatario UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      nm_destinatario VARCHAR(150) NOT NULL,
      t_email VARCHAR(200) NOT NULL,
      t_cargo_departamento VARCHAR(100),
      t_envio_automatico BOOLEAN DEFAULT true,
      t_ativo BOOLEAN DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const count = await sql`SELECT COUNT(*) as total FROM tb_destinatario_notificacao WHERE t_ativo = true`;
  if (parseInt(count[0].total) === 0) {
    await sql`
      INSERT INTO tb_destinatario_notificacao (nm_destinatario, t_email, t_cargo_departamento, t_envio_automatico)
      VALUES 
        ('Ir. Salvador', 'salvador@ministerio.org', 'Conselho Fiscal & Auditoria', true),
        ('Tesouraria Geral', 'tesouraria@ministerio.org', 'Gestão Financeira Central', true),
        ('Secretaria de Missões', 'missoes@ministerio.org', 'Coordenação Ministerial', true);
    `;
    console.log('3 destinatários padrão inseridos com sucesso!');
  } else {
    console.log('Destinatários já existentes:', count[0].total);
  }
}

setup().catch(console.error);
