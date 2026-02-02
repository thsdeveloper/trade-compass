/**
 * Script para configurar os índices do Algolia
 * Execute com: npx tsx src/scripts/algolia-configure.ts
 */

import 'dotenv/config';
import { algoliaAdmin, ALGOLIA_INDICES } from '../lib/algolia.js';

async function configureIndices() {
  if (!algoliaAdmin) {
    console.error('Algolia admin client não está configurado.');
    console.error('Verifique se ALGOLIA_APP_ID e ALGOLIA_ADMIN_KEY estão definidos.');
    process.exit(1);
  }

  console.log('Configurando índices do Algolia...\n');

  // Configuração do índice de transações
  console.log(`Configurando ${ALGOLIA_INDICES.transactions}...`);
  await algoliaAdmin.setSettings({
    indexName: ALGOLIA_INDICES.transactions,
    indexSettings: {
      searchableAttributes: ['description', 'category_name', 'account_name', 'credit_card_name'],
      attributesForFaceting: ['filterOnly(user_id)', 'type', 'status'],
      customRanking: ['desc(date)'],
      attributesToRetrieve: [
        'objectID',
        'description',
        'amount',
        'type',
        'status',
        'date',
        'category_name',
        'account_name',
        'credit_card_name',
      ],
    },
  });
  console.log(`  ✓ ${ALGOLIA_INDICES.transactions} configurado`);

  // Configuração do índice de contas
  console.log(`Configurando ${ALGOLIA_INDICES.accounts}...`);
  await algoliaAdmin.setSettings({
    indexName: ALGOLIA_INDICES.accounts,
    indexSettings: {
      searchableAttributes: ['name', 'bank_name', 'type'],
      attributesForFaceting: ['filterOnly(user_id)', 'type'],
      attributesToRetrieve: ['objectID', 'name', 'bank_name', 'type', 'balance'],
    },
  });
  console.log(`  ✓ ${ALGOLIA_INDICES.accounts} configurado`);

  // Configuração do índice de cartões de crédito
  console.log(`Configurando ${ALGOLIA_INDICES.creditCards}...`);
  await algoliaAdmin.setSettings({
    indexName: ALGOLIA_INDICES.creditCards,
    indexSettings: {
      searchableAttributes: ['name', 'brand'],
      attributesForFaceting: ['filterOnly(user_id)', 'brand'],
      attributesToRetrieve: ['objectID', 'name', 'brand', 'limit_amount', 'closing_day', 'due_day'],
    },
  });
  console.log(`  ✓ ${ALGOLIA_INDICES.creditCards} configurado`);

  // Configuração do índice de metas
  console.log(`Configurando ${ALGOLIA_INDICES.goals}...`);
  await algoliaAdmin.setSettings({
    indexName: ALGOLIA_INDICES.goals,
    indexSettings: {
      searchableAttributes: ['name', 'goal_category'],
      attributesForFaceting: ['filterOnly(user_id)', 'status'],
      attributesToRetrieve: [
        'objectID',
        'name',
        'goal_category',
        'target_amount',
        'current_amount',
        'status',
        'target_date',
      ],
    },
  });
  console.log(`  ✓ ${ALGOLIA_INDICES.goals} configurado`);

  // Configuração do índice de dívidas
  console.log(`Configurando ${ALGOLIA_INDICES.debts}...`);
  await algoliaAdmin.setSettings({
    indexName: ALGOLIA_INDICES.debts,
    indexSettings: {
      searchableAttributes: ['creditor_name', 'debt_type'],
      attributesForFaceting: ['filterOnly(user_id)', 'status'],
      attributesToRetrieve: [
        'objectID',
        'creditor_name',
        'debt_type',
        'original_amount',
        'current_amount',
        'status',
      ],
    },
  });
  console.log(`  ✓ ${ALGOLIA_INDICES.debts} configurado`);

  // Configuração do índice de day trades
  console.log(`Configurando ${ALGOLIA_INDICES.daytrades}...`);
  await algoliaAdmin.setSettings({
    indexName: ALGOLIA_INDICES.daytrades,
    indexSettings: {
      searchableAttributes: ['asset', 'notes'],
      attributesForFaceting: ['filterOnly(user_id)', 'asset', 'direction'],
      customRanking: ['desc(trade_date)'],
      attributesToRetrieve: [
        'objectID',
        'asset',
        'direction',
        'entry_price',
        'quantity',
        'result',
        'notes',
        'trade_date',
      ],
    },
  });
  console.log(`  ✓ ${ALGOLIA_INDICES.daytrades} configurado`);

  console.log('\n✅ Todos os índices foram configurados com sucesso!');
}

configureIndices().catch((error) => {
  console.error('Erro ao configurar índices:', error);
  process.exit(1);
});
