export interface PoloMissionario {
  id_polo: string;
  nm_polo: string;
  nm_regional: string;
  t_ativo: boolean;
  nr_centros_ativos: number;
  t_descricao?: string;
}

export interface Missionario {
  id_missionario: string;
  id_firebase_uid?: string;
  nm_missionario: string;
  nm_credencial_pastoral: string;
  t_cargo_tipo: string;
  t_foto_avatar_url?: string;
  t_email?: string;
  t_telefone?: string;
  t_ativo: boolean;
}

export interface IndicadorMinisterial {
  id_indicador: string;
  nr_ano_vigente: number;
  nr_ceias_celebradas: number;
  nr_ceias_meta: number;
  nr_total_batizados: number;
  nr_batizados_trimestre: number;
  t_ultimo_batismo_data?: string;
  nm_ultimo_batismo_polo?: string;
  nr_ciclo_atualizacao_dias: number;
  t_status_ciclo: string;
}

export interface RelatorioViagem {
  id_relatorio: string;
  id_missionario?: string;
  id_polo?: string;
  nm_missionario?: string;
  nm_polo_destino?: string;
  nm_documento_protocolo: string;
  nm_ministerio_vinculado: string;
  t_data_saida: string;
  t_data_retorno: string;
  nr_dias_campo: number;
  nr_integrantes_comitiva: number;
  t_objetivo_primario: string;
  t_status: string;
  nr_etapa_atual: number;
  dc_teto_pre_aprovado: number;
  dc_total_realizado: number;
  dc_saldo_restante: number;
  t_concordancia_fiscal: boolean;
}

export interface DiarioAtividade {
  id_diario: string;
  id_relatorio: string;
  t_data_registro: string;
  t_deslocamento_ativo: boolean;
  dc_km_percorridos: number;
  nr_tempo_minutos_trajeto: number;
  t_resumo_atividades: string;
  t_salvo_status: boolean;
  t_intercorrencias: string;
}

export interface EvidenciaFotografica {
  id_foto: string;
  id_diario: string;
  t_titulo_legenda: string;
  t_storage_path: string;
  t_download_url: string;
  nr_ordem: number;
}

export interface DespesaRubrica {
  id_despesa: string;
  id_relatorio: string;
  nm_rubrica: string;
  t_icone_identificador: string;
  dc_valor_despesa: number;
  nr_comprovantes_anexados: number;
  t_comprovante_storage_urls?: string[];
  t_data_despesa?: string;
}

export interface AgendaItem {
  id_agenda: string;
  nm_titulo: string;
  t_tipo: 'viagem' | 'batismo' | 'ceia' | 'reuniao';
  t_data_inicio: string;
  t_data_fim?: string;
  nm_local: string;
  nm_responsavel: string;
  t_status: 'confirmado' | 'planejamento' | 'concluido';
  nr_participantes_esperados?: number;
  t_observacao?: string;
}

export interface DestinatarioNotificacao {
  id_destinatario: string;
  nm_destinatario: string;
  t_email: string;
  t_cargo_departamento?: string;
  t_envio_automatico: boolean;
  t_ativo: boolean;
  created_at?: string;
}

export interface ConfiguracaoLembrete {
  id_config?: string;
  id_missionario?: string;
  t_lembrete_ativo: boolean;
  hr_lembrete: string; // HH:MM, ex: '20:00'
  t_somente_em_viagem: boolean;
  t_notificar_pendencias: boolean;
  t_som_ativo: boolean;
  created_at?: string;
  updated_at?: string;
}
