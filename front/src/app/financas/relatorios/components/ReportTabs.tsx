'use client';

import { cn } from '@/lib/utils';
import type { ReportType } from '@/types/reports';
import { REPORT_TYPE_LABELS } from '@/types/reports';
import {
  TrendingUp,
  PieChart,
  Wallet,
  CreditCard,
  Target,
  RefreshCw,
  BarChart3,
  ChevronDown,
} from 'lucide-react';

interface ReportTabsProps {
  activeReport: ReportType;
  onReportChange: (report: ReportType) => void;
}

const REPORT_ICONS: Record<ReportType, React.ElementType> = {
  'cash-flow': TrendingUp,
  'budget-analysis': BarChart3,
  'category-breakdown': PieChart,
  'payment-methods': CreditCard,
  'goals-progress': Target,
  'recurring-analysis': RefreshCw,
  'yoy-comparison': Wallet,
};

const REPORT_ORDER: ReportType[] = [
  'cash-flow',
  'budget-analysis',
  'category-breakdown',
  'payment-methods',
  'goals-progress',
  'recurring-analysis',
  'yoy-comparison',
];

export function ReportTabs({ activeReport, onReportChange }: ReportTabsProps) {
  const ActiveIcon = REPORT_ICONS[activeReport];

  return (
    <>
      {/* Mobile: Dropdown Select */}
      <div className="md:hidden">
        <div className="relative">
          <select
            value={activeReport}
            onChange={(e) => onReportChange(e.target.value as ReportType)}
            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {REPORT_ORDER.map((report) => (
              <option key={report} value={report}>
                {REPORT_TYPE_LABELS[report]}
              </option>
            ))}
          </select>
          <ActiveIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" />
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Tablet/Desktop: Wrapping Grid */}
      <div className="hidden md:block">
        <div className="rounded-lg border border-slate-200 bg-white p-1.5">
          <div className="grid grid-cols-4 gap-1 lg:grid-cols-7">
            {REPORT_ORDER.map((report) => {
              const Icon = REPORT_ICONS[report];
              const isActive = report === activeReport;

              return (
                <button
                  key={report}
                  onClick={() => onReportChange(report)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors lg:text-sm',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{REPORT_TYPE_LABELS[report]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
