'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import type { ReportType, ReportDateFilter, DatePreset } from '@/types/reports';
import { DATE_PRESET_CONFIG } from '@/types/reports';
import {
  createDateFilter,
  formatDateRangeDisplay,
  getDurationLabel,
  getAvailableYears,
} from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface ReportFiltersProps {
  reportType: ReportType;
  dateFilter: ReportDateFilter;
  onDateFilterChange: (filter: ReportDateFilter) => void;
  includePending: boolean;
  onIncludePendingChange: (value: boolean) => void;
  selectedYears?: number[];
  onYearsChange?: (years: number[]) => void;
  onRefresh?: () => void;
}

const AVAILABLE_YEARS = getAvailableYears();

export function ReportFilters({
  reportType,
  dateFilter,
  onDateFilterChange,
  includePending,
  onIncludePendingChange,
  selectedYears = [],
  onYearsChange,
  onRefresh,
}: ReportFiltersProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(() => ({
    from: dateFilter.dateRange.from,
    to: dateFilter.dateRange.to,
  }));

  const showDateFilter = reportType !== 'yoy-comparison';
  const showYearFilter = reportType === 'yoy-comparison';
  const showPendingFilter = [
    'cash-flow',
    'budget-analysis',
    'category-breakdown',
    'payment-methods',
  ].includes(reportType);

  const handlePresetClick = (preset: DatePreset) => {
    onDateFilterChange(createDateFilter(preset));
  };

  const handleYearClick = (year: number) => {
    onDateFilterChange(createDateFilter('custom', undefined, year));
  };

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

  const handleCustomDateApply = () => {
    if (tempRange?.from && tempRange?.to) {
      const customRange = { from: tempRange.from, to: tempRange.to };
      onDateFilterChange(createDateFilter('custom', customRange));
      setCalendarOpen(false);
    }
  };

  const isPresetActive = (preset: DatePreset) => {
    return dateFilter.preset === preset && dateFilter.customYear === undefined;
  };

  const isYearActive = (year: number) => {
    return dateFilter.customYear === year;
  };

  return (
    <div className="space-y-3">
      {showDateFilter && (
        <>
          {/* Preset Buttons Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Presets */}
            {DATE_PRESET_CONFIG.map((preset) => (
              <Button
                key={preset.key}
                variant={isPresetActive(preset.key) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePresetClick(preset.key)}
                className="h-8 px-3 text-xs"
              >
                {preset.short}
              </Button>
            ))}

            {/* Year Buttons */}
            {AVAILABLE_YEARS.map((year) => (
              <Button
                key={year}
                variant={isYearActive(year) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleYearClick(year)}
                className="h-8 px-3 text-xs"
              >
                {year}
              </Button>
            ))}

            {/* Custom Date Range Popover */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={dateFilter.preset === 'custom' && dateFilter.customYear === undefined ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 gap-2 px-3 text-xs"
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Personalizado
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={tempRange?.from}
                  selected={tempRange}
                  onSelect={setTempRange}
                  numberOfMonths={2}
                  locale={{
                    localize: {
                      day: (n: number) => ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][n],
                      month: (n: number) =>
                        [
                          'Janeiro',
                          'Fevereiro',
                          'Marco',
                          'Abril',
                          'Maio',
                          'Junho',
                          'Julho',
                          'Agosto',
                          'Setembro',
                          'Outubro',
                          'Novembro',
                          'Dezembro',
                        ][n],
                      ordinalNumber: (n: number) => `${n}`,
                      era: (n: number) => (n === 0 ? 'AC' : 'DC'),
                      quarter: (n: number) => `${n + 1}o trimestre`,
                      dayPeriod: (period: string) => period,
                    },
                    formatLong: {
                      date: () => 'dd/MM/yyyy',
                      time: () => 'HH:mm',
                      dateTime: () => 'dd/MM/yyyy HH:mm',
                    },
                    options: {
                      weekStartsOn: 0,
                      firstWeekContainsDate: 1,
                    },
                    match: {
                      ordinalNumber: () => ({ value: 1, rest: '' }),
                      era: () => ({ value: 1, rest: '' }),
                      quarter: () => ({ value: 1, rest: '' }),
                      month: () => ({ value: 1, rest: '' }),
                      day: () => ({ value: 1, rest: '' }),
                      dayPeriod: () => ({ value: 'am' as const, rest: '' }),
                    },
                  }}
                />
                <div className="flex items-center justify-end gap-2 border-t p-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCalendarOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCustomDateApply}
                    disabled={!tempRange?.from || !tempRange?.to}
                  >
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filter Display Row */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CalendarIcon className="h-4 w-4 text-slate-400" />
              <span>{formatDateRangeDisplay(dateFilter.dateRange)}</span>
              <span className="text-slate-400">
                ({getDurationLabel(dateFilter.dateRange)})
              </span>
            </div>

            {showPendingFilter && (
              <div className="flex items-center gap-2">
                <Switch
                  id="include-pending"
                  checked={includePending}
                  onCheckedChange={onIncludePendingChange}
                />
                <Label
                  htmlFor="include-pending"
                  className="text-sm text-slate-600"
                >
                  Incluir pendentes
                </Label>
              </div>
            )}

            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="h-8 gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar
              </Button>
            )}
          </div>
        </>
      )}

      {showYearFilter && (
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Anos:</span>
            <div className="flex gap-1">
              {AVAILABLE_YEARS.map((year) => (
                <Button
                  key={year}
                  variant={selectedYears.includes(year) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleYearToggle(year)}
                  className="h-8 px-3"
                >
                  {year}
                </Button>
              ))}
            </div>
          </div>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Atualizar
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
