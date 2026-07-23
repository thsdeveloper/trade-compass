import 'dotenv/config';
import { runDailyDueReminders } from '../services/daily-reminder-service.js';

// Entrypoint do cron da Fla: envia o lembrete diário de vencimentos aos usuários
// cuja hora local já chegou. Roda uma vez e sai.
// Sugestão: uma scheduled machine de hora em hora (--schedule hourly).
async function main() {
  const summary = await runDailyDueReminders(new Date());
  console.log(
    `✓ Lembretes diários: ${summary.sent} enviados, ${summary.skippedNoItems} sem itens/sem e-mail, ` +
      `${summary.failed} falhas (${summary.due} elegíveis desta hora / ${summary.candidates} habilitados)`
  );
  // Sinaliza falha ao orquestrador se algum envio falhou (será retentado na próxima hora).
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('✗', err instanceof Error ? err.message : err);
  process.exit(1);
});
