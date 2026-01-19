import type { FastifyInstance } from 'fastify';
import { categoryRoutes } from './categories.js';
import { accountRoutes } from './accounts.js';
import { creditCardRoutes } from './credit-cards.js';
import { transactionRoutes } from './transactions.js';
import { recurrenceRoutes } from './recurrences.js';
import { dashboardRoutes } from './dashboard.js';
import { debtRoutes } from './debts.js';
import { tagRoutes } from './tags.js';
import { bankRoutes } from './banks.js';
import { goalRoutes } from './goals.js';
import { reportsRoutes } from './reports.js';

export async function financeRoutes(app: FastifyInstance) {
  // Apply auth middleware to all routes in this plugin
  app.addHook('preHandler', async (request, reply) => {
    const { authMiddleware } = await import('../../middleware/auth.js');
    await authMiddleware(request, reply);
  });

  // Register all finance sub-routes
  await categoryRoutes(app);
  await accountRoutes(app);
  await creditCardRoutes(app);
  await transactionRoutes(app);
  await recurrenceRoutes(app);
  await dashboardRoutes(app);
  await debtRoutes(app);
  await tagRoutes(app);
  await bankRoutes(app);
  await goalRoutes(app);
  await reportsRoutes(app);
}
