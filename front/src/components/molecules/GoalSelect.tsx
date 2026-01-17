'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target } from 'lucide-react';
import type { GoalSelectItem } from '@/types/finance';

interface GoalSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
  goals: GoalSelectItem[];
  placeholder?: string;
  disabled?: boolean;
}

export function GoalSelect({
  value,
  onChange,
  goals,
  placeholder = 'Vincular a objetivo (opcional)',
  disabled,
}: GoalSelectProps) {
  return (
    <Select
      value={value || 'none'}
      onValueChange={(val) => onChange(val === 'none' ? undefined : val)}
      disabled={disabled}
    >
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none" className="text-sm text-slate-400">
          Nenhum objetivo
        </SelectItem>
        {goals.map((goal) => (
          <SelectItem key={goal.id} value={goal.id} className="text-sm">
            <div className="flex items-center gap-2">
              <div
                className="flex h-5 w-5 items-center justify-center rounded"
                style={{ backgroundColor: goal.color }}
              >
                <Target className="h-3 w-3 text-white" />
              </div>
              <span>{goal.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
