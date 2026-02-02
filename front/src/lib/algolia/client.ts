import { liteClient, type LiteClient, type SearchResponse } from 'algoliasearch/lite';
import {
  ALGOLIA_INDICES,
  type AlgoliaIndexName,
  type AlgoliaRecord,
  type SearchResultItem,
  INDEX_LABELS,
} from './indices';

let searchClient: LiteClient | null = null;
let currentAppId: string | null = null;
let currentSearchKey: string | null = null;

// Inicializa ou atualiza o cliente de busca
export function initSearchClient(appId: string, searchKey: string): LiteClient {
  // Só recria se as credenciais mudaram
  if (searchClient && currentAppId === appId && currentSearchKey === searchKey) {
    return searchClient;
  }

  searchClient = liteClient(appId, searchKey);
  currentAppId = appId;
  currentSearchKey = searchKey;

  return searchClient;
}

// Obtém o cliente atual (deve ser inicializado antes)
export function getSearchClient(): LiteClient | null {
  return searchClient;
}

// Limpa o cliente (útil para logout)
export function clearSearchClient(): void {
  searchClient = null;
  currentAppId = null;
  currentSearchKey = null;
}

// Interface para resultado de multi-index search
export interface MultiIndexSearchResult {
  results: SearchResultItem[];
  totalHits: number;
  processingTimeMs: number;
}

// Busca em múltiplos índices simultaneamente
export async function searchAllIndices(
  query: string,
  options: {
    hitsPerPage?: number;
    indices?: AlgoliaIndexName[];
  } = {}
): Promise<MultiIndexSearchResult> {
  const client = getSearchClient();
  if (!client) {
    throw new Error('Search client not initialized. Call initSearchClient first.');
  }

  const { hitsPerPage = 5, indices = Object.values(ALGOLIA_INDICES) } = options;

  // Construir queries para cada índice
  const queries = indices.map((indexName) => ({
    indexName,
    query,
    params: {
      hitsPerPage,
      attributesToHighlight: ['*'],
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
    },
  }));

  const startTime = performance.now();

  // Executar busca multi-índice
  const { results } = await client.search({
    requests: queries,
  });

  const processingTimeMs = performance.now() - startTime;

  // Processar e combinar resultados
  const allResults: SearchResultItem[] = [];
  let totalHits = 0;

  for (let i = 0; i < results.length; i++) {
    const result = results[i] as SearchResponse<AlgoliaRecord>;
    const indexName = indices[i];

    if (result.hits) {
      totalHits += result.nbHits || result.hits.length;

      for (const hit of result.hits) {
        // Extrair highlighted fields
        const highlightedFields: Record<string, string> = {};
        if ((hit as any)._highlightResult) {
          for (const [key, value] of Object.entries((hit as any)._highlightResult)) {
            if (typeof value === 'object' && value !== null && 'value' in value) {
              highlightedFields[key] = (value as { value: string }).value;
            }
          }
        }

        // Remover campos internos do Algolia
        const { _highlightResult, _snippetResult, _rankingInfo, ...record } = hit as any;

        allResults.push({
          index: indexName,
          indexLabel: INDEX_LABELS[indexName],
          record: record as AlgoliaRecord,
          highlightedFields,
        });
      }
    }
  }

  return {
    results: allResults,
    totalHits,
    processingTimeMs,
  };
}

// Busca em um índice específico
export async function searchIndex<T extends AlgoliaRecord>(
  indexName: AlgoliaIndexName,
  query: string,
  options: {
    hitsPerPage?: number;
    page?: number;
    filters?: string;
  } = {}
): Promise<{ hits: T[]; totalHits: number; page: number; totalPages: number }> {
  const client = getSearchClient();
  if (!client) {
    throw new Error('Search client not initialized');
  }

  const { hitsPerPage = 20, page = 0, filters } = options;

  // Use o método search com uma única query
  const { results } = await client.search<T>({
    requests: [
      {
        indexName,
        query,
        hitsPerPage,
        page,
        filters,
        attributesToHighlight: ['*'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      },
    ],
  });

  const result = results[0] as SearchResponse<T>;

  return {
    hits: result.hits || [],
    totalHits: result.nbHits || 0,
    page: result.page || 0,
    totalPages: result.nbPages || 0,
  };
}
