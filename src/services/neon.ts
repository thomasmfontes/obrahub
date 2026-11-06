import { neon, neonConfig, type NeonQueryFunction } from '@neondatabase/serverless';
import type { 
  RelatorioViagem, 
  DiarioAtividade, 
  DespesaRubrica, 
  EvidenciaFotografica, 
  IndicadorMinisterial,
  Missionario,
  PoloMissionario,
  AgendaItem,
  DestinatarioNotificacao,
  ConfiguracaoLembrete
} from '../types';
import { reportLink } from '../utils/reportSharing';
import { normalizeDateToInput } from '../utils/formatters';

// Desabilita o aviso do console sobre execução SQL no navegador
neonConfig.disableWarningInBrowsers = true;

// Obtém a URL do banco (suporta Vite import.meta.env e Node process.env)
const dbUrl = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DATABASE_URL) ||
  (typeof process !== 'undefined' && process.env?.DATABASE_URL) ||
  '';

let sqlClient: NeonQueryFunction<false, false> | null = null;

if (dbUrl) {
  try {
    sqlClient = neon(dbUrl, { disableWarningInBrowsers: true });
  } catch (e) {
    console.warn("Não foi possível conectar ao Neon, operando em modo offline resiliente:", e);
  }
}

/**
 * Executa uma query parametrizada no Neon de forma segura
 */
export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
  if (!sqlClient) {
    throw new Error("Conexão com o banco indisponível.");
  }
  try {
    const result = await (sqlClient as any).query(query, params);
    return result as T[];
  } catch (error) {
    console.error("Erro na consulta Neon:", error);
    throw error;
  }
}

// ==========================================
// FUNÇÕES DE DASHBOARD
// ==========================================

export async function getIndicadoresDashboard(): Promise<IndicadorMinisterial | null> {
 const rows = await executeQuery<IndicadorMinisterial>('SELECT * FROM tb_indicador_ministerial ORDER BY nr_ano_vigente DESC LIMIT 1');
 return rows[0] || null;
}

// ==========================================
// FUNÇÕES DE PERSISTÊNCIA (tb_relatorio_viagem)
// ==========================================

export async function getUltimoRelatorioAtivo(): Promise<RelatorioViagem | null> {
 const rows = await executeQuery<RelatorioViagem>("SELECT * FROM tb_relatorio_viagem WHERE t_status IN ('Em Aberto', 'Rascunho') ORDER BY created_at DESC LIMIT 1");
 return rows[0] || null;
}

export async function getAllRelatorios(): Promise<RelatorioViagem[]> {
 return executeQuery<RelatorioViagem>('SELECT * FROM tb_relatorio_viagem ORDER BY created_at DESC');
}

export async function getMissionarios(): Promise<Missionario[]> {
 return executeQuery<Missionario>('SELECT * FROM tb_missionario WHERE t_ativo = true ORDER BY nm_missionario ASC');
}

