import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
const sql = neon(match[1]);

async function seed() {
  // Check if missionario exists
  let missionarios = await sql`SELECT * FROM tb_missionario LIMIT 1;`;
  if (missionarios.length === 0) {
    const [mis] = await sql`
      INSERT INTO tb_missionario (id_firebase_uid, nm_missionario, nm_credencial_pastoral, t_cargo_tipo, t_foto_avatar_url, t_email)
      VALUES ('usr_samuel_alb', 'Pr. Samuel Albuquerque', 'Credencial Pastoral #2841', 'Titular', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', 'samuel.albuquerque@obrahub.org')
      RETURNING id_missionario;
    `;
    console.log("Missionário criado:", mis);

    const [polo] = await sql`
      INSERT INTO tb_polo_missionario (nm_polo, nm_regional, t_ativo, nr_centros_ativos, t_descricao)
      VALUES ('Sertão Nordestino - Polo Petrolina e Juazeiro', 'Regional Sertão 04', true, 3, 'Polos ribeirinhos e congregações ativas')
      RETURNING id_polo;
    `;
    console.log("Polo criado:", polo);

    const [rel] = await sql`
      INSERT INTO tb_relatorio_viagem (
        id_missionario, id_polo, nm_documento_protocolo, nm_ministerio_vinculado,
        t_data_saida, t_data_retorno, nr_dias_campo, nr_integrantes_comitiva,
        t_objetivo_primario, t_status, nr_etapa_atual,
        dc_teto_pre_aprovado, dc_total_realizado, dc_saldo_restante, t_concordancia_fiscal
      )
      VALUES (
        ${mis.id_missionario}, ${polo.id_polo}, 'RM-2026-88', 'Missões Nacionais & Plantação de Igrejas',
        '2026-10-04', '2026-10-12', 8, 4,
        'Capacitação pastoral de obreiros locais ribeirinhos e alinhamento orçamentário', 'Em Aberto', 2,
        5200.00, 4850.00, 350.00, true
      )
      RETURNING id_relatorio;
    `;
    console.log("Relatório criado:", rel);

    // Diário
    const [diario] = await sql`
      INSERT INTO tb_diario_atividade (
        id_relatorio, t_data_registro, t_deslocamento_ativo, dc_km_percorridos, nr_tempo_minutos_trajeto,
        t_resumo_atividades, t_salvo_status, t_intercorrencias
      )
      VALUES (
        ${rel.id_relatorio}, '2026-10-05', true, 280.00, 255,
        'Alinhamento pastoral com líderes ribeirinhos pela manhã e visita pastoral a 4 famílias locais. Culto noturno com 85 presentes e 3 reconciliações.',
        true, 'Sem intercorrências no trajeto (Tudo em conformidade)'
      )
      RETURNING id_diario;
    `;
    console.log("Diário criado:", diario);

    // Fotos
    await sql`
      INSERT INTO tb_evidencia_fotografica (id_diario, t_titulo_legenda, t_storage_path, t_download_url, nr_ordem)
      VALUES 
      (${diario.id_diario}, 'Polo Avelar', 'relatorios/RM-2026-88/fotos/avelar.jpg', 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=400&q=80', 1),
      (${diario.id_diario}, 'Visita Familiar', 'relatorios/RM-2026-88/fotos/familia.jpg', 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=400&q=80', 2),
      (${diario.id_diario}, 'Culto Noturno', 'relatorios/RM-2026-88/fotos/culto.jpg', 'https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=400&q=80', 3);
    `;

    // Despesas
    await sql`
      INSERT INTO tb_despesa_rubrica (id_relatorio, nm_rubrica, t_icone_identificador, dc_valor_despesa, nr_comprovantes_anexados)
      VALUES
      (${rel.id_relatorio}, 'Combustível & Pedágios', 'fuel', 1800.00, 4),
      (${rel.id_relatorio}, 'Alimentação da Equipe', 'utensils', 1450.00, 6),
      (${rel.id_relatorio}, 'Hospedagem & Pousadas', 'bed', 1200.00, 2),
      (${rel.id_relatorio}, 'Insumos Litúrgicos', 'church', 400.00, 2);
    `;

    // Indicadores
    await sql`
      INSERT INTO tb_indicador_ministerial (
        id_missionario, nr_ano_vigente, nr_ceias_celebradas, nr_ceias_meta,
        nr_total_batizados, nr_batizados_trimestre, t_ultimo_batismo_data, nm_ultimo_batismo_polo,
        nr_ciclo_atualizacao_dias, t_status_ciclo
      )
      VALUES (
        ${mis.id_missionario}, 2026, 12, 12,
        45, 8, '2026-08-15', 'Polo Central',
        60, 'Em dia'
      );
    `;
    console.log(" Seed executado com sucesso no Neon!");
  } else {
    console.log("Banco de dados já contém registros.");
  }
}

seed();
