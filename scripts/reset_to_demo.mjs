import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env.local');
let dbUrl = process.env.DATABASE_URL;

if (!dbUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
  if (match) dbUrl = match[1];
}

if (!dbUrl) {
  console.error("ERRO: DATABASE_URL não configurada no .env.local.");
  process.exit(1);
}

const sql = neon(dbUrl);

async function resetToDemo() {
  console.log("=================================================");
  console.log("🧹 EXECUTANDO LIMPEZA E RESET PARA DEMO (OPÇÃO 3)");
  console.log("=================================================");

  // 1. Limpar tabelas operacionais em ordem de dependência
  console.log("\n1. Apagando relatórios operacionais anteriores...");
  await sql`DELETE FROM tb_evidencia_fotografica;`;
  await sql`DELETE FROM tb_diario_atividade;`;
  await sql`DELETE FROM tb_despesa_rubrica;`;
  await sql`DELETE FROM tb_relatorio_viagem;`;
  console.log("   ✅ Todas as evidências, diários, despesas e relatórios foram limpos.");

  // 2. Garantir Missionário Base
  console.log("\n2. Verificando Missionário padrão...");
  const missionarios = await sql`SELECT id_missionario FROM tb_missionario LIMIT 1;`;
  let idMissionario = null;
  if (missionarios.length > 0) {
    idMissionario = missionarios[0].id_missionario;
    console.log("   ✅ Missionário encontrado:", idMissionario);
  } else {
    const novoMiss = await sql`
      INSERT INTO tb_missionario (
        nm_missionario, nm_credencial_pastoral, t_cargo_tipo, t_email, t_telefone, t_ativo
      ) VALUES (
        'Thomas Fontes', 'Ministério / Atendimento', 'Ancião', 'thomas@fontes.ca', '(11) 96338-6743', true
      ) RETURNING id_missionario;
    `;
    idMissionario = novoMiss[0].id_missionario;
    console.log("   ✅ Missionário padrão criado:", idMissionario);
  }

  // 3. Garantir Polo Base
  console.log("\n3. Verificando Polo padrão...");
  const polos = await sql`SELECT id_polo FROM tb_polo_missionario LIMIT 1;`;
  let idPolo = null;
  if (polos.length > 0) {
    idPolo = polos[0].id_polo;
    console.log("   ✅ Polo encontrado:", idPolo);
  } else {
    const novoPolo = await sql`
      INSERT INTO tb_polo_missionario (
        nm_polo, nm_regional, t_ativo, nr_centros_ativos
      ) VALUES (
        'Sertão Nordestino - Polo Petrolina e Juazeiro', 'Regional Sertão 04', true, 3
      ) RETURNING id_polo;
    `;
    idPolo = novoPolo[0].id_polo;
    console.log("   ✅ Polo padrão criado:", idPolo);
  }

  // 4. Inserir o Relatório Demonstrativo Oficial
  console.log("\n4. Inserindo Relatório Demonstrativo Oficial (RM-2026-7788)...");
  const protocolo = "RM-2026-7788";
  const relatorioRows = await sql`
    INSERT INTO tb_relatorio_viagem (
      nm_documento_protocolo,
      id_missionario,
      id_polo,
      nm_ministerio_vinculado,
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
      ${idMissionario},
      ${idPolo},
      'Missões Nacionais & Evangelismo no Semiárido',
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
    RETURNING id_relatorio;
  `;

  const idRelatorio = relatorioRows[0].id_relatorio;

  // 5. Inserir Rubricas de Despesas
  console.log("   Inserindo 4 rubricas contábeis...");
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

  // 6. Inserir 7 Diários de Atividades
  console.log("   Inserindo 7 diários de atividades e evidências fotográficas...");
  const diarios = [
    {
      data: '2026-09-15',
      deslocamento: true,
      km: 520,
      min: 390,
      resumo: 'Saída da comitiva às 06h00 com destino a Petrolina. Viagem realizada com segurança e proteção de Deus. Chegada às 13h30, recepção pelos presbíteros e reunião de alinhamento com a diretoria do polo local para definir o itinerário semanal nas congregações rurais.'
    },
    {
      data: '2026-09-16',
      deslocamento: true,
      km: 85,
      min: 110,
      resumo: 'Visita pastoral à congregação do distrito de Rajada. Atendimento espiritual a 7 famílias locais e visita aos irmãos enfermos na zona rural. Culto à noite com presença de 68 irmãos e comunhão abençoada.'
    },
    {
      data: '2026-09-17',
      deslocamento: true,
      km: 115,
      min: 140,
      resumo: 'Deslocamento até a margem do Rio São Francisco em direção a Casa Nova e povoados vizinhos. Reunião de capacitação com cooperadores e obreiros locais pela manhã. Visitas comunitárias no período da tarde.'
    },
    {
      data: '2026-09-18',
      deslocamento: true,
      km: 45,
      min: 60,
      resumo: 'Grande culto de celebração da Santa Ceia na congregação central de Petrolina. Participação de aproximadamente 140 membros, momento marcante de renovação espiritual e oração pela expansão missionária.'
    },
    {
      data: '2026-09-19',
      deslocamento: true,
      km: 70,
      min: 90,
      resumo: 'Atendimento ministerial em Juazeiro, visita à congregação do bairro Dom José Rodrigues. Organização dos registros cadastrais e aconselhamento de jovens e famílias.'
    },
    {
      data: '2026-09-20',
      deslocamento: false,
      km: 0,
      min: 0,
      resumo: 'Dia dedicado ao encerramento dos trabalhos pastorais na sede, reunião de prestação de contas com os irmãos responsáveis pelo polo e oração de envio.'
    },
    {
      data: '2026-09-21',
      deslocamento: true,
      km: 530,
      min: 410,
      resumo: 'Retorno da comitiva à cidade sede. Viagem tranquila, sem qualquer intercorrência mecânica ou de saúde. Chegada às 15h00 e conferência de todas as notas fiscais e comprovantes recolhidos em campo.'
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
        ${d.data},
        ${d.deslocamento},
        ${d.km},
        ${d.min},
        ${d.resumo},
        true,
        'Sem intercorrências registradas'
      )
      RETURNING id_diario;
    `;

    const idDiario = diarioRows[0].id_diario;

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

  // 7. Atualizar Indicadores Ministeriais para refletir a demo limpa
  console.log("\n5. Sincronizando Indicadores do Dashboard...");
  await sql`
    UPDATE tb_indicador_ministerial
    SET 
      nr_ceias_celebradas = 12,
      nr_ceias_meta = 12,
      nr_total_batizados = 45,
      nr_batizados_trimestre = 8,
      updated_at = CURRENT_TIMESTAMP;
  `;

  console.log("\n=================================================");
  console.log("🎉 BANCO LIMPO E RESETADO COM SUCESSO!");
  console.log("   - 1 Relatório Oficial Concluído (RM-2026-7788)");
  console.log("   - 7 Diários de Atividades com 3 Evidências Fotográficas");
  console.log("   - 4 Rubricas de Despesas (Total: R$ 3.820,50)");
  console.log("=================================================");
}

resetToDemo().catch(console.error);
