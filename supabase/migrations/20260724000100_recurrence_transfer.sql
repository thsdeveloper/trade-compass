-- Aplicada no projeto remoto via MCP (apply_migration: recurrence_transfer).
--
-- Recorrência de transferência entre contas: a conta de origem continua em
-- account_id; a de destino entra aqui. FK com ON DELETE SET NULL (mesmo padrão
-- de account_id), por isso o CHECK não exige NOT NULL — a obrigatoriedade de
-- origem+destino em recorrências TRANSFERENCIA é garantida pela API; o CHECK
-- cobre apenas os invariantes seguros (sem cartão, contas distintas).
-- O enum finance_transaction_type já inclui TRANSFERENCIA (mesmo enum das
-- transações), então não há constraint de type a relaxar.
alter table finance_recurrences
  add column if not exists destination_account_id uuid references finance_accounts(id) on delete set null;

alter table finance_recurrences
  drop constraint if exists transfer_recurrence_shape;

alter table finance_recurrences
  add constraint transfer_recurrence_shape check (
    type <> 'TRANSFERENCIA'
    or (
      credit_card_id is null
      and (
        destination_account_id is null
        or account_id is null
        or destination_account_id <> account_id
      )
    )
  );
