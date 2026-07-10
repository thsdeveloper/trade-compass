'use client';

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { InstantSearch, useSearchBox, useHits } from 'react-instantsearch';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAlgoliaClient } from '@/providers/AlgoliaProvider';
import { ALGOLIA_INDICES } from '@/lib/algolia/indices';

interface TransactionSearchInputProps {
  onResultsChange: (transactionIds: Set<string> | null) => void;
}

// Inner component that uses InstantSearch hooks
function SearchBoxInner({ onResultsChange }: TransactionSearchInputProps) {
  const { query, refine, clear } = useSearchBox();
  const { items } = useHits();
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSearchedRef = useRef(false);

  // Update results when hits change - only if user has actively searched
  useEffect(() => {
    // Only filter by Algolia results if user has typed something
    if (hasSearchedRef.current && inputValue.trim().length >= 2) {
      const ids = new Set(items.map((item) => item.objectID));
      onResultsChange(ids);
    }
  }, [items, inputValue, onResultsChange]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      if (newValue.trim().length >= 2) {
        hasSearchedRef.current = true;
        refine(newValue);
      } else {
        hasSearchedRef.current = false;
        clear();
        onResultsChange(null);
      }
    }, 150);
  }, [refine, clear, onResultsChange]);

  const handleClear = useCallback(() => {
    setInputValue('');
    hasSearchedRef.current = false;
    clear();
    onResultsChange(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, [clear, onResultsChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const isSearching = inputValue.trim().length >= 2 && inputValue !== query;

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input
        type="text"
        placeholder="Buscar por descricao..."
        value={inputValue}
        onChange={handleChange}
        className={cn("h-8 pl-8 pr-8", isSearching && "pr-12")}
      />
      {isSearching && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        </div>
      )}
      {inputValue && !isSearching && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Fallback component when Algolia is not available
function FallbackSearchInput({ onResultsChange }: TransactionSearchInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // No search functionality without Algolia
  }, []);

  const handleClear = useCallback(() => {
    setInputValue('');
    onResultsChange(null);
  }, [onResultsChange]);

  return (
    <div className="relative w-full max-w-xs">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input
        type="text"
        placeholder="Buscar por descricao..."
        value={inputValue}
        onChange={handleChange}
        className="h-8 pl-8 pr-8"
        disabled
      />
      {inputValue && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Main component that wraps with InstantSearch
export const TransactionSearchInput = memo(function TransactionSearchInput({
  onResultsChange,
}: TransactionSearchInputProps) {
  const { searchClient, isLoading } = useAlgoliaClient();

  // Ensure null on mount (no filtering)
  useEffect(() => {
    onResultsChange(null);
  }, []); // Empty deps - only on mount

  if (isLoading) {
    return (
      <div className="relative w-full max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Carregando busca..."
          disabled
          className="h-8 pl-8 pr-8"
        />
      </div>
    );
  }

  if (!searchClient) {
    return <FallbackSearchInput onResultsChange={onResultsChange} />;
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName={ALGOLIA_INDICES.transactions}
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <SearchBoxInner onResultsChange={onResultsChange} />
    </InstantSearch>
  );
});
