'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Wallet,
  CreditCard,
  Target,
  TrendingDown,
  CandlestickChart,
  Loader2,
} from 'lucide-react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useGlobalSearch } from '@/contexts/GlobalSearchContext';
import { useAlgoliaSearch } from '@/hooks/useAlgoliaSearch';
import { type AlgoliaIndexName, INDEX_ROUTES } from '@/lib/algolia/indices';

// Mapeamento de índice para ícone
const IndexIcon: Record<string, React.ElementType> = {
  tc_transactions: Receipt,
  tc_accounts: Wallet,
  tc_credit_cards: CreditCard,
  tc_goals: Target,
  tc_debts: TrendingDown,
  tc_daytrades: CandlestickChart,
};

// Formatador de moeda
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

// Helper para extrair valor destacado
function getHighlightedValue(hit: any, field: string): string {
  if (hit._highlightResult?.[field]?.value) {
    return hit._highlightResult[field].value;
  }
  return hit[field] || '';
}

// Componente para renderizar cada tipo de resultado
function SearchResultContent({ index, hit }: { index: string; hit: any }) {
  switch (index) {
    case 'tc_transactions': {
      const description = getHighlightedValue(hit, 'description') || 'Sem descricao';
      return (
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="truncate font-medium"
            dangerouslySetInnerHTML={{ __html: description }}
          />
          <span className="text-xs text-muted-foreground">
            {hit.category_name && <span>{hit.category_name}</span>}
            {hit.account_name && <span> - {hit.account_name}</span>}
          </span>
        </div>
      );
    }

    case 'tc_accounts': {
      const name = getHighlightedValue(hit, 'name');
      return (
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="truncate font-medium"
            dangerouslySetInnerHTML={{ __html: name }}
          />
          <span className="text-xs text-muted-foreground">
            {hit.bank_name && <span>{hit.bank_name} - </span>}
            {hit.type}
          </span>
        </div>
      );
    }

    case 'tc_credit_cards': {
      const name = getHighlightedValue(hit, 'name');
      return (
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="truncate font-medium"
            dangerouslySetInnerHTML={{ __html: name }}
          />
          <span className="text-xs text-muted-foreground">
            {hit.brand && <span>{hit.brand} - </span>}
            Limite: {formatCurrency(hit.limit_amount || 0)}
          </span>
        </div>
      );
    }

    case 'tc_goals': {
      const name = getHighlightedValue(hit, 'name');
      const current = hit.current_amount || 0;
      const target = hit.target_amount || 1;
      const progress = Math.round((current / target) * 100);
      return (
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="truncate font-medium"
            dangerouslySetInnerHTML={{ __html: name }}
          />
          <span className="text-xs text-muted-foreground">
            {progress}% concluido - {formatCurrency(current)} / {formatCurrency(target)}
          </span>
        </div>
      );
    }

    case 'tc_debts': {
      const creditor = getHighlightedValue(hit, 'creditor_name');
      return (
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="truncate font-medium"
            dangerouslySetInnerHTML={{ __html: creditor }}
          />
          <span className="text-xs text-muted-foreground">
            {hit.debt_type} - Saldo: {formatCurrency(hit.current_amount || 0)}
          </span>
        </div>
      );
    }

    case 'tc_daytrades': {
      const asset = getHighlightedValue(hit, 'asset');
      return (
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span
            className="truncate font-medium"
            dangerouslySetInnerHTML={{ __html: asset }}
          />
          <span className="text-xs text-muted-foreground">
            {hit.direction === 'long' ? 'Compra' : 'Venda'} -{' '}
            {hit.result !== undefined && hit.result !== null
              ? formatCurrency(hit.result)
              : 'Em aberto'}
          </span>
        </div>
      );
    }

    default:
      return <span className="truncate">Resultado</span>;
  }
}

export function GlobalSearchCommand() {
  const router = useRouter();
  const { isOpen, closeSearch } = useGlobalSearch();
  const { search, results, isLoading, error, clearResults } = useAlgoliaSearch({
    debounceMs: 200,
    hitsPerPage: 5,
  });

  const [query, setQuery] = useState('');

  // Limpa query quando fecha
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      clearResults();
    }
  }, [isOpen, clearResults]);

  // Handler para mudança de query - chama search diretamente
  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      search(value);
    },
    [search]
  );

  // Navega para o resultado selecionado
  const handleSelect = useCallback(
    (index: string, objectID: string) => {
      const routeFn = INDEX_ROUTES[index as AlgoliaIndexName];
      if (routeFn) {
        const route = routeFn(objectID);
        closeSearch();
        router.push(route);
      }
    },
    [closeSearch, router]
  );

  const hasResults = results?.results && results.results.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeSearch()}>
      <DialogContent
        className="p-0 gap-0 max-w-2xl overflow-hidden"
        showCloseButton={false}
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <Command shouldFilter={false} className="rounded-lg">
          <CommandInput
            placeholder="Buscar transacoes, contas, metas..."
            value={query}
            onValueChange={handleQueryChange}
          />
          <CommandList className="max-h-[400px]">
            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {error && (
              <div className="py-6 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {!isLoading && !error && query && !hasResults && (
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            )}

            {!isLoading && !query && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Digite para buscar em transacoes, contas, cartoes, metas, dividas
                e day trades.
              </div>
            )}

            {!isLoading &&
              hasResults &&
              results.results.map((group) => {
                const Icon = IndexIcon[group.index] || Receipt;

                return (
                  <CommandGroup key={group.index} heading={group.indexLabel}>
                    {group.hits.map((hit) => (
                      <CommandItem
                        key={`${group.index}-${hit.objectID}`}
                        value={`${group.index}-${hit.objectID}`}
                        onSelect={() => handleSelect(group.index, hit.objectID)}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <SearchResultContent index={group.index} hit={hit} />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
          </CommandList>

          {/* Footer com atalho */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              {results?.totalHits
                ? `${results.totalHits} resultados`
                : 'Pressione Esc para fechar'}
            </span>
            <div className="flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                Enter
              </kbd>
              <span>para selecionar</span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
