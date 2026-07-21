import { supabase } from './supabase';
import { API_URL } from './api-config';

// Cliente das rotas /finance/pluggy/*. Mesmo padrao de autenticacao do
// finance-api.ts (Bearer com o access_token do Supabase). O mobile NUNCA vê o
// clientId/secret nem a API key da Pluggy — só o connectToken curto.
async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Nao autenticado');
  }
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  };
}

/** Emite o connectToken para abrir o widget. Passa item_id só na reconexão. */
export async function createPluggyConnectToken(itemId?: string): Promise<string> {
  const res = await fetch(`${API_URL}/finance/pluggy/connect-token`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(itemId ? { item_id: itemId } : {}),
  });
  if (!res.ok) {
    throw new Error('Nao foi possivel iniciar a conexao com o banco');
  }
  const json = (await res.json()) as { accessToken: string };
  return json.accessToken;
}

export interface PluggyRegisterResult {
  accounts_created: number;
  credit_cards_created: number;
  transactions_created: number;
}

/** Registra o Item conectado e dispara o backfill (contas + transações). */
export async function registerPluggyItem(itemId: string): Promise<PluggyRegisterResult> {
  const res = await fetch(`${API_URL}/finance/pluggy/items`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ item_id: itemId }),
  });
  if (!res.ok) {
    throw new Error('Nao foi possivel importar os dados do banco');
  }
  return (await res.json()) as PluggyRegisterResult;
}

export interface PluggyConnection {
  id: string;
  pluggy_item_id: string;
  connector_name: string | null;
  connector_image_url: string | null;
  status: string | null;
  last_synced_at: string | null;
  consent_expires_at: string | null;
  accounts_count: number;
}

export async function listPluggyConnections(): Promise<PluggyConnection[]> {
  const res = await fetch(`${API_URL}/finance/pluggy/items`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    return [];
  }
  return (await res.json()) as PluggyConnection[];
}

/** Desconecta o banco (revoga o consentimento na Pluggy; mantém o histórico). */
export async function disconnectPluggyItem(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/finance/pluggy/items/${id}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    throw new Error('Nao foi possivel desconectar o banco');
  }
}
