'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { liteClient, type LiteClient } from 'algoliasearch/lite';
import { trpc } from '@/lib/trpc/client';

interface AlgoliaContextValue {
  searchClient: LiteClient | null;
  isLoading: boolean;
  error: string | null;
}

const AlgoliaContext = createContext<AlgoliaContextValue>({
  searchClient: null,
  isLoading: true,
  error: null,
});

export function useAlgoliaClient() {
  return useContext(AlgoliaContext);
}

interface AlgoliaProviderProps {
  children: ReactNode;
}

export function AlgoliaProvider({ children }: AlgoliaProviderProps) {
  const { data, isLoading, error } = trpc.algolia.getSecuredApiKey.useQuery(undefined, {
    staleTime: 30 * 60 * 1000, // 30 minutes (key is valid for 1 hour)
    refetchInterval: 30 * 60 * 1000, // Refresh every 30 minutes
    retry: 2,
  });

  const appId = data?.appId;
  const securedApiKey = data?.securedApiKey;

  const searchClient = useMemo(() => {
    if (!appId || !securedApiKey) return null;
    return liteClient(appId, securedApiKey);
  }, [appId, securedApiKey]);

  const value = useMemo<AlgoliaContextValue>(() => ({
    searchClient,
    isLoading,
    error: error?.message || null,
  }), [searchClient, isLoading, error]);

  return (
    <AlgoliaContext.Provider value={value}>
      {children}
    </AlgoliaContext.Provider>
  );
}
