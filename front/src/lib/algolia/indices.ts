// Nomes dos índices Algolia (devem corresponder aos do backend)
export const ALGOLIA_INDICES = {
  transactions: 'tc_transactions',
  accounts: 'tc_accounts',
  creditCards: 'tc_credit_cards',
  goals: 'tc_goals',
  debts: 'tc_debts',
  daytrades: 'tc_daytrades',
} as const;

export type AlgoliaIndexName = (typeof ALGOLIA_INDICES)[keyof typeof ALGOLIA_INDICES];

// Tipos dos registros Algolia
export interface AlgoliaTransaction {
  objectID: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'pending' | 'completed' | 'cancelled';
  date: string;
  category_name?: string;
  account_name?: string;
  credit_card_name?: string;
}

export interface AlgoliaAccount {
  objectID: string;
  name: string;
  bank_name?: string;
  type: string;
  balance: number;
}

export interface AlgoliaCreditCard {
  objectID: string;
  name: string;
  brand?: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
}

export interface AlgoliaGoal {
  objectID: string;
  name: string;
  goal_category?: string;
  target_amount: number;
  current_amount: number;
  status: string;
  target_date?: string;
}

export interface AlgoliaDebt {
  objectID: string;
  creditor_name: string;
  debt_type: string;
  original_amount: number;
  current_amount: number;
  status: string;
}

export interface AlgoliaDaytrade {
  objectID: string;
  asset: string;
  direction: 'long' | 'short';
  entry_price: number;
  quantity: number;
  result?: number;
  notes?: string;
  trade_date: string;
}

// Union type para todos os registros
export type AlgoliaRecord =
  | AlgoliaTransaction
  | AlgoliaAccount
  | AlgoliaCreditCard
  | AlgoliaGoal
  | AlgoliaDebt
  | AlgoliaDaytrade;

// Tipo para resultado de busca com metadados
export interface SearchResultItem<T = AlgoliaRecord> {
  index: AlgoliaIndexName;
  indexLabel: string;
  record: T;
  highlightedFields?: Record<string, string>;
}

// Mapeamento de índice para label amigável
export const INDEX_LABELS: Record<AlgoliaIndexName, string> = {
  tc_transactions: 'Transações',
  tc_accounts: 'Contas',
  tc_credit_cards: 'Cartões',
  tc_goals: 'Metas',
  tc_debts: 'Dívidas',
  tc_daytrades: 'Day Trades',
};

// Mapeamento de índice para ícone (usando Lucide icon names)
export const INDEX_ICONS: Record<AlgoliaIndexName, string> = {
  tc_transactions: 'receipt',
  tc_accounts: 'wallet',
  tc_credit_cards: 'credit-card',
  tc_goals: 'target',
  tc_debts: 'trending-down',
  tc_daytrades: 'candlestick-chart',
};

// Mapeamento de índice para rota de navegação
export const INDEX_ROUTES: Record<AlgoliaIndexName, (id: string) => string> = {
  tc_transactions: (id) => `/financas/transacoes?highlight=${id}`,
  tc_accounts: (id) => `/financas/contas?highlight=${id}`,
  tc_credit_cards: (id) => `/financas/cartoes?highlight=${id}`,
  tc_goals: (id) => `/financas/metas?highlight=${id}`,
  tc_debts: (id) => `/financas/dividas?highlight=${id}`,
  tc_daytrades: (id) => `/daytrade?highlight=${id}`,
};
