/**
 * Supabase Edge Function para sincronizar dados com Algolia
 *
 * Esta função é chamada via webhook dos database triggers
 * quando há INSERT, UPDATE ou DELETE nas tabelas monitoradas.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { algoliasearch } from 'npm:algoliasearch@5';

const ALGOLIA_APP_ID = Deno.env.get('ALGOLIA_APP_ID')!;
const ALGOLIA_ADMIN_KEY = Deno.env.get('ALGOLIA_ADMIN_KEY')!;

const algolia = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);

const ALGOLIA_INDICES = {
  finance_transactions: 'tc_transactions',
  finance_accounts: 'tc_accounts',
  finance_credit_cards: 'tc_credit_cards',
  finance_goals: 'tc_goals',
  finance_debts: 'tc_debts',
  daytrade_trades: 'tc_daytrades',
} as const;

type TableName = keyof typeof ALGOLIA_INDICES;

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

function transformRecord(table: TableName, record: Record<string, unknown>): Record<string, unknown> {
  const base = {
    objectID: record.id as string,
    user_id: record.user_id as string,
  };

  switch (table) {
    case 'finance_transactions':
      return {
        ...base,
        description: record.description || '',
        amount: record.amount,
        type: record.type,
        status: record.status,
        date: record.date,
        // Note: category_name, account_name, credit_card_name
        // need to be fetched separately or passed in the trigger payload
      };

    case 'finance_accounts':
      return {
        ...base,
        name: record.name,
        type: record.type,
        balance: record.balance,
        // bank_name needs to be fetched separately
      };

    case 'finance_credit_cards':
      return {
        ...base,
        name: record.name,
        brand: record.brand,
        limit_amount: record.limit_amount,
        closing_day: record.closing_day,
        due_day: record.due_day,
      };

    case 'finance_goals':
      return {
        ...base,
        name: record.name,
        goal_category: record.goal_category,
        target_amount: record.target_amount,
        current_amount: record.current_amount,
        status: record.status,
        target_date: record.target_date,
      };

    case 'finance_debts':
      return {
        ...base,
        creditor_name: record.creditor_name,
        debt_type: record.debt_type,
        original_amount: record.original_amount,
        current_amount: record.current_amount,
        status: record.status,
      };

    case 'daytrade_trades':
      return {
        ...base,
        asset: record.asset,
        direction: record.direction,
        entry_price: record.entry_price,
        quantity: record.quantity,
        result: record.result,
        notes: record.notes,
        trade_date: record.trade_date,
      };

    default:
      return base;
  }
}

serve(async (req) => {
  // Verificar método
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verificar secret (opcional mas recomendado)
  const authHeader = req.headers.get('Authorization');
  const expectedSecret = Deno.env.get('WEBHOOK_SECRET');
  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload: WebhookPayload = await req.json();
    const { type, table, record, old_record } = payload;

    // Verificar se a tabela é monitorada
    if (!(table in ALGOLIA_INDICES)) {
      return new Response(JSON.stringify({ message: 'Table not indexed' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const indexName = ALGOLIA_INDICES[table as TableName];

    switch (type) {
      case 'INSERT':
      case 'UPDATE':
        if (record) {
          const algoliaRecord = transformRecord(table as TableName, record);
          await algolia.saveObject({
            indexName,
            body: algoliaRecord,
          });
        }
        break;

      case 'DELETE':
        if (old_record?.id) {
          await algolia.deleteObject({
            indexName,
            objectID: old_record.id as string,
          });
        }
        break;
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: type,
        table,
        index: indexName,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
