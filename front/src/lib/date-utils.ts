import type { DatePreset, DateRange, ReportDateFilter } from '@/types/reports';
import type { DayTradeDatePreset } from '@/types/daytrade';

/**
 * Calculates a date range from a preset
 */
export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { from: today, to: today };

    case '1w': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }

    case '2w': {
      const from = new Date(today);
      from.setDate(from.getDate() - 14);
      return { from, to: today };
    }

    case '1m': {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 1);
      from.setDate(from.getDate() + 1);
      return { from, to: today };
    }

    case '3m': {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 3);
      from.setDate(from.getDate() + 1);
      return { from, to: today };
    }

    case '6m': {
      const from = new Date(today);
      from.setMonth(from.getMonth() - 6);
      from.setDate(from.getDate() + 1);
      return { from, to: today };
    }

    case '12m': {
      const from = new Date(today);
      from.setFullYear(from.getFullYear() - 1);
      from.setDate(from.getDate() + 1);
      return { from, to: today };
    }

    case 'ytd': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: today };
    }

    case 'current_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from, to };
    }

    case 'custom':
    default:
      return { from: today, to: today };
  }
}

/**
 * Gets a date range for a full year
 */
export function getDateRangeFromYear(year: number): DateRange {
  const from = new Date(year, 0, 1);
  const to = new Date(year, 11, 31);
  return { from, to };
}

/**
 * Formats a date to YYYY-MM-DD string
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Factory function to create a date filter
 */
export function createDateFilter(
  preset: DatePreset,
  customRange?: DateRange,
  customYear?: number
): ReportDateFilter {
  let dateRange: DateRange;

  if (customYear !== undefined) {
    dateRange = getDateRangeFromYear(customYear);
  } else if (preset === 'custom' && customRange) {
    dateRange = customRange;
  } else {
    dateRange = getDateRangeFromPreset(preset);
  }

  return {
    preset: customYear !== undefined ? null : preset,
    customYear,
    dateRange,
    startDate: formatDateToISO(dateRange.from),
    endDate: formatDateToISO(dateRange.to),
  };
}

/**
 * Formats a date range for display in pt-BR
 */
export function formatDateRangeDisplay(range: DateRange): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return `${formatDate(range.from)} - ${formatDate(range.to)}`;
}

/**
 * Gets a human-readable duration label
 */
export function getDurationLabel(range: DateRange): string {
  const diffTime = Math.abs(range.to.getTime() - range.from.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays === 1) {
    return '1 dia';
  }

  if (diffDays < 7) {
    return `${diffDays} dias`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;
    if (remainingDays === 0) {
      return weeks === 1 ? '1 semana' : `${weeks} semanas`;
    }
    return `${diffDays} dias`;
  }

  if (diffDays < 365) {
    const months = Math.round(diffDays / 30);
    if (months === 1) {
      return '1 mes';
    }
    return `${months} meses`;
  }

  const years = Math.round(diffDays / 365);
  if (years === 1) {
    return '1 ano';
  }
  return `${years} anos`;
}

/**
 * Get available years for year selection (current year and 2 previous)
 */
export function getAvailableYears(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear, currentYear - 1, currentYear - 2];
}

// ==================== DAYTRADE DATE UTILITIES ====================

/**
 * Calculates a date range from a DayTrade preset
 */
export function getDayTradeDateRange(
  preset: DayTradeDatePreset,
  customRange?: { from: Date; to: Date }
): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { from: today, to: today };

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: yesterday };
    }

    case '7d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from, to: today };
    }

    case '15d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 14);
      return { from, to: today };
    }

    case '30d': {
      const from = new Date(today);
      from.setDate(from.getDate() - 29);
      return { from, to: today };
    }

    case 'this_week': {
      // Domingo a Sabado da semana atual
      const from = new Date(today);
      from.setDate(today.getDate() - today.getDay());
      return { from, to: today };
    }

    case 'last_week': {
      // Domingo a Sabado da semana passada
      const to = new Date(today);
      to.setDate(today.getDate() - today.getDay() - 1);
      const from = new Date(to);
      from.setDate(to.getDate() - 6);
      return { from, to };
    }

    case 'this_month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from, to: today };
    }

    case 'last_month': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from, to };
    }

    case 'ytd': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { from, to: today };
    }

    case 'custom':
      if (customRange) {
        return { from: customRange.from, to: customRange.to };
      }
      return { from: today, to: today };

    default:
      return { from: today, to: today };
  }
}
