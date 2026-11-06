-- ==========================================================
-- SPRINT 3: VINCULAÇÃO DE DESPESAS POR DIA E DISPOSITIVOS PUSH
-- ==========================================================

-- 1. Permite vincular cada despesa a uma data específica da viagem
ALTER TABLE tb_despesa_rubrica 
ADD COLUMN IF NOT EXISTS t_data_despesa DATE;

-- Índice para consultas de despesas por dia e relatório
CREATE INDEX IF NOT EXISTS idx_despesa_relatorio_data 
ON tb_despesa_rubrica (id_relatorio, t_data_despesa);

-- 2. Tabela para registro de tokens do Firebase Cloud Messaging (FCM)
CREATE TABLE IF NOT EXISTS tb_dispositivo_push (
    id_dispositivo UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_missionario UUID REFERENCES tb_missionario(id_missionario) ON DELETE SET NULL,
    t_fcm_token TEXT NOT NULL UNIQUE,
    t_plataforma VARCHAR(50) DEFAULT 'web',
    t_ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_push_ativo 
ON tb_dispositivo_push (t_ativo);
