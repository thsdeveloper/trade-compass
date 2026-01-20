'use client';

import { useState, useCallback } from 'react';
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
  const [creating, setCreating] = useState(false);

  // Garantir que tags e value nunca sejam undefined
  const safeTags = tags || [];
  const safeValue = value || [];

  // Tags selecionadas
  const selectedTags = safeTags.filter((tag) => safeValue.includes(tag.id));

  // Tags disponiveis (nao selecionadas)
  const availableTags = safeTags.filter((tag) => !safeValue.includes(tag.id));

  const handleSelect = useCallback(
    (currentValue: string) => {
      // Encontrar tag pelo nome (cmdk passa o value em lowercase)
      const tag = availableTags.find(
        (t) => t.name.toLowerCase() === currentValue.toLowerCase()
      );
      if (tag && safeValue.length < maxTags) {
        onChange([...safeValue, tag.id]);
      }
    },
    [availableTags, safeValue, onChange, maxTags]
  );

  const handleRemove = useCallback(
    (tagId: string) => {
      onChange(safeValue.filter((id) => id !== tagId));
    },
    [safeValue, onChange]
  );

  const handleCreateClick = useCallback(async () => {
    if (!onCreateTag) return;

    const tagName = prompt('Nome da nova tag:');
    if (!tagName?.trim()) return;

    // Verifica se tag já existe
    const exists = safeTags.some(
      (t) => t.name.toLowerCase() === tagName.toLowerCase().trim()
    );
    if (exists) {
      alert('Tag já existe!');
      return;
    }

    setCreating(true);
    try {
      const newTag = await onCreateTag({ name: tagName.trim() });
      onChange([...safeValue, newTag.id]);
      setOpen(false);
    } catch (error) {
      console.error('Erro ao criar tag:', error);
    } finally {
      setCreating(false);
    }
  }, [onCreateTag, safeTags, safeValue, onChange]);

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
      <Popover open={open} onOpenChange={setOpen} modal={true}>
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
          <Command>
            <CommandInput placeholder="Buscar tag..." />
            <CommandList>
              <CommandEmpty>
                {onCreateTag ? (
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground mb-3">
                      Nenhuma tag encontrada.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCreateClick}
                      disabled={creating}
                      className="h-8"
                    >
                      {creating ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Criar nova tag
                    </Button>
                  </div>
                ) : (
                  'Nenhuma tag encontrada.'
                )}
              </CommandEmpty>

              {availableTags.length > 0 && (
                <CommandGroup>
                  {availableTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.name}
                      onSelect={handleSelect}
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

              {onCreateTag && availableTags.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      value="__criar_nova_tag__"
                      onSelect={handleCreateClick}
                      className="cursor-pointer text-slate-600"
                    >
                      {creating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Criar nova tag
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
