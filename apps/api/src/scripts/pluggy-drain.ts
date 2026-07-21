import 'dotenv/config';
import { drainPendingWebhookEvents } from '../services/pluggy-webhook-processor.js';

// Entrypoint do cron da Fly: varre os webhooks PENDING que ficaram presos (ex:
// a máquina suspendeu no meio de um processamento). Roda uma vez e sai.
// Sugestão: uma scheduled machine a cada ~2 min.
async function main() {
  await drainPendingWebhookEvents();
  console.log('✓ Dreno de webhooks Pluggy concluído');
}

main().catch((err) => {
  console.error('✗', err instanceof Error ? err.message : err);
  process.exit(1);
});
