'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileDown } from 'lucide-react';
import { ReportsSkeleton } from '@/components/organisms/skeletons/ReportsSkeleton';
import { ReportTabs } from './components/ReportTabs';
import { ReportFilters } from './components/ReportFilters';
import { CashFlowReport } from './components/CashFlowReport';
import { BudgetAnalysisReport } from './components/BudgetAnalysisReport';
import { CategoryBreakdownReport } from './components/CategoryBreakdownReport';
import { PaymentMethodsReport } from './components/PaymentMethodsReport';
import { GoalsProgressReport } from './components/GoalsProgressReport';
import { RecurringAnalysisReport } from './components/RecurringAnalysisReport';
import { YoYComparisonReport } from './components/YoYComparisonReport';
import type { ReportType, ReportPeriod } from '@/types/reports';

export default function RelatoriosPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report state
  const [activeReport, setActiveReport] = useState<ReportType>('cash-flow');
  const [period, setPeriod] = useState<ReportPeriod>('6m');
  const [includePending, setIncludePending] = useState(true);
  const [selectedYears, setSelectedYears] = useState<number[]>(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear, currentYear - 1];
  });

  // Trigger for refreshing data
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const handleExportPDF = useCallback(async () => {
    // TODO: Implement PDF export
    alert('Exportacao PDF sera implementada em breve!');
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    setLoading(false);
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <ReportsSkeleton />;
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-sm text-slate-500">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2"
          >
            Tentar novamente
          </Button>
        </div>
      </PageShell>
    );
  }

  const renderReport = () => {
    const commonProps = {
      accessToken: session?.access_token || '',
      period,
      includePending,
      refreshKey,
    };

    switch (activeReport) {
      case 'cash-flow':
        return <CashFlowReport {...commonProps} />;
      case 'budget-analysis':
        return <BudgetAnalysisReport {...commonProps} />;
      case 'category-breakdown':
        return <CategoryBreakdownReport {...commonProps} />;
      case 'payment-methods':
        return <PaymentMethodsReport {...commonProps} />;
      case 'goals-progress':
        return <GoalsProgressReport {...commonProps} />;
      case 'recurring-analysis':
        return <RecurringAnalysisReport {...commonProps} />;
      case 'yoy-comparison':
        return (
          <YoYComparisonReport
            accessToken={session?.access_token || ''}
            years={selectedYears}
            refreshKey={refreshKey}
          />
        );
      default:
        return null;
    }
  };

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Relatorios</h1>
            <p className="text-sm text-slate-500">
              Analise detalhada das suas financas
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* Report Tabs */}
        <ReportTabs activeReport={activeReport} onReportChange={setActiveReport} />

        {/* Filters */}
        <ReportFilters
          reportType={activeReport}
          period={period}
          onPeriodChange={setPeriod}
          includePending={includePending}
          onIncludePendingChange={setIncludePending}
          selectedYears={selectedYears}
          onYearsChange={setSelectedYears}
          onRefresh={handleRefresh}
        />

        {/* Report Content */}
        <div className="min-h-[500px]">{renderReport()}</div>
      </div>
    </PageShell>
  );
}
