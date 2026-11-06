-- ==========================================================
-- SPRINT 4: CONFIGURAÇÕES DE LEMBRETES DO USUÁRIO
-- ==========================================================

CREATE TABLE IF NOT EXISTS tb_configuracao_lembrete (
    id_config UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_missionario UUID REFERENCES tb_missionario(id_missionario) ON DELETE SET NULL,
    t_lembrete_ativo BOOLEAN DEFAULT TRUE,
    hr_lembrete VARCHAR(5) DEFAULT '20:00',
    t_somente_em_viagem BOOLEAN DEFAULT TRUE,
    t_notificar_pendencias BOOLEAN DEFAULT TRUE,
    t_som_ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_config_lembrete_missionario 
ON tb_configuracao_lembrete (id_missionario);
