import { router } from './trpc.js';
import { healthRouter } from './routers/health.js';
import { authRouter } from './routers/auth.js';
import { watchlistRouter } from './routers/watchlist.js';
import { marketRouter } from './routers/market.js';
import { financeRouter } from './routers/finance/index.js';
import { profileRouter } from './routers/profile.js';
import { agentRouter } from './routers/agent.js';
import { algoliaRouter } from './routers/algolia.js';
import { emailRouter } from './routers/email.js';

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  watchlist: watchlistRouter,
  market: marketRouter,
  finance: financeRouter,
  profile: profileRouter,
  agent: agentRouter,
  algolia: algoliaRouter,
  email: emailRouter,
});

export type AppRouter = typeof appRouter;

export { createContext } from './context.js';
