'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { AlgoliaIndexName } from '@/lib/algolia/indices';

interface SearchHit {
  objectID: string;
  [key: string]: unknown;
  _highlightResult?: Record<string, { value: string }>;
}

interface SearchResultGroup {
  index: string;
  indexLabel: string;
  hits: SearchHit[];
  nbHits: number;
}

export interface SearchResults {
  results: SearchResultGroup[];
  totalHits: number;
}

interface UseAlgoliaSearchOptions {
  debounceMs?: number;
  hitsPerPage?: number;
  indices?: AlgoliaIndexName[];
}

interface UseAlgoliaSearchReturn {
  search: (query: string) => void;
  results: SearchResults | null;
  isLoading: boolean;
  error: string | null;
  clearResults: () => void;
}

export function useAlgoliaSearch(
  options: UseAlgoliaSearchOptions = {}
): UseAlgoliaSearchReturn {
  const { debounceMs = 300, hitsPerPage = 5, indices } = options;

  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastQueryRef = useRef<string>('');

  // Mutation para busca
  const searchMutation = trpc.algolia.search.useMutation();

  // Função de busca principal - estável (não muda entre renders)
  const search = useCallback(
    (query: string) => {
      // Evita buscar a mesma query novamente
      if (query === lastQueryRef.current && results !== null) {
        return;
      }

      // Limpa timer anterior
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Se query vazia, limpa resultados
      if (!query.trim()) {
        lastQueryRef.current = '';
        setResults(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      // Debounce a busca
      debounceTimerRef.current = setTimeout(async () => {
        lastQueryRef.current = query;

        try {
          const data = await searchMutation.mutateAsync({
            query: query.trim(),
            hitsPerPage,
            indices,
          });
          setResults(data);
          setError(null);
        } catch (err) {
          console.error('Search error:', err);
          setError('Erro ao realizar busca');
          setResults(null);
        } finally {
          setIsLoading(false);
        }
      }, debounceMs);
    },
    [debounceMs, hitsPerPage, indices] // Removido searchMutation e results das deps
  );

  // Limpa resultados
  const clearResults = useCallback(() => {
    lastQueryRef.current = '';
    setResults(null);
    setError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    search,
    results,
    isLoading,
    error,
    clearResults,
  };
}
