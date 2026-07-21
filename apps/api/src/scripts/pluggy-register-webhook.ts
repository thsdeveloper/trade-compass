import 'dotenv/config';
import { getPluggyClient, isPluggyConfigured } from '../lib/pluggy.js';

// Registra (ou atualiza) o webhook GLOBAL da Pluggy — uma única URL para todos
// os usuários, com o header secreto estático que a rota /webhooks/pluggy valida
// (a Pluggy não assina com HMAC). Idempotente: rode quantas vezes quiser.
async function main() {
  if (!isPluggyConfigured()) {
    throw new Error('Defina PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET no ambiente.');
  }
  const url = process.env.PLUGGY_WEBHOOK_URL;
  if (!url) {
    throw new Error('Defina PLUGGY_WEBHOOK_URL (ex: https://<app>.fly.dev/webhooks/pluggy).');
  }
  const secret = process.env.PLUGGY_WEBHOOK_SECRET;
  const headers = secret ? { 'X-Webhook-Secret': secret } : undefined;
  if (!secret) {
    console.warn('⚠ PLUGGY_WEBHOOK_SECRET vazio: o webhook ficará sem header secreto.');
  }

  const client = getPluggyClient();
  const { results } = await client.fetchWebhooks();
  const existing = results.find((w) => w.url === url);

  if (existing) {
    await client.updateWebhook(existing.id, { url, event: 'all', headers });
    console.log(`✓ Webhook atualizado (${existing.id}) -> ${url}`);
  } else {
    const created = await client.createWebhook('all', url, headers);
    console.log(`✓ Webhook criado (${created.id}) -> ${url}`);
  }
}

main().catch((err) => {
  console.error('✗', err instanceof Error ? err.message : err);
  process.exit(1);
});
