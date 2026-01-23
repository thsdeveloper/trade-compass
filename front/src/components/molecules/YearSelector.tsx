'use client';

import { cn } from '@/lib/utils';
import { useMemo } from 'react';

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  /** Quantidade de anos para mostrar de cada lado do ano atual */
  range?: number;
  className?: string;
}

export function YearSelector({
  selectedYear,
  onYearChange,
  range = 3,
  className,
}: YearSelectorProps) {
  const currentYear = new Date().getFullYear();

  const years = useMemo(() => {
    const result: number[] = [];
    const startYear = currentYear - range;
    const endYear = currentYear + range;

    for (let year = startYear; year <= endYear; year++) {
      result.push(year);
    }
    return result;
  }, [currentYear, range]);

  return (
    <div className={cn('flex items-center w-full', className)}>
      {years.map((year) => {
        const isSelected = year === selectedYear;
        const isCurrentYear = year === currentYear;

        return (
          <button
            key={year}
            onClick={() => onYearChange(year)}
            className={cn(
              'flex-1 flex h-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
              isSelected
                ? 'bg-slate-900 text-white'
                : isCurrentYear
                  ? 'text-blue-600 hover:bg-slate-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            )}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}
