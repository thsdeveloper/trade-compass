export {
  initSearchClient,
  getSearchClient,
  clearSearchClient,
  searchAllIndices,
  searchIndex,
  type MultiIndexSearchResult,
} from './client';

export {
  ALGOLIA_INDICES,
  INDEX_LABELS,
  INDEX_ICONS,
  INDEX_ROUTES,
  type AlgoliaIndexName,
  type AlgoliaRecord,
  type AlgoliaTransaction,
  type AlgoliaAccount,
  type AlgoliaCreditCard,
  type AlgoliaGoal,
  type AlgoliaDebt,
  type AlgoliaDaytrade,
  type SearchResultItem,
} from './indices';
