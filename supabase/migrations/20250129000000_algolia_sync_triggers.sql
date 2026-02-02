-- Migration: Criar triggers para sincronização com Algolia
-- Estes triggers chamam uma Edge Function via webhook quando há mudanças nas tabelas

-- Nota: Para usar estes triggers, você precisa:
-- 1. Fazer deploy da Edge Function algolia-sync
-- 2. Configurar a variável SUPABASE_ALGOLIA_WEBHOOK_URL com a URL da função
-- 3. Opcionalmente configurar WEBHOOK_SECRET para autenticação

-- Criar função genérica para notificar mudanças via webhook
CREATE OR REPLACE FUNCTION notify_algolia_sync()
RETURNS TRIGGER AS $$
DECLARE
  payload jsonb;
  webhook_url text;
  webhook_secret text;
BEGIN
  -- Buscar URL do webhook das variáveis de ambiente
  -- Nota: Em produção, você pode usar pg_net ou um worker externo
  webhook_url := current_setting('app.algolia_webhook_url', true);
  webhook_secret := current_setting('app.algolia_webhook_secret', true);

  -- Se não há URL configurada, apenas retorna sem fazer nada
  IF webhook_url IS NULL OR webhook_url = '' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Construir payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::jsonb END,
    'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::jsonb END
  );

  -- Usar pg_net para fazer requisição HTTP assíncrona (se disponível)
  -- Isso requer a extensão pg_net habilitada no Supabase
  PERFORM net.http_post(
    url := webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(webhook_secret, '')
    ),
    body := payload
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, apenas loga e continua
  -- Não queremos que falhas no Algolia bloqueiem operações do banco
  RAISE WARNING 'Erro ao notificar Algolia: %', SQLERRM;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para finance_transactions
DROP TRIGGER IF EXISTS algolia_sync_transactions ON finance_transactions;
CREATE TRIGGER algolia_sync_transactions
  AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_algolia_sync();

-- Trigger para finance_accounts
DROP TRIGGER IF EXISTS algolia_sync_accounts ON finance_accounts;
CREATE TRIGGER algolia_sync_accounts
  AFTER INSERT OR UPDATE OR DELETE ON finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION notify_algolia_sync();

-- Trigger para finance_credit_cards
DROP TRIGGER IF EXISTS algolia_sync_credit_cards ON finance_credit_cards;
CREATE TRIGGER algolia_sync_credit_cards
  AFTER INSERT OR UPDATE OR DELETE ON finance_credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION notify_algolia_sync();

-- Trigger para finance_goals
DROP TRIGGER IF EXISTS algolia_sync_goals ON finance_goals;
CREATE TRIGGER algolia_sync_goals
  AFTER INSERT OR UPDATE OR DELETE ON finance_goals
  FOR EACH ROW
  EXECUTE FUNCTION notify_algolia_sync();

-- Trigger para finance_debts
DROP TRIGGER IF EXISTS algolia_sync_debts ON finance_debts;
CREATE TRIGGER algolia_sync_debts
  AFTER INSERT OR UPDATE OR DELETE ON finance_debts
  FOR EACH ROW
  EXECUTE FUNCTION notify_algolia_sync();

-- Trigger para daytrade_trades
DROP TRIGGER IF EXISTS algolia_sync_daytrades ON daytrade_trades;
CREATE TRIGGER algolia_sync_daytrades
  AFTER INSERT OR UPDATE OR DELETE ON daytrade_trades
  FOR EACH ROW
  EXECUTE FUNCTION notify_algolia_sync();

-- Comentário explicativo
COMMENT ON FUNCTION notify_algolia_sync() IS
'Função que notifica a Edge Function algolia-sync quando há mudanças nas tabelas monitoradas.
Para ativar, configure as variáveis:
  SET app.algolia_webhook_url = ''https://your-project.supabase.co/functions/v1/algolia-sync'';
  SET app.algolia_webhook_secret = ''your-secret'';';
