-- FITID do OFX: id unico da transacao no banco de origem, gravado na
-- importacao de extratos para deduplicacao exata (reimportar o mesmo
-- arquivo/periodo marca as linhas como ja importadas).
alter table finance_transactions
  add column if not exists import_fitid text;

create index if not exists idx_finance_transactions_import_fitid
  on finance_transactions (user_id, import_fitid)
  where import_fitid is not null;
