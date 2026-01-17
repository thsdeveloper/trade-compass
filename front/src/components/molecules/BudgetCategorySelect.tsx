'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BudgetCategory } from '@/types/finance';
import { BUDGET_CATEGORY_LABELS, BUDGET_CATEGORY_COLORS } from '@/types/finance';

interface BudgetCategorySelectProps {
  value: BudgetCategory | null;
  onValueChange: (value: BudgetCategory) => void;
  disabled?: boolean;
}

const BUDGET_CATEGORIES: BudgetCategory[] = ['ESSENCIAL', 'ESTILO_VIDA', 'INVESTIMENTO'];

export function BudgetCategorySelect({
  value,
  onValueChange,
  disabled = false,
}: BudgetCategorySelectProps) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(v) => onValueChange(v as BudgetCategory)}
      disabled={disabled}
    >
      <SelectTrigger className="h-8 w-full border-slate-200 bg-white text-sm">
        <SelectValue placeholder="Selecione o tipo" />
      </SelectTrigger>
      <SelectContent>
        {BUDGET_CATEGORIES.map((cat) => (
          <SelectItem key={cat} value={cat} className="text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: BUDGET_CATEGORY_COLORS[cat] }}
              />
              {BUDGET_CATEGORY_LABELS[cat]}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface BudgetCategoryBadgeProps {
  category: BudgetCategory | null;
  size?: 'sm' | 'md';
}

export function BudgetCategoryBadge({ category, size = 'sm' }: BudgetCategoryBadgeProps) {
  if (!category) {
    return (
      <span className="text-xs text-slate-400">
        -
      </span>
    );
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses}`}
      style={{
        backgroundColor: `${BUDGET_CATEGORY_COLORS[category]}15`,
        color: BUDGET_CATEGORY_COLORS[category],
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: BUDGET_CATEGORY_COLORS[category] }}
      />
      {BUDGET_CATEGORY_LABELS[category]}
    </span>
  );
}