export async function saveMissionario(data: {
  id_missionario?: string;
  nm_missionario: string;
  nm_credencial_pastoral: string;
  t_cargo_tipo: string;
  t_email?: string;
  t_telefone?: string;
  t_foto_avatar_url?: string;
  t_ativo?: boolean;
}): Promise<Missionario> {
  if (data.id_missionario) {
    const rows = await executeQuery<Missionario>(
      `UPDATE tb_missionario 
       SET nm_missionario = $1, 
           nm_credencial_pastoral = $2, 
           t_cargo_tipo = $3, 
           t_email = $4, 
           t_telefone = $5,
           t_foto_avatar_url = $6,
           t_ativo = $7
       WHERE id_missionario = $8
       RETURNING *`,
      [
        data.nm_missionario,
        data.nm_credencial_pastoral,
        data.t_cargo_tipo,
        data.t_email || null,
        data.t_telefone || null,
        data.t_foto_avatar_url || null,
        data.t_ativo ?? true,
        data.id_missionario
      ]
    );
    return rows[0];
  } else {
    const rows = await executeQuery<Missionario>(
      `INSERT INTO tb_missionario (
         nm_missionario, 
         nm_credencial_pastoral, 
         t_cargo_tipo, 
         t_email, 
         t_telefone, 
         t_foto_avatar_url, 
         t_ativo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.nm_missionario,
        data.nm_credencial_pastoral,
        data.t_cargo_tipo,
        data.t_email || null,
        data.t_telefone || null,
        data.t_foto_avatar_url || null,
        data.t_ativo ?? true
      ]
    );
    return rows[0];
  }
}

export async function deleteMissionario(id_missionario: string): Promise<boolean> {
  try {
    await executeQuery(
      `UPDATE tb_missionario SET t_ativo = false WHERE id_missionario = $1`,
      [id_missionario]
    );
    return true;
  } catch (err) {
    console.error("Erro ao desativar irmão no Neon:", err);
    throw err;
  }
}

export async function getPolos(): Promise<PoloMissionario[]> {
 return executeQuery<PoloMissionario>('SELECT * FROM tb_polo_missionario WHERE t_ativo = true ORDER BY nm_polo ASC');
}

// ==========================================
// FUNÇÕES DE AGENDA / ESCALAS (tb_agenda_atendimento)
// ==========================================

export async function getAgendaItems(): Promise<AgendaItem[]> {
 return executeQuery<AgendaItem>('SELECT * FROM tb_agenda_atendimento ORDER BY t_data_inicio ASC');
}

export async function saveAgendaItem(data: {
  id_agenda?: string;
  nm_titulo: string;
  t_tipo: 'viagem' | 'batismo' | 'ceia' | 'reuniao';
  t_data_inicio: string;
  t_data_fim?: string;
  nm_local: string;
  nm_responsavel: string;
  t_status?: 'confirmado' | 'planejamento' | 'concluido';
  nr_participantes_esperados?: number;
  t_observacao?: string;
}): Promise<AgendaItem> {
  const safeDataInicio = normalizeDateToInput(data.t_data_inicio) || new Date().toISOString().split('T')[0];
  const safeDataFim = data.t_data_fim ? normalizeDateToInput(data.t_data_fim) : null;

  if (data.id_agenda) {
    const rows = await executeQuery<AgendaItem>(
      `UPDATE tb_agenda_atendimento
       SET nm_titulo = $1,
           t_tipo = $2,
           t_data_inicio = $3,
           t_data_fim = $4,
           nm_local = $5,
           nm_responsavel = $6,
           t_status = $7,
           nr_participantes_esperados = $8,
           t_observacao = $9
       WHERE id_agenda = $10
       RETURNING *`,
      [
        data.nm_titulo,
        data.t_tipo,
        safeDataInicio,
        safeDataFim,
        data.nm_local,
        data.nm_responsavel,
        data.t_status || 'confirmado',
        data.nr_participantes_esperados || 1,
        data.t_observacao || null,
        data.id_agenda
      ]
    );
    return rows[0];
  } else {
    const rows = await executeQuery<AgendaItem>(
      `INSERT INTO tb_agenda_atendimento (
         nm_titulo, t_tipo, t_data_inicio, t_data_fim,
         nm_local, nm_responsavel, t_status, nr_participantes_esperados, t_observacao
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.nm_titulo,
        data.t_tipo,
        safeDataInicio,
        safeDataFim,
        data.nm_local,
        data.nm_responsavel,
        data.t_status || 'confirmado',
        data.nr_participantes_esperados || 1,
        data.t_observacao || null
      ]
    );
    return rows[0];
  }
}

export async function deleteAgendaItem(id_agenda: string): Promise<boolean> {
  try {
    await executeQuery(`DELETE FROM tb_agenda_atendimento WHERE id_agenda = $1`, [id_agenda]);
    return true;
  } catch (err) {
    console.error("Erro ao excluir item da agenda:", err);
    throw err;
  }
}

export async function getRelatorioByProtocolo(protocolo: string): Promise<RelatorioViagem | null> {
  const rows = await executeQuery<RelatorioViagem>(
    `SELECT * FROM tb_relatorio_viagem WHERE nm_documento_protocolo = $1 LIMIT 1`,
    [protocolo]
  );
  return rows[0] || null;
}

/**
 * Obtém o próximo protocolo anual atômico a partir da sequence PostgreSQL no Neon.
 * Caso a sequence não esteja disponível ou em caso de erro, gera um identificador seguro
 * com garantia de unicidade (timestamp + entropia), evitando Math.random() de 4 dígitos e colisão com ON CONFLICT.
 */
