'use client';

import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CategorySelect } from '@/components/molecules/CategorySelect';
import { AccountSelect } from '@/components/molecules/AccountSelect';
import { Badge } from '@/components/ui/badge';
import type {
  FinanceCategory,
  FinanceTag,
  AccountWithBank,
  TransactionStatus,
  TransactionType,
} from '@/types/finance';

interface TransactionFiltersSheetProps {
  // Filter values
  searchTerm: string;
  typeFilter: TransactionType | 'all';
  statusFilter: TransactionStatus | 'all';
  categoryFilter: string;
  tagFilter: string;
  accountFilter: string;
  urgentFilter: boolean;
  groupCardTransactions: boolean;

  // Filter setters
  onSearchChange: (value: string) => void;
  onTypeChange: (value: TransactionType | 'all') => void;
  onStatusChange: (value: TransactionStatus | 'all') => void;
  onCategoryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onUrgentChange: (value: boolean) => void;
  onGroupCardTransactionsChange: (value: boolean) => void;
  onClearFilters: () => void;

  // Data for selects
  categories: FinanceCategory[];
  tags: FinanceTag[];
  accounts: AccountWithBank[];

  // State
  hasActiveFilters: boolean;
  activeFiltersCount: number;
}

export function TransactionFiltersSheet({
  searchTerm,
  typeFilter,
  statusFilter,
  categoryFilter,
  tagFilter,
  accountFilter,
  urgentFilter,
  groupCardTransactions,
  onSearchChange,
  onTypeChange,
  onStatusChange,
  onCategoryChange,
  onTagChange,
  onAccountChange,
  onUrgentChange,
  onGroupCardTransactionsChange,
  onClearFilters,
  categories,
  tags,
  accounts,
  hasActiveFilters,
  activeFiltersCount,
}: TransactionFiltersSheetProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-slate-900 text-white"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[340px] sm:w-[400px]">
        <SheetHeader className="border-b border-slate-200 pb-4">
          <SheetTitle>Filtros</SheetTitle>
          <SheetDescription>
            Filtre as transacoes por diferentes criterios
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 py-4 overflow-y-auto flex-1">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-slate-700">
              Buscar
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por descricao..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-9 pl-8 pr-8"
              />
              {searchTerm && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Type Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Tipo</Label>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="DESPESA">Despesa</SelectItem>
                <SelectItem value="RECEITA">Receita</SelectItem>
                <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Status</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="PAGO">Pago</SelectItem>
                <SelectItem value="VENCIDO">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Categoria</Label>
            <CategorySelect
              value={categoryFilter === 'all' ? '' : categoryFilter}
              onChange={(value) => onCategoryChange(value || 'all')}
              categories={categories}
              allowAll
              placeholder="Todas as categorias"
              className="h-9"
            />
          </div>

          {/* Tag Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Tag</Label>
            <Select value={tagFilter} onValueChange={onTagChange}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione uma tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tags</SelectItem>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-slate-700">Conta</Label>
            <AccountSelect
              value={accountFilter}
              onChange={onAccountChange}
              accounts={accounts}
              allowAll
              placeholder="Todas as contas"
            />
          </div>

          {/* Urgent Filter */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="urgent-filter" className="text-sm font-medium text-slate-700 cursor-pointer">
                Transacoes urgentes
              </Label>
              <p className="text-xs text-slate-500">
                Mostrar apenas vencidas ou proximas do vencimento
              </p>
            </div>
            <Switch
              id="urgent-filter"
              checked={urgentFilter}
              onCheckedChange={onUrgentChange}
            />
          </div>

          {/* Group Card Transactions */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="group-cards" className="text-sm font-medium text-slate-700 cursor-pointer">
                Agrupar faturas de cartao
              </Label>
              <p className="text-xs text-slate-500">
                Agrupar transacoes de cartao por fatura
              </p>
            </div>
            <Switch
              id="group-cards"
              checked={groupCardTransactions}
              onCheckedChange={onGroupCardTransactionsChange}
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <SheetFooter className="border-t border-slate-200">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="w-full gap-2"
            >
              <X className="h-4 w-4" />
              Limpar filtros
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
