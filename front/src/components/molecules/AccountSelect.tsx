'use client';

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { AccountWithBank } from '@/types/finance';

interface AccountSelectProps {
  value: string;
  onChange: (value: string) => void;
  accounts: AccountWithBank[];
  placeholder?: string;
  disabled?: boolean;
  allowAll?: boolean;
  className?: string;
}

function AccountLogo({
  account,
  size = 'sm',
}: {
  account: AccountWithBank | null;
  size?: 'xs' | 'sm';
}) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-5 w-5',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3 w-3',
  };

  if (account?.bank?.logo_url) {
    return (
      <img
        src={account.bank.logo_url}
        alt={account.bank.name}
        className={cn('object-contain rounded', sizeClasses[size])}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded',
        sizeClasses[size]
      )}
      style={{ backgroundColor: account?.color || '#64748b' }}
    >
      <Wallet className={cn('text-white', iconSizes[size])} />
    </div>
  );
}

export function AccountSelect({
  value,
  onChange,
  accounts,
  placeholder = 'Selecione uma conta',
  disabled = false,
  allowAll = false,
  className,
}: AccountSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAccount = useMemo(() => {
    if (value === 'all' || !value) return null;
    return accounts.find((a) => a.id === value) || null;
  }, [value, accounts]);

  const filteredAccounts = useMemo(() => {
    if (!search) return accounts;
    const searchLower = search.toLowerCase();
    return accounts.filter(
      (account) =>
        account.name.toLowerCase().includes(searchLower) ||
        account.bank?.name.toLowerCase().includes(searchLower)
    );
  }, [accounts, search]);

  const handleSelect = (accountId: string) => {
    onChange(accountId);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-8 w-[180px] justify-between text-sm font-normal border-slate-200 bg-white',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value === 'all' || !value ? (
            <span className="text-slate-600">
              {allowAll ? 'Todas contas' : placeholder}
            </span>
          ) : selectedAccount ? (
            <div className="flex items-center gap-2">
              <AccountLogo account={selectedAccount} size="xs" />
              <span className="truncate">{selectedAccount.name}</span>
            </div>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar conta..."
            value={search}
            onValueChange={setSearch}
            className="h-9"
          />
          <CommandList>
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup>
              {allowAll && (
                <CommandItem
                  value="all"
                  onSelect={() => handleSelect('all')}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === 'all' ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <Wallet className="mr-2 h-4 w-4 text-slate-400" />
                  <span>Todas contas</span>
                </CommandItem>
              )}
              {filteredAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.id}
                  onSelect={() => handleSelect(account.id)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === account.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <AccountLogo account={account} size="sm" />
                  <div className="ml-2 flex flex-col">
                    <span className="truncate">{account.name}</span>
                    {account.bank && (
                      <span className="text-xs text-slate-400 truncate">
                        {account.bank.name}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
