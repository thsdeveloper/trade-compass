'use client';

import { useState, useCallback, useRef } from 'react';
import { X, Plus, Loader2, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
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
import type { FinanceTag, TagFormData } from '@/types/finance';

const TAG_COLOR = '#6366f1';

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  tags: FinanceTag[];
  onCreateTag?: (data: TagFormData) => Promise<FinanceTag>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxTags?: number;
}

export function TagInput({
  value,
  onChange,
  tags,
  onCreateTag,
  placeholder = 'Adicionar tags...',
  disabled = false,
  className,
  maxTags = 10,
}: TagInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Garantir que tags e value nunca sejam undefined
  const safeTags = tags || [];
  const safeValue = value || [];

  // Tags selecionadas
  const selectedTags = safeTags.filter((tag) => safeValue.includes(tag.id));

  // Tags disponiveis (nao selecionadas e que correspondem a busca)
  const availableTags = safeTags.filter(
    (tag) =>
      !safeValue.includes(tag.id) &&
      tag.name.toLowerCase().includes(search.toLowerCase())
  );

  // Verifica se busca corresponde exatamente a uma tag existente
  const exactMatch = safeTags.some(
    (tag) => tag.name.toLowerCase() === search.toLowerCase().trim()
  );

  const handleSelect = useCallback(
    (tagId: string) => {
      if (safeValue.length < maxTags) {
        onChange([...safeValue, tagId]);
      }
      setSearch('');
    },
    [safeValue, onChange, maxTags]
  );

  const handleRemove = useCallback(
    (tagId: string) => {
      onChange(safeValue.filter((id) => id !== tagId));
    },
    [safeValue, onChange]
  );

  const handleCreate = useCallback(async () => {
    if (!onCreateTag || !search.trim() || exactMatch) return;

    setCreating(true);
    try {
      const newTag = await onCreateTag({ name: search.trim() });
      onChange([...safeValue, newTag.id]);
      setSearch('');
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    } finally {
      setCreating(false);
    }
  }, [onCreateTag, search, exactMatch, safeValue, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !search && safeValue.length > 0) {
        handleRemove(safeValue[safeValue.length - 1]);
      }
      if (e.key === 'Enter' && search && !exactMatch && onCreateTag) {
        e.preventDefault();
        handleCreate();
      }
    },
    [search, safeValue, exactMatch, onCreateTag, handleRemove, handleCreate]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {/* Tags selecionadas */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="h-6 gap-1 pl-2 pr-1 text-xs font-medium"
              style={{
                backgroundColor: `${TAG_COLOR}15`,
                borderColor: `${TAG_COLOR}30`,
                color: TAG_COLOR,
              }}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemove(tag.id)}
                disabled={disabled}
                className={cn(
                  'ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Seletor de tags */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || safeValue.length >= maxTags}
            className={cn(
              'h-9 w-full justify-start text-sm font-normal',
              'text-muted-foreground hover:text-foreground'
            )}
          >
            <Tag className="mr-2 h-3.5 w-3.5" />
            {safeValue.length >= maxTags ? 'Limite de tags atingido' : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              ref={inputRef}
              placeholder="Buscar ou criar tag..."
              value={search}
              onValueChange={setSearch}
              onKeyDown={handleKeyDown}
            />
            <CommandList>
              {/* Sem tags e sem busca - mostrar instrução */}
              {availableTags.length === 0 && !search && !onCreateTag && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma tag disponivel
                </div>
              )}

              {/* Sem tags disponíveis, sem busca, mas pode criar */}
              {availableTags.length === 0 && !search && onCreateTag && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Digite para criar uma nova tag
                </div>
              )}

              {/* Busca sem resultados - mostrar botão de criar */}
              {availableTags.length === 0 && search && !exactMatch && onCreateTag && (
                <div className="py-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreate}
                    disabled={creating}
                    className="h-8"
                  >
                    {creating ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Criar tag "{search}"
                  </Button>
                </div>
              )}

              {availableTags.length === 0 && search && exactMatch && (
                <CommandEmpty>Tag ja selecionada</CommandEmpty>
              )}

              {availableTags.length > 0 && (
                <CommandGroup>
                  {availableTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => handleSelect(tag.id)}
                      className="cursor-pointer"
                    >
                      <div
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: TAG_COLOR }}
                      />
                      <span className="truncate">{tag.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {onCreateTag && availableTags.length > 0 && search && !exactMatch && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreate}
                      className="cursor-pointer text-slate-600"
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Criar tag "{search}"
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