export async function getProximoProtocolo(ano: number = new Date().getFullYear()): Promise<string> {
  try {
    const rows = await executeQuery<{ protocolo: string }>(
      `SELECT fn_proximo_protocolo_relatorio($1) AS protocolo`,
      [ano]
    );
    if (rows[0]?.protocolo) {
      return rows[0].protocolo;
    }
  } catch (err) {
    console.warn("Falha ao obter protocolo da sequence Neon, usando gerador resiliente:", err);
  }

  // Fallback seguro anti-colisão (entropia + timestamp unix)
  const timestampPart = Date.now().toString(36).toUpperCase();
  const randomPart = typeof crypto !== 'undefined' && crypto.getRandomValues
    ? Array.from(crypto.getRandomValues(new Uint8Array(3)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
    : Math.floor(100000 + Math.random() * 900000).toString();

  return `RM-${ano}-${timestampPart}-${randomPart}`;
}

export async function saveRelatorioBasico(
  data: Partial<RelatorioViagem>
): Promise<RelatorioViagem> {
  let protocolo = data.nm_documento_protocolo?.trim();
  if (!protocolo && data.id_relatorio) {
    try {
      const existing = await executeQuery<{ nm_documento_protocolo: string }>(
        `SELECT nm_documento_protocolo FROM tb_relatorio_viagem WHERE id_relatorio = $1 LIMIT 1`,
        [data.id_relatorio]
      );
      if (existing[0]?.nm_documento_protocolo) {
        protocolo = existing[0].nm_documento_protocolo;
      }
    } catch {
      // Ignora erro e prossegue para gerar novo protocolo
    }
  }
  if (!protocolo) {
    protocolo = await getProximoProtocolo();
  }


  try {
    // ATENÇÃO: nr_dias_campo é uma coluna GENERATED ALWAYS AS ((t_data_retorno - t_data_saida) + 1) STORED
    // no PostgreSQL, portanto NUNCA deve ser incluída no INSERT ou UPDATE.
    const rows = await executeQuery<RelatorioViagem>(
      `INSERT INTO tb_relatorio_viagem (
        nm_documento_protocolo,
        nm_missionario,
        nm_polo_destino,
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (nm_documento_protocolo) DO UPDATE SET
        nm_missionario = EXCLUDED.nm_missionario,
        nm_polo_destino = EXCLUDED.nm_polo_destino,
        nm_ministerio_vinculado = EXCLUDED.nm_ministerio_vinculado,
        t_data_saida = EXCLUDED.t_data_saida,
        t_data_retorno = EXCLUDED.t_data_retorno,
        nr_integrantes_comitiva = EXCLUDED.nr_integrantes_comitiva,
        t_objetivo_primario = EXCLUDED.t_objetivo_primario,
        nr_etapa_atual = EXCLUDED.nr_etapa_atual,
        t_status = EXCLUDED.t_status,
        t_concordancia_fiscal = EXCLUDED.t_concordancia_fiscal,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;`,
      [
        protocolo,
        data.nm_missionario?.trim() || '',
        data.nm_polo_destino?.trim() || '',
        data.nm_ministerio_vinculado || 'Atendimento Regional',
        normalizeDateToInput(data.t_data_saida) || null,
        normalizeDateToInput(data.t_data_retorno) || null,
        data.nr_integrantes_comitiva || 1,
        data.t_objetivo_primario?.trim() || '',
        data.nr_etapa_atual || 1,
        data.t_status || 'Em Aberto',
        data.dc_teto_pre_aprovado !== undefined ? Number(data.dc_teto_pre_aprovado) : 5000,
        data.dc_total_realizado || 0,
        Boolean(data.t_concordancia_fiscal)
      ]
    );

    const saved = rows[0];
    if (!saved?.id_relatorio) throw new Error('O servidor não confirmou o relatório.');
    try { localStorage.setItem('obrahub_relatorio_ativo', JSON.stringify(saved)); } catch { /* A cache failure does not undo a confirmed write. */ }
    return saved;
  } catch (err) {
    console.error("Erro ao persistir relatório no Neon:", err);
    throw err;
  }
}

// ==========================================
// FUNÇÕES DE PERSISTÊNCIA (tb_diario_atividade)
// ==========================================

export async function getDiarioPorData(idRelatorio: string, dataRegistro: string): Promise<DiarioAtividade | null> {
  if (!idRelatorio) throw new Error('Relatório não identificado.');
  const rows = await executeQuery<DiarioAtividade>(
    'SELECT * FROM tb_diario_atividade WHERE id_relatorio = $1 AND t_data_registro = $2 LIMIT 1',
    [idRelatorio, dataRegistro]
  );
  return rows[0] || null;
}

export async function getDiaryDates(idRelatorio: string): Promise<string[]> {
  const rows = await executeQuery<{ t_data_registro: string }>(
    'SELECT t_data_registro FROM tb_diario_atividade WHERE id_relatorio = $1 ORDER BY t_data_registro ASC',
    [idRelatorio]
  );
  return rows.map(row => normalizeDateToInput(row.t_data_registro));
}

export async function getReportReview(idRelatorio: string) {
  const [diaries, expenses] = await Promise.all([
    executeQuery<{ t_data_registro: string; t_resumo_atividades: string }>('SELECT t_data_registro, t_resumo_atividades FROM tb_diario_atividade WHERE id_relatorio = $1', [idRelatorio]),
    executeQuery<DespesaRubrica>('SELECT * FROM tb_despesa_rubrica WHERE id_relatorio = $1 ORDER BY t_data_despesa ASC NULLS LAST, dc_valor_despesa DESC', [idRelatorio])
  ]);
  return { diaries: diaries.map(day => ({ ...day, t_data_registro: normalizeDateToInput(day.t_data_registro) })), expenses };
}

export async function getDiariosRelatorio(idRelatorio: string): Promise<DiarioAtividade[]> {
  if (!idRelatorio) return [];
  try {
    const rows = await executeQuery<DiarioAtividade>(
      `SELECT * FROM tb_diario_atividade WHERE id_relatorio = $1 ORDER BY t_data_registro ASC`,
      [idRelatorio]
    );
    return rows;
  } catch (err) {
    console.warn("Erro ao buscar todos os diários do relatório:", err);
    return [];
  }
}

export async function saveDiarioAtividade(
  data: Partial<DiarioAtividade> & { id_relatorio: string }
): Promise<DiarioAtividade> {
  if (!data.id_relatorio || data.id_relatorio.trim() === '') {
    throw new Error("id_relatorio obrigatório para salvar o diário");
  }


  try {
    const rows = await executeQuery<DiarioAtividade>(
      `INSERT INTO tb_diario_atividade (
        id_relatorio, t_data_registro, t_deslocamento_ativo, dc_km_percorridos,
        nr_tempo_minutos_trajeto, t_resumo_atividades, t_salvo_status, t_intercorrencias
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id_relatorio, t_data_registro) DO UPDATE SET
        t_deslocamento_ativo = EXCLUDED.t_deslocamento_ativo,
        dc_km_percorridos = EXCLUDED.dc_km_percorridos,
        nr_tempo_minutos_trajeto = EXCLUDED.nr_tempo_minutos_trajeto,
        t_resumo_atividades = EXCLUDED.t_resumo_atividades,
        t_salvo_status = EXCLUDED.t_salvo_status,
        t_intercorrencias = EXCLUDED.t_intercorrencias
      RETURNING *;`,
      [
        data.id_relatorio,
        normalizeDateToInput(data.t_data_registro) || new Date().toISOString().split('T')[0],
        data.t_deslocamento_ativo ?? false,
        data.dc_km_percorridos || 0,
        data.nr_tempo_minutos_trajeto || 0,
        data.t_resumo_atividades || '',
        true,
        data.t_intercorrencias || 'Sem intercorrências no trajeto'
      ]
    );
    if (!rows[0]?.id_diario) throw new Error('O servidor não confirmou o diário.');
    return rows[0];
  } catch (err) {
    console.error("Erro ao persistir diário no Neon:", err);
    throw err;
  }
}

// ==========================================
// FUNÇÕES DE FOTOS (tb_evidencia_fotografica)
// ==========================================

export async function getEvidenciasFotos(idDiario: string): Promise<EvidenciaFotografica[]> {
  if (!idDiario) return [];
  return executeQuery<EvidenciaFotografica>(
    'SELECT * FROM tb_evidencia_fotografica WHERE id_diario = $1 ORDER BY nr_ordem ASC, created_at ASC',
    [idDiario]
  );
}

export async function getFotosPorRelatorio(idRelatorio: string): Promise<EvidenciaFotografica[]> {
  if (!idRelatorio) return [];
  try {
    const rows = await executeQuery<EvidenciaFotografica>(
      `SELECT f.* FROM tb_evidencia_fotografica f 
       JOIN tb_diario_atividade d ON f.id_diario = d.id_diario 
       WHERE d.id_relatorio = $1 
       ORDER BY d.t_data_registro ASC, f.nr_ordem ASC, f.created_at ASC`,
      [idRelatorio]
    );
    return rows;
  } catch (err) {
    console.warn("Erro ao buscar fotos do relatório:", err);
    return [];
  }
}

export async function saveEvidenciaFoto(
  data: Partial<EvidenciaFotografica> & { id_diario: string }
): Promise<EvidenciaFotografica> {
  const rows = await executeQuery<EvidenciaFotografica>(
    `INSERT INTO tb_evidencia_fotografica (
      id_diario, t_titulo_legenda, t_storage_path, t_download_url, nr_ordem
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *;`,
    [
      data.id_diario,
      data.t_titulo_legenda || 'Evidência em Campo',
      data.t_storage_path || '',
      data.t_download_url || '',
      data.nr_ordem || 0
    ]
  );
  if (!rows[0]?.id_foto) throw new Error('O servidor não confirmou o registro.');
    return rows[0];
}

export async function deleteEvidenciaFoto(idFoto: string): Promise<void> {
  const rows = await executeQuery<{ id_foto: string }>(`DELETE FROM tb_evidencia_fotografica WHERE id_foto = $1 RETURNING id_foto`, [idFoto]);
  if (rows[0]?.id_foto !== idFoto) throw new Error('O servidor não confirmou a exclusão da foto.');
}

// ==========================================
// FUNÇÕES DE PERSISTÊNCIA (tb_despesa_rubrica)
// ==========================================

const normalizeExpense = (r: DespesaRubrica): DespesaRubrica => {
  if (!r) return r;
  return {
    ...r,
    t_data_despesa: r.t_data_despesa ? normalizeDateToInput(r.t_data_despesa) : undefined
  };
};

export async function getDespesasRelatorio(idRelatorio: string): Promise<DespesaRubrica[]> {
  if (!idRelatorio) return [];
  try {
    const rows = await executeQuery<DespesaRubrica>(
      `SELECT * FROM tb_despesa_rubrica WHERE id_relatorio = $1 ORDER BY dc_valor_despesa DESC`,
      [idRelatorio]
    );
    return rows.map(normalizeExpense);
  } catch (err) {
    console.warn("Erro ao buscar despesas do relatório:", err);
    return [];
  }
}

export async function saveDespesaRubrica(
  data: Partial<DespesaRubrica> & { id_relatorio: string }
): Promise<DespesaRubrica> {
  try {
    const valorDespesa = Math.max(0, Number(data.dc_valor_despesa) || 0);
    if (data.id_despesa) {
      if (data.t_data_despesa !== undefined) {
        const rows = await executeQuery<DespesaRubrica>(
          `UPDATE tb_despesa_rubrica SET nm_rubrica = $1, t_icone_identificador = $2,
            dc_valor_despesa = $3, nr_comprovantes_anexados = $4, t_comprovante_storage_urls = $5,
            t_data_despesa = $8
            WHERE id_despesa = $6 AND id_relatorio = $7 RETURNING *`,
          [data.nm_rubrica, data.t_icone_identificador || 'file', valorDespesa,
            (data.t_comprovante_storage_urls || []).length, data.t_comprovante_storage_urls || [], data.id_despesa, data.id_relatorio, data.t_data_despesa || null]
        );
        if (rows[0]?.id_despesa !== data.id_despesa) throw new Error('O servidor não confirmou a alteração da despesa.');
        return normalizeExpense(rows[0]);
      }
      const rows = await executeQuery<DespesaRubrica>(
        `UPDATE tb_despesa_rubrica SET nm_rubrica = $1, t_icone_identificador = $2,
          dc_valor_despesa = $3, nr_comprovantes_anexados = $4, t_comprovante_storage_urls = $5
          WHERE id_despesa = $6 AND id_relatorio = $7 RETURNING *`,
        [data.nm_rubrica, data.t_icone_identificador || 'file', valorDespesa,
          (data.t_comprovante_storage_urls || []).length, data.t_comprovante_storage_urls || [], data.id_despesa, data.id_relatorio]
      );
      if (rows[0]?.id_despesa !== data.id_despesa) throw new Error('O servidor não confirmou a alteração da despesa.');
      return rows[0];
    }
    const rows = await executeQuery<DespesaRubrica>(
      `INSERT INTO tb_despesa_rubrica (
        id_relatorio, nm_rubrica, t_icone_identificador, dc_valor_despesa, nr_comprovantes_anexados, t_comprovante_storage_urls, t_data_despesa
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;`,
      [
        data.id_relatorio,
        data.nm_rubrica,
        data.t_icone_identificador || 'file',
        valorDespesa,
        data.nr_comprovantes_anexados || 0,
        data.t_comprovante_storage_urls || [],
        data.t_data_despesa || null
      ]
    );
    if (!rows[0]?.id_despesa) throw new Error('O servidor não confirmou o registro.');
    return normalizeExpense(rows[0]);
  } catch (err) {
    console.error("Erro ao salvar despesa no Neon:", err);
    throw err;
  }
}

export async function deleteDespesaRubrica(idDespesa: string): Promise<void> {
  const rows = await executeQuery<{ id_despesa: string }>(`DELETE FROM tb_despesa_rubrica WHERE id_despesa = $1 RETURNING id_despesa`, [idDespesa]);
  if (rows[0]?.id_despesa !== idDespesa) throw new Error('O servidor não confirmou a exclusão da despesa.');
}

// ==========================================
// FINALIZAÇÃO DO RELATÓRIO
// ==========================================

export async function finalizarRelatorio(
  idRelatorio: string,
  totalRealizado: number,
  declaracaoFiscal: boolean
): Promise<RelatorioViagem> {
  const rows = await executeQuery<RelatorioViagem>(
    `UPDATE tb_relatorio_viagem 
     SET t_status = 'Concluído', 
         dc_total_realizado = $2, 
         t_concordancia_fiscal = $3,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_relatorio = $1 RETURNING *`,
    [idRelatorio, totalRealizado, declaracaoFiscal]
  );
  if (!rows[0]?.id_relatorio || rows[0].t_status !== 'Concluído') throw new Error('O servidor não confirmou a finalização.');
  try { localStorage.removeItem('obrahub_relatorio_ativo'); } catch { /* Already confirmed. */ }
  return rows[0];
}

export async function updateConcordanciaFiscal(
  idRelatorio: string,
  declaracaoFiscal: boolean
): Promise<void> {
  if (!idRelatorio) return;
  await executeQuery(
    `UPDATE tb_relatorio_viagem 
     SET t_concordancia_fiscal = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id_relatorio = $1`,
    [idRelatorio, declaracaoFiscal]
  );
}

// ==========================================
// FUNÇÕES DE NOTIFICAÇÕES & DESTINATÁRIOS
// ==========================================

export async function getDestinatariosNotificacao(): Promise<DestinatarioNotificacao[]> {
 return executeQuery<DestinatarioNotificacao>('SELECT * FROM tb_destinatario_notificacao WHERE t_ativo = true ORDER BY t_envio_automatico DESC, nm_destinatario ASC');
}

export async function saveDestinatarioNotificacao(data: {
  id_destinatario?: string;
  nm_destinatario: string;
  t_email: string;
  t_cargo_departamento?: string;
  t_envio_automatico?: boolean;
}): Promise<DestinatarioNotificacao> {
  if (data.id_destinatario) {
    const rows = await executeQuery<DestinatarioNotificacao>(
      `UPDATE tb_destinatario_notificacao 
       SET nm_destinatario = $1, 
           t_email = $2, 
           t_cargo_departamento = $3, 
           t_envio_automatico = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id_destinatario = $5
       RETURNING *`,
      [
        data.nm_destinatario.trim(),
        data.t_email.trim().toLowerCase(),
        data.t_cargo_departamento?.trim() || null,
        data.t_envio_automatico ?? true,
        data.id_destinatario
      ]
    );
    return rows[0];
  } else {
    const rows = await executeQuery<DestinatarioNotificacao>(
      `INSERT INTO tb_destinatario_notificacao (
         nm_destinatario, t_email, t_cargo_departamento, t_envio_automatico, t_ativo
       ) VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [
        data.nm_destinatario.trim(),
        data.t_email.trim().toLowerCase(),
        data.t_cargo_departamento?.trim() || null,
        data.t_envio_automatico ?? true
      ]
    );
    return rows[0];
  }
}

export async function deleteDestinatarioNotificacao(id_destinatario: string): Promise<boolean> {
  try {
    await executeQuery(
      `UPDATE tb_destinatario_notificacao SET t_ativo = false, updated_at = CURRENT_TIMESTAMP WHERE id_destinatario = $1`,
      [id_destinatario]
    );
    return true;
  } catch (err) {
    console.error("Erro ao desativar destinatário no Neon:", err);
    throw err;
  }
}

export async function toggleEnvioAutomaticoDestinatario(id_destinatario: string, ativo: boolean): Promise<boolean> {
  try {
    await executeQuery(
      `UPDATE tb_destinatario_notificacao SET t_envio_automatico = $1, updated_at = CURRENT_TIMESTAMP WHERE id_destinatario = $2`,
      [ativo, id_destinatario]
    );
    return true;
  } catch (err) {
    console.error("Erro ao alternar envio automático no Neon:", err);
    throw err;
  }
}

export interface DisparoEmailPayload {
  destinatarios: string[];
  protocolo: string;
  missionario: string;
  ministerio?: string;
  polo: string;
  periodo?: string;
  totalRealizado: number;
  tetoAutorizado?: number;
  saldoRestante?: number;
  resumoObjetivo?: string;
  linkRelatorio?: string;
}

export function gerarMailtoRelatorio(payload: DisparoEmailPayload): string {
  const to = payload.destinatarios.join(',');
  const subject = encodeURIComponent(`[ObraHub] Relatório Concluído — #${payload.protocolo} — ${payload.polo}`);
  
  // Link direto para abrir e baixar o relatório
  const link = payload.linkRelatorio || (
    typeof window !== 'undefined' 
      ? reportLink(payload.protocolo) 
      : `http://localhost:3000/?relatorio=${payload.protocolo}`
  );

  const bodyText = `Prezados irmãos da Gestão Ministerial e Conselho Fiscal,\n\n` +
    `Informamos que o relatório de atendimento ministerial foi concluído no sistema ObraHub.\n\n` +
    `-----------------------------------------\n` +
    `📄 VISUALIZAÇÃO E DOWNLOAD DO PDF OFICIAL:\n` +
    `Para abrir o relatório completo e salvar o PDF em folha A4 com todas as notas e fotos, acesse:\n` +
    `${link}\n` +
    `-----------------------------------------\n\n` +
    `DADOS DO ATENDIMENTO:\n` +
    `• Protocolo: #${payload.protocolo}\n` +
    `• Missionário / Relator: ${payload.missionario}\n` +
    `• Ministério: ${payload.ministerio || 'Atendimento Ministerial'}\n` +
    `• Localidade / Polo: ${payload.polo}\n` +
    (payload.periodo ? `• Período: ${payload.periodo}\n` : '') +
    `\n` +
    `BALANÇO FINANCEIRO:\n` +
    (payload.tetoAutorizado ? `• Teto Autorizado: R$ ${payload.tetoAutorizado.toFixed(2)}\n` : '') +
    `• Total Realizado (Gasto): R$ ${payload.totalRealizado.toFixed(2)}\n` +
    (payload.saldoRestante !== undefined ? `• Saldo Restante / A Devolver: R$ ${payload.saldoRestante.toFixed(2)}\n` : '') +
    `\n` +
    (payload.resumoObjetivo ? `FINALIDADE / RESUMO:\n${payload.resumoObjetivo}\n\n` : '') +
    `Em Cristo Jesus,\n` +
    `${payload.missionario}\n` +
    `ObraHub — Gestão e Prestação de Contas Ministerial`;

  const body = encodeURIComponent(bodyText);
  return `mailto:${to}?subject=${subject}&body=${body}`;
}


export async function registerPushDeviceToken(token: string, idMissionario?: string): Promise<void> {
  if (!token) return;
  try {
    await executeQuery(
      `INSERT INTO tb_dispositivo_push (t_fcm_token, id_missionario, t_plataforma, t_ativo, updated_at)
       VALUES ($1, $2, 'web', true, CURRENT_TIMESTAMP)
       ON CONFLICT (t_fcm_token) 
       DO UPDATE SET id_missionario = COALESCE($2, tb_dispositivo_push.id_missionario),
                     t_ativo = true,
                     updated_at = CURRENT_TIMESTAMP`,
      [token, idMissionario || null]
    );
  } catch (err) {
    console.warn("Aviso ao registrar token push no Neon:", err);
  }
}

export const DEFAULT_CONFIG_LEMBRETE: ConfiguracaoLembrete = {
  t_lembrete_ativo: true,
  hr_lembrete: '20:00',
  t_somente_em_viagem: true,
  t_notificar_pendencias: true,
  t_som_ativo: true
};

export async function getConfiguracaoLembrete(idMissionario?: string): Promise<ConfiguracaoLembrete> {
  // 1. Tenta recuperar do cache local imediato
  let localConfig: ConfiguracaoLembrete = { ...DEFAULT_CONFIG_LEMBRETE };
  try {
    const raw = localStorage.getItem('obrahub_config_lembrete');
    if (raw) {
      localConfig = { ...localConfig, ...JSON.parse(raw) };
    }
  } catch {
    // Silencioso em caso de restrição de storage
  }

  // 2. Consulta no Neon PostgreSQL
  try {
    const query = idMissionario
      ? 'SELECT * FROM tb_configuracao_lembrete WHERE id_missionario = $1 ORDER BY updated_at DESC LIMIT 1'
      : 'SELECT * FROM tb_configuracao_lembrete ORDER BY updated_at DESC LIMIT 1';
    const params = idMissionario ? [idMissionario] : [];
    const rows = await executeQuery<ConfiguracaoLembrete>(query, params);

    if (rows && rows.length > 0) {
      const merged: ConfiguracaoLembrete = {
        ...localConfig,
        ...rows[0],
        hr_lembrete: rows[0].hr_lembrete?.slice(0, 5) || '20:00'
      };
      try {
        localStorage.setItem('obrahub_config_lembrete', JSON.stringify(merged));
      } catch {}
      return merged;
    }
  } catch (err) {
    console.warn("Aviso ao carregar configurações de lembrete do Neon:", err);
  }

  return localConfig;
}

export async function saveConfiguracaoLembrete(
  config: Partial<ConfiguracaoLembrete>,
  idMissionario?: string
): Promise<ConfiguracaoLembrete> {
  const merged: ConfiguracaoLembrete = {
    ...DEFAULT_CONFIG_LEMBRETE,
    ...config,
    id_missionario: idMissionario || config.id_missionario
  };

  // 1. Salva imediatamente no localStorage
  try {
    localStorage.setItem('obrahub_config_lembrete', JSON.stringify(merged));
  } catch {}

  // 2. Persiste no Neon PostgreSQL
  try {
    if (merged.id_config) {
      const rows = await executeQuery<ConfiguracaoLembrete>(
        `UPDATE tb_configuracao_lembrete
         SET t_lembrete_ativo = $1,
             hr_lembrete = $2,
             t_somente_em_viagem = $3,
             t_notificar_pendencias = $4,
             t_som_ativo = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id_config = $6
         RETURNING *`,
        [
          merged.t_lembrete_ativo,
          merged.hr_lembrete.slice(0, 5),
          merged.t_somente_em_viagem,
          merged.t_notificar_pendencias,
          merged.t_som_ativo,
          merged.id_config
        ]
      );
      if (rows && rows[0]) return rows[0];
    } else {
      const rows = await executeQuery<ConfiguracaoLembrete>(
        `INSERT INTO tb_configuracao_lembrete (
           id_missionario, t_lembrete_ativo, hr_lembrete, t_somente_em_viagem, t_notificar_pendencias, t_som_ativo
         ) VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          merged.id_missionario || null,
          merged.t_lembrete_ativo,
          merged.hr_lembrete.slice(0, 5),
          merged.t_somente_em_viagem,
          merged.t_notificar_pendencias,
          merged.t_som_ativo
        ]
      );
      if (rows && rows[0]) {
        try {
          localStorage.setItem('obrahub_config_lembrete', JSON.stringify(rows[0]));
        } catch {}
        return rows[0];
      }
    }
  } catch (err) {
    console.warn("Aviso ao persistir configurações de lembrete no Neon:", err);
  }

  return merged;
}
