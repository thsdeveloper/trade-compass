/**
 * Algolia sync utilities for automatic indexing
 * These functions are called when data is created/updated/deleted
 */

import { algoliaAdmin, ALGOLIA_INDICES } from './algolia.js';
import { supabaseAdmin } from './supabase.js';

// Helper to check if Algolia is configured
function isAlgoliaConfigured(): boolean {
  return algoliaAdmin !== null;
}

// ============================================
// TRANSACTIONS
// ============================================

interface TransactionForIndex {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  due_date: string;
  category_id?: string;
  account_id?: string;
  credit_card_id?: string;
}

/**
 * Index a single transaction in Algolia
 * Fetches related data (category, account, card names) before indexing
 */
export async function indexTransaction(transactionId: string, userId: string): Promise<void> {
  if (!isAlgoliaConfigured()) {
    console.warn('Algolia not configured, skipping indexing');
    return;
  }

  try {
    // Fetch transaction with related data
    const { data: transaction, error } = await supabaseAdmin
      .from('finance_transactions')
      .select(`
        id,
        user_id,
        description,
        amount,
        type,
        status,
        due_date,
        finance_categories(name),
        finance_accounts(name),
        finance_credit_cards(name)
      `)
      .eq('id', transactionId)
      .eq('user_id', userId)
      .single();

    if (error || !transaction) {
      console.error('Error fetching transaction for indexing:', error);
      return;
    }

    const record = {
      objectID: transaction.id,
      user_id: transaction.user_id,
      description: transaction.description || '',
      amount: transaction.amount,
      type: transaction.type,
      status: transaction.status,
      date: transaction.due_date,
      category_name: (transaction.finance_categories as any)?.name,
      account_name: (transaction.finance_accounts as any)?.name,
      credit_card_name: (transaction.finance_credit_cards as any)?.name,
    };

    await algoliaAdmin!.saveObjects({
      indexName: ALGOLIA_INDICES.transactions,
      objects: [record],
    });

    console.log(`Indexed transaction ${transactionId} in Algolia`);
  } catch (err) {
    console.error('Error indexing transaction:', err);
  }
}

/**
 * Index multiple transactions in Algolia
 */
export async function indexTransactions(transactionIds: string[], userId: string): Promise<void> {
  if (!isAlgoliaConfigured()) {
    console.warn('Algolia not configured, skipping indexing');
    return;
  }

  try {
    const { data: transactions, error } = await supabaseAdmin
      .from('finance_transactions')
      .select(`
        id,
        user_id,
        description,
        amount,
        type,
        status,
        due_date,
        finance_categories(name),
        finance_accounts(name),
        finance_credit_cards(name)
      `)
      .in('id', transactionIds)
      .eq('user_id', userId);

    if (error || !transactions || transactions.length === 0) {
      console.error('Error fetching transactions for indexing:', error);
      return;
    }

    const records = transactions.map((t: any) => ({
      objectID: t.id,
      user_id: t.user_id,
      description: t.description || '',
      amount: t.amount,
      type: t.type,
      status: t.status,
      date: t.due_date,
      category_name: t.finance_categories?.name,
      account_name: t.finance_accounts?.name,
      credit_card_name: t.finance_credit_cards?.name,
    }));

    await algoliaAdmin!.saveObjects({
      indexName: ALGOLIA_INDICES.transactions,
      objects: records,
    });

    console.log(`Indexed ${records.length} transactions in Algolia`);
  } catch (err) {
    console.error('Error indexing transactions:', err);
  }
}

/**
 * Update a transaction in Algolia (same as index, will upsert)
 */
export async function updateTransactionIndex(transactionId: string, userId: string): Promise<void> {
  return indexTransaction(transactionId, userId);
}

/**
 * Delete a transaction from Algolia index
 */
export async function deleteTransactionFromIndex(transactionId: string): Promise<void> {
  if (!isAlgoliaConfigured()) {
    console.warn('Algolia not configured, skipping delete');
    return;
  }

  try {
    await algoliaAdmin!.deleteObjects({
      indexName: ALGOLIA_INDICES.transactions,
      objectIDs: [transactionId],
    });

    console.log(`Deleted transaction ${transactionId} from Algolia`);
  } catch (err) {
    console.error('Error deleting transaction from index:', err);
  }
}

/**
 * Delete multiple transactions from Algolia index
 */
export async function deleteTransactionsFromIndex(transactionIds: string[]): Promise<void> {
  if (!isAlgoliaConfigured() || transactionIds.length === 0) {
    return;
  }

  try {
    await algoliaAdmin!.deleteObjects({
      indexName: ALGOLIA_INDICES.transactions,
      objectIDs: transactionIds,
    });

    console.log(`Deleted ${transactionIds.length} transactions from Algolia`);
  } catch (err) {
    console.error('Error deleting transactions from index:', err);
  }
}

// ============================================
// ACCOUNTS
// ============================================

