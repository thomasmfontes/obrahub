import { neon } from '@neondatabase/serverless';
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

async function run() {
  console.log("Conectando ao Neon...");
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log("Tabelas encontradas:", tables.map(t => t.table_name));

  // 1. Criar o relatório de viagem demonstrativo completo
  const protocolo = "RM-2026-7788";
  
  // Limpa se já existir
  const existing = await sql`SELECT id_relatorio FROM tb_relatorio_viagem WHERE nm_documento_protocolo = ${protocolo}`;
  if (existing.length > 0) {
    const id = existing[0].id_relatorio;
    await sql`DELETE FROM tb_evidencia_fotografica WHERE id_diario IN (SELECT id_diario FROM tb_diario_atividade WHERE id_relatorio = ${id})`;
    await sql`DELETE FROM tb_diario_atividade WHERE id_relatorio = ${id}`;
    await sql`DELETE FROM tb_despesa_rubrica WHERE id_relatorio = ${id}`;
    await sql`DELETE FROM tb_relatorio_viagem WHERE id_relatorio = ${id}`;
    console.log("Relatório anterior removido.");
  }

  // Inserir Relatório
  const relatorioRows = await sql`
    INSERT INTO tb_relatorio_viagem (
      nm_documento_protocolo,
      nm_missionario,
      nm_ministerio_vinculado,
      nm_polo_destino,
      t_data_saida,
      t_data_retorno,
      nr_integrantes_comitiva,
      t_objetivo_primario,
      nr_etapa_atual,
      t_status,
      dc_teto_pre_aprovado,
      dc_total_realizado,
      t_concordancia_fiscal
    ) VALUES (
      ${protocolo},
      'Pr. Marcos Vinicius & Pr. Thomas',
      'Missões Nacionais & Evangelismo no Semiárido',
      'Sertão Nordestino — Polo Petrolina & Juazeiro (PE/BA)',
      '2026-09-15',
      '2026-09-22',
      3,
      'Atendimento pastoral às congregações do semiárido, acompanhamento de novos convertidos, celebração da Santa Ceia em três comunidades rurais, instrução a cooperadores locais e entrega de kits de apoio bíblico e assistencial.',
      3,
      'Concluído',
      4500.00,
      3820.50,
      true
    )
    RETURNING *;
  `;

  const relatorio = relatorioRows[0];
  const idRelatorio = relatorio.id_relatorio;
  console.log("Relatório criado:", relatorio.nm_documento_protocolo, "ID:", idRelatorio);

  // 2. Inserir Despesas por Rubrica
  const despesas = [
    {
      nm_rubrica: 'Combustível e Óleo Lubrificante',
      t_icone_identificador: 'fuel',
      dc_valor_despesa: 1480.00,
      nr_comprovantes_anexados: 4
    },
    {
      nm_rubrica: 'Alimentação da Comitiva (3 irmãos)',
      t_icone_identificador: 'utensils',
      dc_valor_despesa: 1150.50,
      nr_comprovantes_anexados: 6
    },
    {
      nm_rubrica: 'Hospedagem & Pousada em Trânsito',
      t_icone_identificador: 'bed',
      dc_valor_despesa: 890.00,
      nr_comprovantes_anexados: 2
    },
    {
      nm_rubrica: 'Pedágios e Deslocamento Rodoviário',
      t_icone_identificador: 'file',
      dc_valor_despesa: 300.00,
      nr_comprovantes_anexados: 5
    }
  ];

  for (const desp of despesas) {
    await sql`
      INSERT INTO tb_despesa_rubrica (
        id_relatorio,
        nm_rubrica,
        t_icone_identificador,
        dc_valor_despesa,
        nr_comprovantes_anexados
      ) VALUES (
        ${idRelatorio},
        ${desp.nm_rubrica},
        ${desp.t_icone_identificador},
        ${desp.dc_valor_despesa},
        ${desp.nr_comprovantes_anexados}
      );
    `;
  }
  console.log("4 rubricas de despesas inseridas.");

  // 3. Inserir Diários de Bordo
  const diarios = [
    {
      t_data_registro: '2026-09-15',
      t_deslocamento_ativo: true,
      dc_km_percorridos: 520,
      nr_tempo_minutos_trajeto: 390,
      t_resumo_atividades: 'Saída da comitiva às 06h00 com destino a Petrolina. Viagem realizada com segurança e proteção de Deus. Chegada às 13h30, recepção pelos presbíteros e reunião de alinhamento com a diretoria do polo local para definir o itinerário semanal nas congregações rurais.'
    },
    {
      t_data_registro: '2026-09-16',
      t_deslocamento_ativo: true,
      dc_km_percorridos: 85,
      nr_tempo_minutos_trajeto: 110,
      t_resumo_atividades: 'Visita pastoral à congregação do distrito de Rajada. Atendimento espiritual a 7 famílias locais e visita aos irmãos enfermos na zona rural. Culto à noite com presença de 68 irmãos e comunhão abençoada.'
    },
    {
      t_data_registro: '2026-09-17',
      t_deslocamento_ativo: true,
      dc_km_percorridos: 115,
      nr_tempo_minutos_trajeto: 140,
      t_resumo_atividades: 'Deslocamento até a margem do Rio São Francisco em direção a Casa Nova e povoados vizinhos. Reunião de capacitação com cooperadores e obreiros locais pela manhã. Visitas comunitárias no período da tarde.'
    },
    {
      t_data_registro: '2026-09-18',
      t_deslocamento_ativo: true,
      dc_km_percorridos: 45,
      nr_tempo_minutos_trajeto: 60,
      t_resumo_atividades: 'Grande culto de celebração da Santa Ceia na congregação central de Petrolina. Participação de aproximadamente 140 membros, momento marcante de renovação espiritual e oração pela expansão missionária.'
    },
    {
      t_data_registro: '2026-09-19',
      t_deslocamento_ativo: true,
      dc_km_percorridos: 70,
      nr_tempo_minutos_trajeto: 90,
      t_resumo_atividades: 'Atendimento ministerial em Juazeiro, visita à congregação do bairro Dom José Rodrigues. Organização dos registros cadastrais e aconselhamento de jovens e famílias.'
    },
    {
      t_data_registro: '2026-09-20',
      t_deslocamento_ativo: false,
      dc_km_percorridos: 0,
      nr_tempo_minutos_trajeto: 0,
      t_resumo_atividades: 'Dia dedicado ao encerramento dos trabalhos pastorais na sede, reunião de prestação de contas com os irmãos responsáveis pelo polo e oração de envio.'
    },
    {
      t_data_registro: '2026-09-21',
      t_deslocamento_ativo: true,
      dc_km_percorridos: 530,
      nr_tempo_minutos_trajeto: 410,
      t_resumo_atividades: 'Retorno da comitiva à cidade sede. Viagem tranquila, sem qualquer intercorrência mecânica ou de saúde. Chegada às 15h00 e conferência de todas as notas fiscais e comprovantes recolhidos em campo.'
    }
  ];

  for (let i = 0; i < diarios.length; i++) {
    const d = diarios[i];
    const diarioRows = await sql`
      INSERT INTO tb_diario_atividade (
        id_relatorio,
        t_data_registro,
        t_deslocamento_ativo,
        dc_km_percorridos,
        nr_tempo_minutos_trajeto,
        t_resumo_atividades,
        t_salvo_status,
        t_intercorrencias
      ) VALUES (
        ${idRelatorio},
        ${d.t_data_registro},
        ${d.t_deslocamento_ativo},
        ${d.dc_km_percorridos},
        ${d.nr_tempo_minutos_trajeto},
        ${d.t_resumo_atividades},
        true,
        'Sem intercorrências registradas'
      )
      RETURNING *;
    `;

    const idDiario = diarioRows[0].id_diario;

    // Inserir fotos de evidência nos dias 1, 2 e 4
    if (i === 1) {
      await sql`
        INSERT INTO tb_evidencia_fotografica (
          id_diario, t_titulo_legenda, t_storage_path, t_download_url, nr_ordem
        ) VALUES (
          ${idDiario},
          'Visita e oração na congregação rural de Rajada',
          'fotos/rajada.jpg',
          'https://images.unsplash.com/photo-1548625361-195feee13f8c?w=600&auto=format&fit=crop&q=80',
          1
        );
      `;
    } else if (i === 3) {
      await sql`
        INSERT INTO tb_evidencia_fotografica (
          id_diario, t_titulo_legenda, t_storage_path, t_download_url, nr_ordem
        ) VALUES (
          ${idDiario},
          'Culto de celebração e comunhão dos irmãos',
          'fotos/culto.jpg',
          'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?w=600&auto=format&fit=crop&q=80',
          1
        );
      `;
      await sql`
        INSERT INTO tb_evidencia_fotografica (
          id_diario, t_titulo_legenda, t_storage_path, t_download_url, nr_ordem
        ) VALUES (
          ${idDiario},
          'Irmãos reunidos na sede de Petrolina',
          'fotos/comunidade.jpg',
          'https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=600&auto=format&fit=crop&q=80',
          2
        );
      `;
    }
  }

  console.log("7 diários e fotos de evidência inseridos com sucesso!");
  console.log("SUCESSO: Relatório", protocolo, "inserido com dados completos!");
}

run().catch(console.error);
