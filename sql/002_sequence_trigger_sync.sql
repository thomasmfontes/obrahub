-- Migração 002: Sequence para protocolos anuais atômicos e Trigger de sincronização contábil
-- TASK-DB-01 & TASK-DB-02

-- 1. Sequence para controle atômico e sequencial de protocolos anuais
CREATE SEQUENCE IF NOT EXISTS seq_relatorio_protocolo_2026 START WITH 1000;

-- Função atômica para geração de próximo protocolo anual sem colisões
CREATE OR REPLACE FUNCTION fn_proximo_protocolo_relatorio(p_ano INT DEFAULT 2026)
RETURNS VARCHAR AS $$
DECLARE
  v_seq_name TEXT;
  v_seq_val BIGINT;
  v_protocolo VARCHAR;
  v_exists BOOLEAN;
BEGIN
  v_seq_name := 'seq_relatorio_protocolo_' || p_ano;
  -- Garante que a sequence para o ano existe
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START WITH 1000', v_seq_name);
  LOOP
    EXECUTE format('SELECT nextval(%L)', v_seq_name) INTO v_seq_val;
    v_protocolo := 'RM-' || p_ano || '-' || LPAD(v_seq_val::text, 4, '0');
    SELECT EXISTS (
      SELECT 1 FROM tb_relatorio_viagem WHERE nm_documento_protocolo = v_protocolo
    ) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;
  RETURN v_protocolo;
END;
$$ LANGUAGE plpgsql;

-- 2. Função e Trigger de Sincronização Contábil Automática
-- Mantém tb_relatorio_viagem.dc_total_realizado sempre sincronizado com tb_despesa_rubrica
CREATE OR REPLACE FUNCTION fn_sync_relatorio_total_despesas()
RETURNS TRIGGER AS $$
DECLARE
  v_relatorio_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_relatorio_id := OLD.id_relatorio;
  ELSE
    v_relatorio_id := NEW.id_relatorio;
  END IF;

  UPDATE tb_relatorio_viagem
  SET dc_total_realizado = COALESCE((
    SELECT SUM(dc_valor_despesa)
    FROM tb_despesa_rubrica
    WHERE id_relatorio = v_relatorio_id
  ), 0.00),
  updated_at = CURRENT_TIMESTAMP
  WHERE id_relatorio = v_relatorio_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_despesas_total ON tb_despesa_rubrica;
CREATE TRIGGER trg_sync_despesas_total
AFTER INSERT OR UPDATE OR DELETE ON tb_despesa_rubrica
FOR EACH ROW EXECUTE FUNCTION fn_sync_relatorio_total_despesas();

-- 3. Recálculo corretivo para garantir integridade retroativa
UPDATE tb_relatorio_viagem r
SET dc_total_realizado = COALESCE((
  SELECT SUM(d.dc_valor_despesa)
  FROM tb_despesa_rubrica d
  WHERE d.id_relatorio = r.id_relatorio
), 0.00);
