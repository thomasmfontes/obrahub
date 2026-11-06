-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE POLOS E CAMPOS MISSIONÁRIOS
CREATE TABLE IF NOT EXISTS tb_polo_missionario (
    id_polo UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nm_polo VARCHAR(150) NOT NULL,
    nm_regional VARCHAR(80) NOT NULL,
    t_ativo BOOLEAN NOT NULL DEFAULT TRUE,
    nr_centros_ativos INT NOT NULL DEFAULT 3,
    t_descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE MISSIONÁRIOS / LÍDERES
CREATE TABLE IF NOT EXISTS tb_missionario (
    id_missionario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_firebase_uid VARCHAR(128) UNIQUE NOT NULL,
    nm_missionario VARCHAR(200) NOT NULL,
    nm_credencial_pastoral VARCHAR(50) NOT NULL,
    t_cargo_tipo VARCHAR(50) NOT NULL DEFAULT 'Titular',
    t_foto_avatar_url VARCHAR(500),
    t_email VARCHAR(255) NOT NULL UNIQUE,
    t_ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE INDICADORES MINISTERIAIS (DASHBOARD)
CREATE TABLE IF NOT EXISTS tb_indicador_ministerial (
    id_indicador UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_missionario UUID REFERENCES tb_missionario(id_missionario),
    nr_ano_vigente INT NOT NULL DEFAULT 2026,
    nr_ceias_celebradas INT NOT NULL DEFAULT 12,
    nr_ceias_meta INT NOT NULL DEFAULT 12,
    nr_total_batizados INT NOT NULL DEFAULT 45,
    nr_batizados_trimestre INT NOT NULL DEFAULT 8,
    t_ultimo_batismo_data DATE DEFAULT '2026-08-15',
    nm_ultimo_batismo_polo VARCHAR(150) DEFAULT 'Polo Central',
    nr_ciclo_atualizacao_dias INT NOT NULL DEFAULT 60,
    t_status_ciclo VARCHAR(30) NOT NULL DEFAULT 'Em dia',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA MESTRE DE RELATÓRIOS DE VIAGEM MISSIONÁRIA
CREATE TABLE IF NOT EXISTS tb_relatorio_viagem (
    id_relatorio UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_missionario UUID REFERENCES tb_missionario(id_missionario),
    id_polo UUID REFERENCES tb_polo_missionario(id_polo),
    nm_documento_protocolo VARCHAR(50) NOT NULL UNIQUE,
    nm_ministerio_vinculado VARCHAR(150) NOT NULL DEFAULT 'Missões Nacionais & Plantação de Igrejas',
    
    t_data_saida DATE NOT NULL,
    t_data_retorno DATE NOT NULL,
    nr_dias_campo INT DEFAULT 8,
    nr_integrantes_comitiva INT NOT NULL DEFAULT 4,
    
    t_objetivo_primario TEXT NOT NULL,
    t_status VARCHAR(40) NOT NULL DEFAULT 'Em Aberto',
    nr_etapa_atual INT NOT NULL DEFAULT 1,
    
    dc_teto_pre_aprovado NUMERIC(12, 2) NOT NULL DEFAULT 5200.00,
    dc_total_realizado NUMERIC(12, 2) NOT NULL DEFAULT 4850.00,
    dc_saldo_restante NUMERIC(12, 2) DEFAULT 350.00,
    t_concordancia_fiscal BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE DIÁRIO DE ATIVIDADES
CREATE TABLE IF NOT EXISTS tb_diario_atividade (
    id_diario UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_relatorio UUID NOT NULL REFERENCES tb_relatorio_viagem(id_relatorio) ON DELETE CASCADE,
    t_data_registro DATE NOT NULL,
    
    t_deslocamento_ativo BOOLEAN NOT NULL DEFAULT TRUE,
    dc_km_percorridos NUMERIC(8, 2) DEFAULT 280.00,
    nr_tempo_minutos_trajeto INT DEFAULT 255,
    
    t_resumo_atividades TEXT NOT NULL,
    t_salvo_status BOOLEAN NOT NULL DEFAULT TRUE,
    t_intercorrencias TEXT DEFAULT 'Sem intercorrências no trajeto (Tudo em conformidade)',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_relatorio_data UNIQUE (id_relatorio, t_data_registro)
);

-- 6. TABELA DE EVIDÊNCIAS FOTOGRÁFICAS
CREATE TABLE IF NOT EXISTS tb_evidencia_fotografica (
    id_foto UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_diario UUID NOT NULL REFERENCES tb_diario_atividade(id_diario) ON DELETE CASCADE,
    t_titulo_legenda VARCHAR(100) NOT NULL,
    t_storage_path VARCHAR(500) NOT NULL,
    t_download_url TEXT NOT NULL,
    nr_ordem INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE DESPESAS E COMPROVANTES FISCAIS
CREATE TABLE IF NOT EXISTS tb_despesa_rubrica (
    id_despesa UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    id_relatorio UUID NOT NULL REFERENCES tb_relatorio_viagem(id_relatorio) ON DELETE CASCADE,
    nm_rubrica VARCHAR(80) NOT NULL,
    t_icone_identificador VARCHAR(50) NOT NULL,
    dc_valor_despesa NUMERIC(10, 2) NOT NULL,
    nr_comprovantes_anexados INT NOT NULL DEFAULT 1,
    t_comprovante_storage_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed de Dados Iniciais para testes e demonstração imediata
INSERT INTO tb_polo_missionario (id_polo, nm_polo, nm_regional, t_ativo, nr_centros_ativos, t_descricao)
VALUES 
('11111111-1111-1111-1111-111111111111', 'Sertão Nordestino - Polo Petrolina e Juazeiro', 'Regional Sertão 04', true, 3, 'Polos ribeirinhos e congregações ativas')
ON CONFLICT (id_polo) DO NOTHING;

INSERT INTO tb_missionario (id_missionario, id_firebase_uid, nm_missionario, nm_credencial_pastoral, t_cargo_tipo, t_foto_avatar_url, t_email)
VALUES
('22222222-2222-2222-2222-222222222222', 'usr_samuel_alb', 'Pr. Samuel Albuquerque', 'Credencial Pastoral #2841', 'Titular', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80', 'samuel.albuquerque@obrahub.org')
ON CONFLICT (id_missionario) DO NOTHING;

INSERT INTO tb_relatorio_viagem (id_relatorio, id_missionario, id_polo, nm_documento_protocolo, nm_ministerio_vinculado, t_data_saida, t_data_retorno, nr_dias_campo, nr_integrantes_comitiva, t_objetivo_primario, t_status, nr_etapa_atual, dc_teto_pre_aprovado, dc_total_realizado, dc_saldo_restante, t_concordancia_fiscal)
VALUES
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-111111111111', 'RM-2026-88', 'Missões Nacionais & Plantação de Igrejas', '2026-10-04', '2026-10-12', 8, 4, 'Capacitação pastoral de obreiros locais ribeirinhos e alinhamento orçamentário', 'Em Aberto', 2, 5200.00, 4850.00, 350.00, true)
ON CONFLICT (id_relatorio) DO NOTHING;
