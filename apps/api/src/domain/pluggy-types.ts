// Tipos das linhas das tabelas de vinculo da Pluggy (pluggy_items / pluggy_accounts)
// e das views expostas ao mobile. Os tipos das ENTIDADES da Pluggy (Item, Account,
// Transaction, Connector) vem da propria SDK (`pluggy-sdk`) e sao usados direto no
// service de sync — nao os reexportamos aqui para nao duplicar.

export interface PluggyItemRow {
  id: string;
  user_id: string;
  pluggy_item_id: string;
  connector_id: number | null;
  connector_name: string | null;
  connector_image_url: string | null;
  status: string | null;
  execution_status: string | null;
  consent_expires_at: string | null;
  last_synced_at: string | null;
  pluggy_created_at: string | null;
  pluggy_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PluggyAccountRow {
  id: string;
  user_id: string;
  pluggy_item_id: string;
  pluggy_account_id: string;
  pluggy_type: string | null;
  pluggy_subtype: string | null;
  finance_account_id: string | null;
  finance_credit_card_id: string | null;
  last_balance: number | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

// Dados que gravamos numa conexao (upsert por pluggy_item_id).
export interface UpsertPluggyItemInput {
  user_id: string;
  pluggy_item_id: string;
  connector_id: number | null;
  connector_name: string | null;
  connector_image_url: string | null;
  status: string | null;
  execution_status: string | null;
  consent_expires_at: string | null;
  pluggy_created_at: string | null;
  pluggy_updated_at: string | null;
}

// Dados que gravamos no vinculo de uma conta (upsert por pluggy_account_id).
export interface UpsertPluggyAccountInput {
  user_id: string;
  pluggy_item_id: string;
  pluggy_account_id: string;
  pluggy_type: string | null;
  pluggy_subtype: string | null;
  finance_account_id: string | null;
  finance_credit_card_id: string | null;
  last_balance: number | null;
}

export interface PluggyWebhookEventRow {
  event_id: string;
  event: string;
  item_id: string | null;
  account_id: string | null;
  client_user_id: string | null;
  payload: Record<string, unknown> | null;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'ERROR';
  attempts: number;
  received_at: string;
  processed_at: string | null;
  error: string | null;
}

// Conexao como exposta ao mobile (lista "bancos conectados").
export interface PluggyConnectionView {
  id: string;
  pluggy_item_id: string;
  connector_name: string | null;
  connector_image_url: string | null;
  status: string | null;
  last_synced_at: string | null;
  consent_expires_at: string | null;
  accounts_count: number;
}

// Resultado do backfill sincrono (POST /finance/pluggy/items).
export interface PluggySyncResult {
  accounts_created: number;
  credit_cards_created: number;
  transactions_created: number;
}
