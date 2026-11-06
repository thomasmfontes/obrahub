import fs from 'fs';
import { neon } from '@neondatabase/serverless';

const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/DATABASE_URL="?([^"\n]+)"?/);
const sql = neon(match[1]);

async function migrate() {
  console.log("Ajustando constraints para flexibilidade no preenchimento...");
  await sql`ALTER TABLE tb_relatorio_viagem ALTER COLUMN id_missionario DROP NOT NULL;`;
  await sql`ALTER TABLE tb_relatorio_viagem ALTER COLUMN id_polo DROP NOT NULL;`;
  await sql`ALTER TABLE tb_relatorio_viagem ALTER COLUMN t_data_saida DROP NOT NULL;`;
  await sql`ALTER TABLE tb_relatorio_viagem ALTER COLUMN t_data_retorno DROP NOT NULL;`;
  await sql`ALTER TABLE tb_relatorio_viagem ALTER COLUMN t_objetivo_primario DROP NOT NULL;`;
  await sql`ALTER TABLE tb_relatorio_viagem ADD COLUMN IF NOT EXISTS nm_missionario VARCHAR(200);`;
  await sql`ALTER TABLE tb_relatorio_viagem ADD COLUMN IF NOT EXISTS nm_polo_destino VARCHAR(200);`;

  await sql`
    INSERT INTO tb_polo_missionario (id_polo, nm_polo, nm_regional, t_ativo, nr_centros_ativos)
    VALUES ('11111111-1111-1111-1111-111111111111', 'Sertão Nordestino - Polo Petrolina e Juazeiro', 'Regional Sertão 04', true, 3)
    ON CONFLICT (id_polo) DO NOTHING;
  `;

  await sql`
    INSERT INTO tb_indicador_ministerial (
      nr_ano_vigente, nr_ceias_celebradas, nr_ceias_meta, nr_total_batizados, nr_batizados_trimestre, nr_ciclo_atualizacao_dias, t_status_ciclo
    ) VALUES (2026, 12, 12, 45, 8, 60, 'Em dia')
    ON CONFLICT (id_indicador) DO NOTHING;
  `;
  console.log("✅ Ajustes no Neon aplicados com sucesso!");
}

migrate();