export async function indexAccount(accountId: string, userId: string): Promise<void> {
  if (!isAlgoliaConfigured()) return;

  try {
    const { data: account, error } = await supabaseAdmin
      .from('finance_accounts')
      .select(`id, user_id, name, type, current_balance, banks(name)`)
      .eq('id', accountId)
      .eq('user_id', userId)
      .single();

    if (error || !account) return;

    await algoliaAdmin!.saveObjects({
      indexName: ALGOLIA_INDICES.accounts,
      objects: [{
        objectID: account.id,
        user_id: account.user_id,
        name: account.name,
        bank_name: (account.banks as any)?.name,
        type: account.type,
        balance: account.current_balance,
      }],
    });
  } catch (err) {
    console.error('Error indexing account:', err);
  }
}

export async function deleteAccountFromIndex(accountId: string): Promise<void> {
  if (!isAlgoliaConfigured()) return;

  try {
    await algoliaAdmin!.deleteObjects({
      indexName: ALGOLIA_INDICES.accounts,
      objectIDs: [accountId],
    });
  } catch (err) {
    console.error('Error deleting account from index:', err);
  }
}

// ============================================
// CREDIT CARDS
// ============================================

export async function indexCreditCard(cardId: string, userId: string): Promise<void> {
  if (!isAlgoliaConfigured()) return;

  try {
    const { data: card, error } = await supabaseAdmin
      .from('finance_credit_cards')
      .select('id, user_id, name, brand, total_limit, closing_day, due_day')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (error || !card) return;

    await algoliaAdmin!.saveObjects({
      indexName: ALGOLIA_INDICES.creditCards,
      objects: [{
        objectID: card.id,
        user_id: card.user_id,
        name: card.name,
        brand: card.brand,
        limit_amount: card.total_limit,
        closing_day: card.closing_day,
        due_day: card.due_day,
      }],
    });
  } catch (err) {
    console.error('Error indexing credit card:', err);
  }
}

export async function deleteCreditCardFromIndex(cardId: string): Promise<void> {
  if (!isAlgoliaConfigured()) return;

  try {
    await algoliaAdmin!.deleteObjects({
      indexName: ALGOLIA_INDICES.creditCards,
      objectIDs: [cardId],
    });
  } catch (err) {
    console.error('Error deleting credit card from index:', err);
  }
}

// ============================================
// GOALS
// ============================================

export async function indexGoal(goalId: string, userId: string): Promise<void> {
  if (!isAlgoliaConfigured()) return;

  try {
    const { data: goal, error } = await supabaseAdmin
      .from('finance_goals')
      .select(`
        id,
        user_id,
        name,
        goal_category,
        target_amount,
        deadline,
        status,
        finance_goal_contributions(amount)
      `)
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (error || !goal) return;

    const contributions = (goal as any).finance_goal_contributions || [];
    const currentAmount = contributions.reduce(
      (sum: number, c: any) => sum + (Number(c.amount) || 0),
      0
    );

    await algoliaAdmin!.saveObjects({
      indexName: ALGOLIA_INDICES.goals,
      objects: [{
        objectID: goal.id,
        user_id: goal.user_id,
        name: goal.name,
        goal_category: goal.goal_category,
        target_amount: goal.target_amount,
        current_amount: currentAmount,
        status: goal.status,
        target_date: goal.deadline,
      }],
    });
  } catch (err) {
    console.error('Error indexing goal:', err);
  }
}

export async function deleteGoalFromIndex(goalId: string): Promise<void> {
  if (!isAlgoliaConfigured()) return;

  try {
    await algoliaAdmin!.deleteObjects({
      indexName: ALGOLIA_INDICES.goals,
      objectIDs: [goalId],
    });
  } catch (err) {
    console.error('Error deleting goal from index:', err);
  }
}

// ============================================
// DEBTS
// ============================================

export async function indexDebt(debtId: string, userId: string): Promise<void> {
  if (!isAlgoliaConfigured()) return;

  try {
    const { data: debt, error } = await supabaseAdmin
      .from('finance_debts')
      .select('id, user_id, creditor_name, debt_type, original_amount, updated_amount, status')
      .eq('id', debtId)
      .eq('user_id', userId)
      .single();

    if (error || !debt) return;

    await algoliaAdmin!.saveObjects({
      indexName: ALGOLIA_INDICES.debts,
      objects: [{
        objectID: debt.id,
        user_id: debt.user_id,
        creditor_name: debt.creditor_name,
        debt_type: debt.debt_type,
        original_amount: debt.original_amount,
        current_amount: debt.updated_amount,
        status: debt.status,
      }],
    });
  } catch (err) {
    console.error('Error indexing debt:', err);
  }
}

export async function deleteDebtFromIndex(debtId: string): Promise<void> {
  if (!isAlgoliaConfigured()) return;

  try {
    await algoliaAdmin!.deleteObjects({
      indexName: ALGOLIA_INDICES.debts,
      objectIDs: [debtId],
    });
  } catch (err) {
    console.error('Error deleting debt from index:', err);
  }
}
