import { router } from '../../trpc.js';
import { accountsRouter } from './accounts.js';
import { categoriesRouter } from './categories.js';
import { banksRouter } from './banks.js';
import { tagsRouter } from './tags.js';
import { creditCardsRouter } from './credit-cards.js';
import { transactionsRouter } from './transactions.js';
import { recurrencesRouter } from './recurrences.js';
import { dashboardRouter } from './dashboard.js';
import { debtsRouter } from './debts.js';
import { goalsRouter } from './goals.js';
import { fixedIncomeRouter } from './fixed-income.js';
import { mortgagesRouter } from './mortgages.js';
import { reportsRouter } from './reports.js';

export const financeRouter = router({
  accounts: accountsRouter,
  categories: categoriesRouter,
  banks: banksRouter,
  tags: tagsRouter,
  creditCards: creditCardsRouter,
  transactions: transactionsRouter,
  recurrences: recurrencesRouter,
  dashboard: dashboardRouter,
  debts: debtsRouter,
  goals: goalsRouter,
  fixedIncome: fixedIncomeRouter,
  mortgages: mortgagesRouter,
  reports: reportsRouter,
});
