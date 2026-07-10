'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check, ChevronsUpDown, Building2, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Bank } from '@/types/finance';

interface BankSelectProps {
  value: string;
  onChange: (value: string) => void;
  banks: Bank[];
  popularBanks?: Bank[];
  onSearch?: (query: string) => Promise<Bank[]>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Quando true, mostra apenas empresas de benefícios. Quando false, mostra apenas bancos. */
  showOnlyBenefitProviders?: boolean;
}

function BankLogo({
  bank,
  size = 'sm',
  className,
}: {
  bank: Bank | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
  };

  const iconSizeClasses = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
  };

  const isBenefitProvider = bank?.is_benefit_provider;
  const Icon = isBenefitProvider ? Gift : Building2;

  if (!bank?.logo_url) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded',
          isBenefitProvider ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400',
          sizeClasses[size],
          className
        )}
      >
        <Icon className={iconSizeClasses[size]} />
      </div>
    );
  }

  return (
    <img
      src={bank.logo_url}
      alt={bank.name}
      className={cn('object-contain', sizeClasses[size], className)}
      onError={(e) => {
        e.currentTarget.style.display = 'none';
        e.currentTarget.nextElementSibling?.classList.remove('hidden');
      }}
    />
  );
}

export function BankSelect({
  value,
  onChange,
  banks,
  popularBanks = [],
  onSearch,
  placeholder = 'Selecione um banco',
  disabled = false,
  className,
  showOnlyBenefitProviders,
}: BankSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Bank[]>([]);
  const [searching, setSearching] = useState(false);
  const [cachedSelectedBank, setCachedSelectedBank] = useState<Bank | null>(null);

  // Filtrar bancos baseado no tipo (beneficio ou banco tradicional)
  const filterByProviderType = useCallback((bankList: Bank[]) => {
    if (showOnlyBenefitProviders === undefined) return bankList;
    return bankList.filter((b) => b.is_benefit_provider === showOnlyBenefitProviders);
  }, [showOnlyBenefitProviders]);

  // Buscar bancos quando o usuario digita
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }

    if (onSearch) {
      setSearching(true);
      const timer = setTimeout(async () => {
        try {
          const results = await onSearch(search);
          setSearchResults(filterByProviderType(results));
        } catch (error) {
          console.error('Erro ao buscar bancos:', error);
        } finally {
          setSearching(false);
        }
      }, 300);

      return () => clearTimeout(timer);
    } else {
      // Filtragem local
      const filtered = filterByProviderType(banks).filter(
        (bank) =>
          bank.name.toLowerCase().includes(search.toLowerCase()) ||
          bank.full_name?.toLowerCase().includes(search.toLowerCase()) ||
          bank.code?.toString() === search
      );
      setSearchResults(filtered);
    }
  }, [search, onSearch, banks, filterByProviderType]);

  // Encontrar o banco selecionado em todas as fontes possiveis
  const selectedBank =
    banks.find((b) => b.id === value) ||
    searchResults.find((b) => b.id === value) ||
    popularBanks.find((b) => b.id === value) ||
    (cachedSelectedBank?.id === value ? cachedSelectedBank : null);

  const handleSelect = useCallback(
    (bankId: string, bank?: Bank) => {
      // Cachear o banco selecionado para exibicao futura
      if (bank) {
        setCachedSelectedBank(bank);
      } else {
        // Tentar encontrar o banco nas listas disponiveis
        const foundBank =
          banks.find((b) => b.id === bankId) ||
          searchResults.find((b) => b.id === bankId) ||
          popularBanks.find((b) => b.id === bankId);
        if (foundBank) {
          setCachedSelectedBank(foundBank);
        }
      }
      onChange(bankId);
      setOpen(false);
      setSearch('');
    },
    [onChange, banks, searchResults, popularBanks]
  );

  // Filtrar bancos populares pelo tipo
  const filteredPopularBanks = filterByProviderType(popularBanks);

  // Determinar quais bancos mostrar
  const displayBanks = search.length >= 2 ? searchResults : filteredPopularBanks;
  const showPopularLabel = search.length < 2 && filteredPopularBanks.length > 0;

  // Labels dinamicos baseados no tipo
  const listLabel = showOnlyBenefitProviders ? 'Empresas de beneficios' : 'Bancos populares';
  const searchPlaceholder = showOnlyBenefitProviders
    ? 'Buscar empresa de beneficios...'
    : 'Buscar banco por nome ou codigo...';
  const emptyMessage = showOnlyBenefitProviders
    ? 'Nenhuma empresa encontrada.'
    : 'Nenhum banco encontrado.';
  const searchHint = showOnlyBenefitProviders
    ? 'Digite para buscar entre todas as empresas'
    : 'Digite para buscar entre todos os bancos';

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-9 w-full justify-between text-sm font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value && selectedBank ? (
            <div className="flex items-center gap-2">
              <BankLogo bank={selectedBank} size="xs" />
              <span className="truncate">{selectedBank.name}</span>
              {selectedBank.code && !selectedBank.is_benefit_provider && (
                <span className="text-xs text-slate-400 font-mono">
                  {String(selectedBank.code).padStart(3, '0')}
                </span>
              )}
              {selectedBank.is_benefit_provider && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                  Beneficio
                </span>
              )}
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {search.length >= 2 && displayBanks.length === 0 && !searching && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}

            {search.length >= 2 && searching && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Buscando...
              </div>
            )}

            {search.length < 2 && search.length > 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                Digite pelo menos 2 caracteres para buscar
              </div>
            )}

            {showPopularLabel && (
              <CommandGroup heading={listLabel}>
                {filteredPopularBanks.map((bank) => (
                  <div
                    key={bank.id}
                    onClick={() => handleSelect(bank.id, bank)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                      'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === bank.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <BankLogo bank={bank} size="sm" className="mr-2" />
                    <span className="truncate flex-1">{bank.name}</span>
                    {bank.code && !bank.is_benefit_provider && (
                      <span className="ml-2 text-xs text-slate-400 font-mono">
                        {String(bank.code).padStart(3, '0')}
                      </span>
                    )}
                    {bank.is_benefit_provider && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                        Beneficio
                      </span>
                    )}
                  </div>
                ))}
              </CommandGroup>
            )}

            {search.length >= 2 && displayBanks.length > 0 && (
              <CommandGroup heading="Resultados">
                {displayBanks.map((bank) => (
                  <div
                    key={bank.id}
                    onClick={() => handleSelect(bank.id, bank)}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                      'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === bank.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <BankLogo bank={bank} size="sm" className="mr-2" />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="truncate">{bank.name}</span>
                      {bank.full_name && bank.full_name !== bank.name && (
                        <span className="text-xs text-slate-400 truncate">
                          {bank.full_name}
                        </span>
                      )}
                    </div>
                    {bank.code && !bank.is_benefit_provider && (
                      <span className="ml-2 text-xs text-slate-400 font-mono">
                        {String(bank.code).padStart(3, '0')}
                      </span>
                    )}
                    {bank.is_benefit_provider && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">
                        Beneficio
                      </span>
                    )}
                  </div>
                ))}
              </CommandGroup>
            )}

            {search.length < 2 && filteredPopularBanks.length > 0 && (
              <>
                <CommandSeparator />
                <div className="py-2 px-3 text-xs text-slate-400">
                  {searchHint}
                </div>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export { BankLogo };
