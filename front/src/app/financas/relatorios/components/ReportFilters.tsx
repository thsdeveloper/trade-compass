'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { ReportPeriod, ReportType } from '@/types/reports';
import { REPORT_PERIOD_LABELS } from '@/types/reports';
import { Calendar } from 'lucide-react';

interface ReportFiltersProps {
  reportType: ReportType;
  period: ReportPeriod;
  onPeriodChange: (period: ReportPeriod) => void;
  includePending: boolean;
  onIncludePendingChange: (value: boolean) => void;
  selectedYears?: number[];
  onYearsChange?: (years: number[]) => void;
  onRefresh?: () => void;
}

const AVAILABLE_YEARS = (() => {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2];
})();

export function ReportFilters({
  reportType,
  period,
  onPeriodChange,
  includePending,
  onIncludePendingChange,
  selectedYears = [],
  onYearsChange,
  onRefresh,
}: ReportFiltersProps) {
  const showPeriodFilter = reportType !== 'yoy-comparison';
  const showYearFilter = reportType === 'yoy-comparison';
  const showPendingFilter = [
    'cash-flow',
    'budget-analysis',
    'category-breakdown',
  ].includes(reportType);

  const handleYearToggle = (year: number) => {
    if (!onYearsChange) return;

    if (selectedYears.includes(year)) {
      if (selectedYears.length > 1) {
        onYearsChange(selectedYears.filter((y) => y !== year));
      }
    } else {
      if (selectedYears.length < 3) {
        onYearsChange([...selectedYears, year].sort((a, b) => b - a));
      }
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {showPeriodFilter && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-slate-400" />
          <Select value={period} onValueChange={(v) => onPeriodChange(v as ReportPeriod)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(REPORT_PERIOD_LABELS) as ReportPeriod[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {REPORT_PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showYearFilter && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Anos:</span>
          <div className="flex gap-1">
            {AVAILABLE_YEARS.map((year) => (
              <Button
                key={year}
                variant={selectedYears.includes(year) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleYearToggle(year)}
                className="px-3"
              >
                {year}
              </Button>
            ))}
          </div>
        </div>
      )}

      {showPendingFilter && (
        <div className="flex items-center gap-2">
          <Switch
            id="include-pending"
            checked={includePending}
            onCheckedChange={onIncludePendingChange}
          />
          <Label htmlFor="include-pending" className="text-sm text-slate-600">
            Incluir pendentes
          </Label>
        </div>
      )}

      {onRefresh && (
        <Button variant="outline" size="sm" onClick={onRefresh}>
          Atualizar
        </Button>
      )}
    </div>
  );
}
