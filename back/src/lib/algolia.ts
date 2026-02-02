import { algoliasearch, type SearchClient } from 'algoliasearch';
import { createHmac } from 'crypto';

const appId = process.env.ALGOLIA_APP_ID;
const adminKey = process.env.ALGOLIA_ADMIN_KEY;
const searchOnlyKey = process.env.ALGOLIA_SEARCH_ONLY_KEY;

if (!appId) {
  console.warn('ALGOLIA_APP_ID not set - Algolia features will be disabled');
}

// Admin client for indexing operations (server-side only)
export const algoliaAdmin: SearchClient | null =
  appId && adminKey ? algoliasearch(appId, adminKey) : null;

// Index names
export const ALGOLIA_INDICES = {
  transactions: 'tc_transactions',
  accounts: 'tc_accounts',
  creditCards: 'tc_credit_cards',
  goals: 'tc_goals',
  debts: 'tc_debts',
  daytrades: 'tc_daytrades',
} as const;

export type AlgoliaIndexName = (typeof ALGOLIA_INDICES)[keyof typeof ALGOLIA_INDICES];

// Generate a secured API key for a specific user
// This key has the user_id filter embedded, so the user can only search their own data
// Implementation based on Algolia's algorithm for secured API keys
export function generateSecuredApiKey(userId: string): string | null {
  if (!searchOnlyKey) {
    console.warn('ALGOLIA_SEARCH_ONLY_KEY not set');
    return null;
  }

  // Build the restrictions as query parameters (NOT URL-encoded for the hash)
  // Use single quotes for the value - Algolia's filter syntax
  const validUntil = Math.floor(Date.now() / 1000) + 3600; // 1 hour TTL
  const restrictions = `filters=user_id:'${userId}'&validUntil=${validUntil}`;

  // Create HMAC-SHA256 hash of the restrictions using the search-only API key
  const hash = createHmac('sha256', searchOnlyKey).update(restrictions).digest('hex');

  // Combine hash and restrictions, then base64 encode
  const securedKey = Buffer.from(hash + restrictions).toString('base64');

  return securedKey;
}

// Types for Algolia records
export interface AlgoliaTransaction {
  objectID: string;
  user_id: string;
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
  user_id: string;
  name: string;
  bank_name?: string;
  type: string;
  balance: number;
}

export interface AlgoliaCreditCard {
  objectID: string;
  user_id: string;
  name: string;
  brand?: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
}

export interface AlgoliaGoal {
  objectID: string;
  user_id: string;
  name: string;
  goal_category?: string;
  target_amount: number;
  current_amount: number;
  status: string;
  target_date?: string;
}

export interface AlgoliaDebt {
  objectID: string;
  user_id: string;
  creditor_name: string;
  debt_type: string;
  original_amount: number;
  current_amount: number;
  status: string;
}

export interface AlgoliaDaytrade {
  objectID: string;
  user_id: string;
  asset: string;
  direction: 'long' | 'short';
  entry_price: number;
  quantity: number;
  result?: number;
  notes?: string;
  trade_date: string;
}

export type AlgoliaRecord =
  | AlgoliaTransaction
  | AlgoliaAccount
  | AlgoliaCreditCard
  | AlgoliaGoal
  | AlgoliaDebt
  | AlgoliaDaytrade;
