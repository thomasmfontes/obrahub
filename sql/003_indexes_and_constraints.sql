-- Migração 003: Índices em FKs & Performance de Consultas e Constraints de Integridade e Unicidade
-- TASK-DB-03 & TASK-DB-04

-- ============================================================================
-- 1. [TASK-DB-03] Índices em FKs & Performance de Consultas
-- ============================================================================

-- Índice crucial para eliminar Full Table Scan e locks em cascata em FK de tb_evidencia_fotografica
CREATE INDEX IF NOT EXISTS idx_foto_diario ON tb_evidencia_fotografica (id_diario);

-- Índices para listagens e ordenações frequentes
CREATE INDEX IF NOT EXISTS idx_relatorio_created_at ON tb_relatorio_viagem (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relatorio_status_created ON tb_relatorio_viagem (t_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agenda_data_inicio ON tb_agenda_atendimento (t_data_inicio ASC);
CREATE INDEX IF NOT EXISTS idx_destinatario_listagem ON tb_destinatario_notificacao (t_ativo, t_envio_automatico DESC, nm_destinatario ASC);
CREATE INDEX IF NOT EXISTS idx_missionario_ativo_nome ON tb_missionario (t_ativo, nm_missionario ASC);
CREATE INDEX IF NOT EXISTS idx_polo_ativo_nome ON tb_polo_missionario (t_ativo, nm_polo ASC);
CREATE INDEX IF NOT EXISTS idx_despesa_relatorio_valor ON tb_despesa_rubrica (id_relatorio, dc_valor_despesa DESC);

-- Remoção de índice redundante (uq_relatorio_data já cobre id_relatorio como coluna líder)
DROP INDEX IF EXISTS idx_diario_relatorio;

-- ============================================================================
-- 2. [TASK-DB-04] Constraints de Integridade e Unicidade
-- ============================================================================

-- Validações de integridade temporal, monetária e enum de status em tb_relatorio_viagem
ALTER TABLE tb_relatorio_viagem
  ADD CONSTRAINT chk_relatorio_datas CHECK (t_data_retorno >= t_data_saida),
  ADD CONSTRAINT chk_relatorio_valores CHECK (dc_teto_pre_aprovado >= 0 AND dc_total_realizado >= 0),
  ADD CONSTRAINT chk_relatorio_status CHECK (t_status IN ('Em Aberto', 'Rascunho', 'Concluído', 'Cancelado'));

-- Validação de valores monetários não-negativos em tb_despesa_rubrica
ALTER TABLE tb_despesa_rubrica
  ADD CONSTRAINT chk_despesa_valor CHECK (dc_valor_despesa >= 0);

-- Validações de datas, tipos e status em tb_agenda_atendimento
ALTER TABLE tb_agenda_atendimento
  ADD CONSTRAINT chk_agenda_datas CHECK (t_data_fim IS NULL OR t_data_fim >= t_data_inicio),
  ADD CONSTRAINT chk_agenda_tipo CHECK (t_tipo IN ('viagem', 'batismo', 'ceia', 'reuniao')),
  ADD CONSTRAINT chk_agenda_status CHECK (t_status IN ('confirmado', 'planejamento', 'concluido'));

-- Impedir e-mails duplicados em destinatários de notificação
ALTER TABLE tb_destinatario_notificacao
  ADD CONSTRAINT uq_destinatario_email UNIQUE (t_email);
