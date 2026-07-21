import { PluggyClient } from 'pluggy-sdk';

// Cliente Pluggy singleton. A SDK troca PLUGGY_CLIENT_ID/SECRET por uma API key
// (JWT ~2h) no primeiro request e a renova sozinha quando o `exp` passa — logo
// basta instanciar UMA vez e reusar (espelha o padrao do supabaseAdmin).
// clientId/clientSecret e a API key NUNCA saem do servidor; o mobile so recebe
// o connectToken curto emitido pela rota /finance/pluggy/connect-token.
let client: PluggyClient | null = null;

export function isPluggyConfigured(): boolean {
  return Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET);
}

export function getPluggyClient(): PluggyClient {
  if (!client) {
    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error(
        'Pluggy nao configurado. Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET.'
      );
    }
    client = new PluggyClient({ clientId, clientSecret });
  }
  return client;
}
