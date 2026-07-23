import { useCallback, useEffect, useRef, useState } from 'react';
import { getTransactions } from '@/lib/finance-api';
import { useFinance } from '@/contexts/FinanceContext';
import type { TransactionWithDetails } from '@/types/finance';

const PAGE_SIZE = 30;
const SEARCH_DEBOUNCE_MS = 300;

export type FeedTypeFilter = 'ALL' | 'RECEITA' | 'DESPESA';

/** Filtros avançados aplicados pela folha de filtros da tela de transações. */
export interface FeedAdvancedFilters {
  category_id?: string;
  /** Lista de categorias separadas por vírgula; o backend aplica OR entre elas. */
  category_ids?: string;
  account_id?: string;
  credit_card_id?: string;
  /** 'card' = só compras de cartão; 'account' = só lançamentos em conta */
  source?: 'account' | 'card';
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface FeedFilters {
  type: FeedTypeFilter;
  search: string;
  advanced: FeedAdvancedFilters;
}

type FetchMode = 'initial' | 'more' | 'refresh';

/**
 * Feed paginado de transações, ordenado por data (mais recentes primeiro).
 *
 * Busca e filtro de tipo rodam no servidor — com muitos registros, carregar
 * tudo para filtrar no cliente não escala. Cada mudança de filtro reinicia a
 * paginação; o scroll carrega páginas de PAGE_SIZE sob demanda.
 */
export function useTransactionsFeed() {
  const { dataVersion } = useFinance();
  const [items, setItems] = useState<TransactionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FeedFilters>({
    type: 'ALL',
    search: '',
    advanced: {},
  });

  const offsetRef = useRef(0);
  const requestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchPage = useCallback(
    async (offset: number, currentFilters: FeedFilters, mode: FetchMode) => {
      const requestId = ++requestIdRef.current;
      inFlightRef.current = true;

      if (mode === 'initial') setIsLoading(true);
      if (mode === 'more') setIsLoadingMore(true);
      if (mode === 'refresh') setIsRefreshing(true);

      try {
        const page = await getTransactions({
          limit: PAGE_SIZE,
          offset,
          ...(currentFilters.type !== 'ALL' ? { type: currentFilters.type } : {}),
          ...(currentFilters.search.trim()
            ? { search: currentFilters.search.trim() }
            : {}),
          ...currentFilters.advanced,
        });

        // Resposta obsoleta (outro filtro/refresh disparou depois): descarta
        if (requestId !== requestIdRef.current) return;

        // Dedup por id: um registro criado entre uma página e outra desloca
        // os offsets no servidor e a página seguinte pode repetir itens.
        setItems((prev) => {
          if (offset === 0) return page;
          const seen = new Set(prev.map((t) => t.id));
          return [...prev, ...page.filter((t) => !seen.has(t.id))];
        });
        offsetRef.current = offset + page.length;
        setHasMore(page.length === PAGE_SIZE);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar transações'
        );
      } finally {
        if (requestId === requestIdRef.current) {
          inFlightRef.current = false;
          setIsLoading(false);
          setIsLoadingMore(false);
          setIsRefreshing(false);
        }
      }
    },
    []
  );

  // Primeira carga e mudanças de filtro (busca com debounce)
  useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchPage(0, filters, 'initial');
      },
      filters.search ? SEARCH_DEBOUNCE_MS : 0
    );
    return () => clearTimeout(timer);
  }, [filters, fetchPage]);

  // Mutação de transação em qualquer tela (criar, transferir, recorrência)
  // incrementa dataVersion no FinanceContext — recarrega a primeira página
  // para o feed refletir sem pull-to-refresh.
  const lastVersionRef = useRef(0);
  useEffect(() => {
    if (dataVersion === lastVersionRef.current) return;
    lastVersionRef.current = dataVersion;
    fetchPage(0, filtersRef.current, 'refresh');
  }, [dataVersion, fetchPage]);

  const loadMore = useCallback(() => {
    if (inFlightRef.current || !hasMore) return;
    fetchPage(offsetRef.current, filtersRef.current, 'more');
  }, [hasMore, fetchPage]);

  const refresh = useCallback(() => {
    fetchPage(0, filtersRef.current, 'refresh');
  }, [fetchPage]);

  const setTypeFilter = useCallback((type: FeedTypeFilter) => {
    setFilters((prev) => ({ ...prev, type }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setAdvancedFilters = useCallback((advanced: FeedAdvancedFilters) => {
    setFilters((prev) => ({ ...prev, advanced }));
  }, []);

  // Remoção otimista (ex.: exclusão em massa). Ajusta o offset para a próxima
  // página não pular registros que "subiram" no servidor após a exclusão.
  const removeItems = useCallback((ids: string[]) => {
    const toRemove = new Set(ids);
    setItems((prev) => {
      const next = prev.filter((t) => !toRemove.has(t.id));
      offsetRef.current = Math.max(0, offsetRef.current - (prev.length - next.length));
      return next;
    });
  }, []);

  return {
    items,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    typeFilter: filters.type,
    search: filters.search,
    advancedFilters: filters.advanced,
    loadMore,
    refresh,
    setTypeFilter,
    setSearch,
    setAdvancedFilters,
    removeItems,
  };
}
