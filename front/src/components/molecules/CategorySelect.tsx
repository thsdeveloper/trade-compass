'use client';

import { useState, useCallback } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FinanceCategory, FinanceCategoryType, CategoryFormData } from '@/types/finance';
import { CATEGORY_TYPE_LABELS } from '@/types/finance';

// Cores predefinidas para novas categorias
const PRESET_COLORS = [
  '#64748b', // slate
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
];

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: FinanceCategory[];
  onCreateCategory?: (data: CategoryFormData) => Promise<FinanceCategory>;
  filterTypes?: FinanceCategoryType[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Se true, inclui opcao "Todas" com valor vazio */
  allowAll?: boolean;
}

export function CategorySelect({
  value,
  onChange,
  categories,
  onCreateCategory,
  filterTypes,
  placeholder = 'Selecione uma categoria',
  disabled = false,
  className,
  allowAll = false,
}: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCategory, setNewCategory] = useState<CategoryFormData>({
    name: '',
    type: 'OUTROS',
    color: PRESET_COLORS[0],
    icon: 'tag',
  });

  // Filtrar categorias por tipo se especificado
  const filteredByType = filterTypes
    ? categories.filter((c) => filterTypes.includes(c.type))
    : categories;

  // Filtrar por busca
  const filteredCategories = filteredByType.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedCategory = categories.find((c) => c.id === value);

  const handleSelect = useCallback(
    (categoryId: string) => {
      onChange(categoryId);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleCreateClick = useCallback(() => {
    setNewCategory({
      name: search,
      type: 'OUTROS',
      color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
      icon: 'tag',
    });
    setCreateDialogOpen(true);
  }, [search]);

  const handleCreate = useCallback(async () => {
    if (!onCreateCategory || !newCategory.name.trim()) return;

    setCreating(true);
    try {
      const created = await onCreateCategory(newCategory);
      onChange(created.id);
      setCreateDialogOpen(false);
      setOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
    } finally {
      setCreating(false);
    }
  }, [onCreateCategory, newCategory, onChange]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
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
            {value ? (
              <div className="flex items-center gap-2">
                {selectedCategory && (
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                )}
                <span className="truncate">
                  {selectedCategory?.name || placeholder}
                </span>
              </div>
            ) : (
              <span>{allowAll && !value ? 'Todas as categorias' : placeholder}</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar categoria..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {allowAll && (
                <CommandGroup>
                  <CommandItem
                    value=""
                    onSelect={() => handleSelect('')}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        !value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="text-slate-500">Todas as categorias</span>
                  </CommandItem>
                </CommandGroup>
              )}

              {filteredCategories.length === 0 && !onCreateCategory && (
                <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
              )}

              {filteredCategories.length === 0 && onCreateCategory && (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhuma categoria encontrada.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateClick}
                    className="h-8"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Criar "{search || 'nova categoria'}"
                  </Button>
                </div>
              )}

              {filteredCategories.length > 0 && (
                <CommandGroup>
                  {filteredCategories.map((category) => (
                    <CommandItem
                      key={category.id}
                      value={category.id}
                      onSelect={() => handleSelect(category.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === category.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div
                        className="mr-2 h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="truncate">{category.name}</span>
                      <span className="ml-auto text-xs text-slate-400">
                        {CATEGORY_TYPE_LABELS[category.type]}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {onCreateCategory && filteredCategories.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreateClick}
                      className="cursor-pointer text-slate-600"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Criar nova categoria
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Dialog para criar categoria */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Nova categoria
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Crie uma categoria para organizar suas transacoes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Nome</Label>
              <Input
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                placeholder="Ex: Mercado, Streaming, Uber..."
                className="h-9 text-sm"
                autoFocus
              />
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Tipo</Label>
              <Select
                value={newCategory.type}
                onValueChange={(value) =>
                  setNewCategory({
                    ...newCategory,
                    type: value as FinanceCategoryType,
                  })
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_TYPE_LABELS).map(([type, label]) => (
                    <SelectItem key={type} value={type} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Cor */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCategory({ ...newCategory, color })}
                    className={cn(
                      'h-7 w-7 rounded-md border-2 transition-all',
                      newCategory.color === color
                        ? 'border-slate-900 scale-110'
                        : 'border-transparent hover:scale-105'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
              className="h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreate}
              disabled={creating || !newCategory.name.trim()}
              className="h-8 bg-slate-900 hover:bg-slate-800"
            >
              {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
