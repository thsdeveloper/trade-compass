/**
 * Script para sincronizar dados existentes do Supabase com o Algolia
 * Execute com: npx tsx src/scripts/algolia-initial-sync.ts
 */

import 'dotenv/config';
import { supabaseAdmin } from '../lib/supabase.js';
import { algoliaAdmin, ALGOLIA_INDICES } from '../lib/algolia.js';

const BATCH_SIZE = 1000;

// Tipos para os objetos que serão enviados ao Algolia (com index signature)
interface AlgoliaObject {
  objectID: string;
  [key: string]: unknown;
}

async function syncTransactions() {
  console.log('\nSincronizando transações...');

  const { data: transactions, error } = await supabaseAdmin
    .from('finance_transactions')
    .select(
      `
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
    `
    )
    .order('id');

  if (error) {
    console.error('Erro ao buscar transações:', error);
    return 0;
  }

  if (!transactions || transactions.length === 0) {
    console.log('  Nenhuma transação encontrada');
    return 0;
  }

  const records: AlgoliaObject[] = transactions.map((t: any) => ({
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

  // Indexar em batches
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    await algoliaAdmin!.saveObjects({
      indexName: ALGOLIA_INDICES.transactions,
      objects: batch,
    });
    console.log(`  Indexados ${Math.min(i + BATCH_SIZE, records.length)}/${records.length}`);
  }

  return records.length;
}

async function syncAccounts() {
  console.log('\nSincronizando contas...');

  const { data: accounts, error } = await supabaseAdmin
    .from('finance_accounts')
    .select(
      `
      id,
      user_id,
      name,
      type,
      current_balance,
      banks(name)
    `
    )
    .order('id');

  if (error) {
    console.error('Erro ao buscar contas:', error);
    return 0;
  }

  if (!accounts || accounts.length === 0) {
    console.log('  Nenhuma conta encontrada');
    return 0;
  }

  const records: AlgoliaObject[] = accounts.map((a: any) => ({
    objectID: a.id,
    user_id: a.user_id,
    name: a.name,
    bank_name: a.banks?.name,
    type: a.type,
    balance: a.current_balance,
  }));

  await algoliaAdmin!.saveObjects({
    indexName: ALGOLIA_INDICES.accounts,
    objects: records,
  });

  console.log(`  ✓ ${records.length} contas indexadas`);
  return records.length;
}

async function syncCreditCards() {
  console.log('\nSincronizando cartões de crédito...');

  const { data: cards, error } = await supabaseAdmin
    .from('finance_credit_cards')
    .select('id, user_id, name, brand, total_limit, closing_day, due_day')
    .order('id');

  if (error) {
    console.error('Erro ao buscar cartões:', error);
    return 0;
  }

  if (!cards || cards.length === 0) {
    console.log('  Nenhum cartão encontrado');
    return 0;
  }

  const records: AlgoliaObject[] = cards.map((c: any) => ({
    objectID: c.id,
    user_id: c.user_id,
    name: c.name,
    brand: c.brand,
    limit_amount: c.total_limit,
    closing_day: c.closing_day,
    due_day: c.due_day,
  }));

  await algoliaAdmin!.saveObjects({
    indexName: ALGOLIA_INDICES.creditCards,
    objects: records,
  });

  console.log(`  ✓ ${records.length} cartões indexados`);
  return records.length;
}

async function syncGoals() {
  console.log('\nSincronizando metas...');

  // Buscar metas com soma das contribuições
  const { data: goals, error } = await supabaseAdmin
    .from('finance_goals')
    .select(
      `
      id,
      user_id,
      name,
      goal_category,
      target_amount,
      deadline,
      status,
      finance_goal_contributions(amount)
    `
    )
    .order('id');

  if (error) {
    console.error('Erro ao buscar metas:', error);
    return 0;
  }

  if (!goals || goals.length === 0) {
    console.log('  Nenhuma meta encontrada');
    return 0;
  }

  const records: AlgoliaObject[] = goals.map((g: any) => {
    // Calcular current_amount somando as contribuições
    const contributions = g.finance_goal_contributions || [];
    const currentAmount = contributions.reduce(
      (sum: number, c: any) => sum + (Number(c.amount) || 0),
      0
    );

    return {
      objectID: g.id,
      user_id: g.user_id,
      name: g.name,
      goal_category: g.goal_category,
      target_amount: g.target_amount,
      current_amount: currentAmount,
      status: g.status,
      target_date: g.deadline,
    };
  });

  await algoliaAdmin!.saveObjects({
    indexName: ALGOLIA_INDICES.goals,
    objects: records,
  });

  console.log(`  ✓ ${records.length} metas indexadas`);
  return records.length;
}

async function syncDebts() {
  console.log('\nSincronizando dívidas...');

  const { data: debts, error } = await supabaseAdmin
    .from('finance_debts')
    .select('id, user_id, creditor_name, debt_type, original_amount, updated_amount, status')
    .order('id');

  if (error) {
    console.error('Erro ao buscar dívidas:', error);
    return 0;
  }

  if (!debts || debts.length === 0) {
    console.log('  Nenhuma dívida encontrada');
    return 0;
  }

  const records: AlgoliaObject[] = debts.map((d: any) => ({
    objectID: d.id,
    user_id: d.user_id,
    creditor_name: d.creditor_name,
    debt_type: d.debt_type,
    original_amount: d.original_amount,
    current_amount: d.updated_amount,
    status: d.status,
  }));

  await algoliaAdmin!.saveObjects({
    indexName: ALGOLIA_INDICES.debts,
    objects: records,
  });

  console.log(`  ✓ ${records.length} dívidas indexadas`);
  return records.length;
}

async function syncDaytrades() {
  console.log('\nSincronizando day trades...');

  const { data: trades, error } = await supabaseAdmin
    .from('daytrade_trades')
    .select('id, user_id, asset, direction, entry_price, contracts, result, notes, entry_time')
    .order('id');

  if (error) {
    console.error('Erro ao buscar day trades:', error);
    return 0;
  }

  if (!trades || trades.length === 0) {
    console.log('  Nenhum day trade encontrado');
    return 0;
  }

  const records: AlgoliaObject[] = trades.map((t: any) => ({
    objectID: t.id,
    user_id: t.user_id,
    asset: t.asset,
    direction: t.direction,
    entry_price: t.entry_price,
    quantity: t.contracts,
    result: t.result,
    notes: t.notes,
    trade_date: t.entry_time,
  }));

  await algoliaAdmin!.saveObjects({
    indexName: ALGOLIA_INDICES.daytrades,
    objects: records,
  });

  console.log(`  ✓ ${records.length} day trades indexados`);
  return records.length;
}

async function main() {
  if (!algoliaAdmin) {
    console.error('Algolia admin client não está configurado.');
    console.error('Verifique se ALGOLIA_APP_ID e ALGOLIA_ADMIN_KEY estão definidos.');
    process.exit(1);
  }

  console.log('='.repeat(50));
  console.log('Iniciando sincronização inicial com Algolia');
  console.log('='.repeat(50));

  const results = {
    transactions: await syncTransactions(),
    accounts: await syncAccounts(),
    creditCards: await syncCreditCards(),
    goals: await syncGoals(),
    debts: await syncDebts(),
    daytrades: await syncDaytrades(),
  };

  console.log('\n' + '='.repeat(50));
  console.log('Resumo da sincronização:');
  console.log('='.repeat(50));
  console.log(`  Transações: ${results.transactions}`);
  console.log(`  Contas: ${results.accounts}`);
  console.log(`  Cartões: ${results.creditCards}`);
  console.log(`  Metas: ${results.goals}`);
  console.log(`  Dívidas: ${results.debts}`);
  console.log(`  Day Trades: ${results.daytrades}`);
  console.log('='.repeat(50));
  console.log(
    `Total: ${Object.values(results).reduce((a, b) => a + b, 0)} registros sincronizados`
  );
  console.log('\n✅ Sincronização concluída!');
}

main().catch((error) => {
  console.error('Erro na sincronização:', error);
  process.exit(1);
});
