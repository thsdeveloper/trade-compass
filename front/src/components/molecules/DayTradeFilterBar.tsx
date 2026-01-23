'use client';

import { useState, useMemo } from 'react';
import { ptBR } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  X,
  TrendingUp,
  TrendingDown,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getDayTradeDateRange, formatDateRangeDisplay } from '@/lib/date-utils';
import type {
  DayTradeFilters,
  DayTradeDatePreset,
  FuturesAsset,
  ResultFilter,
  DirectionFilter,
  PlanAdherenceFilter,
} from '@/types/daytrade';
import {
  DAYTRADE_DATE_PRESETS,
  RESULT_FILTER_OPTIONS,
  DIRECTION_FILTER_OPTIONS,
  PLAN_ADHERENCE_OPTIONS,
  DEFAULT_DAYTRADE_FILTERS,
} from '@/types/daytrade';
import type { DateRange } from 'react-day-picker';

interface DayTradeFilterBarProps {
  filters: DayTradeFilters;
  onFiltersChange: (filters: DayTradeFilters) => void;
}

// Quick presets for the pill buttons (most common ones)
const QUICK_PRESETS: DayTradeDatePreset[] = [
  'today',
  'yesterday',
  '7d',
  '15d',
  '30d',
  'this_month',
];

export function DayTradeFilterBar({
  filters,
  onFiltersChange,
}: DayTradeFilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Calculate the date range for display
  const dateRange = useMemo(() => {
    return getDayTradeDateRange(filters.datePreset, filters.customDateRange);
  }, [filters.datePreset, filters.customDateRange]);

  // Count active filters (excluding date which is always set)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.asset !== 'all') count++;
    if (filters.result !== 'all') count++;
    if (filters.direction !== 'all') count++;
    if (filters.planAdherence !== 'all') count++;
    return count;
  }, [filters]);

  const handlePresetClick = (preset: DayTradeDatePreset) => {
    onFiltersChange({
      ...filters,
      datePreset: preset,
      customDateRange: undefined,
    });
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onFiltersChange({
        ...filters,
        datePreset: 'custom',
        customDateRange: { from: range.from, to: range.to },
      });
      setCalendarOpen(false);
    } else if (range?.from) {
      // Single date selected, use same date for both
      onFiltersChange({
        ...filters,
        datePreset: 'custom',
        customDateRange: { from: range.from, to: range.from },
      });
    }
  };

  const handleAssetChange = (value: string) => {
    onFiltersChange({
      ...filters,
      asset: value as FuturesAsset | 'all',
    });
  };

  const handleResultChange = (value: ResultFilter) => {
    onFiltersChange({
      ...filters,
      result: value,
    });
  };

  const handleDirectionChange = (value: DirectionFilter) => {
    onFiltersChange({
      ...filters,
      direction: value,
    });
  };

  const handlePlanAdherenceChange = (value: string) => {
    onFiltersChange({
      ...filters,
      planAdherence: value as PlanAdherenceFilter,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange(DEFAULT_DAYTRADE_FILTERS);
    setShowAdvanced(false);
  };

  const isDefaultFilters =
    filters.asset === 'all' &&
    filters.result === 'all' &&
    filters.direction === 'all' &&
    filters.planAdherence === 'all' &&
    filters.datePreset === 'today';

  return (
    <div className="space-y-3">
      {/* Primary Filter Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Quick Date Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_PRESETS.map((preset) => (
            <Button
              key={preset}
              variant={filters.datePreset === preset ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 text-[12px]"
              onClick={() => handlePresetClick(preset)}
            >
              {DAYTRADE_DATE_PRESETS.find((p) => p.key === preset)?.label}
            </Button>
          ))}

          {/* More presets dropdown */}
          <Select
            value={
              !QUICK_PRESETS.includes(filters.datePreset) &&
              filters.datePreset !== 'custom'
                ? filters.datePreset
                : ''
            }
            onValueChange={(value) =>
              handlePresetClick(value as DayTradeDatePreset)
            }
          >
            <SelectTrigger
              className={cn(
                'h-7 w-[100px] text-[12px]',
                !QUICK_PRESETS.includes(filters.datePreset) &&
                  filters.datePreset !== 'custom'
                  ? 'bg-primary text-primary-foreground'
                  : ''
              )}
            >
              <SelectValue placeholder="Mais..." />
            </SelectTrigger>
            <SelectContent>
              {DAYTRADE_DATE_PRESETS.filter(
                (p) => !QUICK_PRESETS.includes(p.key)
              ).map((preset) => (
                <SelectItem key={preset.key} value={preset.key}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Date Range */}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant={filters.datePreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-[12px]"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Personalizado
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={
                  filters.customDateRange
                    ? {
                        from: filters.customDateRange.from,
                        to: filters.customDateRange.to,
                      }
                    : undefined
                }
                onSelect={handleCustomDateChange}
                locale={ptBR}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-border" />

        {/* Asset Filter */}
        <div className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2 py-1">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            Ativo
          </span>
          <Select value={filters.asset} onValueChange={handleAssetChange}>
            <SelectTrigger className="h-6 w-[90px] border-0 bg-transparent px-1.5 text-[12px] focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="WINFUT">WINFUT</SelectItem>
              <SelectItem value="WDOFUT">WDOFUT</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters Toggle */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2.5 text-[12px]"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-4 min-w-4 px-1 text-[10px]"
            >
              {activeFilterCount}
            </Badge>
          )}
          {showAdvanced ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Clear Filters */}
        {!isDefaultFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[12px] text-muted-foreground hover:text-foreground"
            onClick={handleClearFilters}
          >
            <X className="h-3.5 w-3.5" />
            Limpar
          </Button>
        )}
      </div>

      {/* Date Range Display */}
      <div className="text-[11px] text-muted-foreground">
        Periodo: {formatDateRangeDisplay(dateRange)}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="rounded-lg border bg-card/50 p-3">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Result Filter */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Resultado
              </span>
              <div className="flex gap-1.5">
                {RESULT_FILTER_OPTIONS.map((option) => (
                  <Button
                    key={option.key}
                    variant={filters.result === option.key ? 'default' : 'outline'}
                    size="sm"
                    className={cn(
                      'h-7 flex-1 gap-1 px-2 text-[12px]',
                      option.key === 'positive' &&
                        filters.result === option.key &&
                        'bg-emerald-600 hover:bg-emerald-700',
                      option.key === 'negative' &&
                        filters.result === option.key &&
                        'bg-red-600 hover:bg-red-700'
                    )}
                    onClick={() => handleResultChange(option.key)}
                  >
                    {option.key === 'positive' && (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {option.key === 'negative' && (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Direction Filter */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Direcao
              </span>
              <div className="flex gap-1.5">
                {DIRECTION_FILTER_OPTIONS.map((option) => (
                  <Button
                    key={option.key}
                    variant={
                      filters.direction === option.key ? 'default' : 'outline'
                    }
                    size="sm"
                    className={cn(
                      'h-7 flex-1 gap-1 px-2 text-[12px]',
                      option.key === 'BUY' &&
                        filters.direction === option.key &&
                        'bg-emerald-600 hover:bg-emerald-700',
                      option.key === 'SELL' &&
                        filters.direction === option.key &&
                        'bg-red-600 hover:bg-red-700'
                    )}
                    onClick={() => handleDirectionChange(option.key)}
                  >
                    {option.key === 'BUY' && (
                      <ChevronUp className="h-3 w-3" />
                    )}
                    {option.key === 'SELL' && (
                      <ChevronDown className="h-3 w-3" />
                    )}
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Plan Adherence Filter */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                Plano
              </span>
              <Select
                value={filters.planAdherence}
                onValueChange={handlePlanAdherenceChange}
              >
                <SelectTrigger className="h-7 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_ADHERENCE_OPTIONS.map((option) => (
                    <SelectItem key={option.key} value={option.key}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
