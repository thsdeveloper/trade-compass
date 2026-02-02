'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileDown, Loader2, Mail } from 'lucide-react';
import { exportReportToPDF } from '@/lib/pdf-export';
import { toast } from '@/lib/toast';
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
import { SendReportEmailModal } from './components/SendReportEmailModal';
import type { ReportType, ReportDateFilter } from '@/types/reports';
import { createDateFilter } from '@/lib/date-utils';

export default function RelatoriosPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const reportContainerRef = useRef<HTMLDivElement>(null);

  // Report state
  const [activeReport, setActiveReport] = useState<ReportType>('cash-flow');
  const [dateFilter, setDateFilter] = useState<ReportDateFilter>(() =>
    createDateFilter('6m')
  );
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
    if (!reportContainerRef.current) return;
    setExporting(true);
    try {
      await exportReportToPDF({
        reportType: activeReport,
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate,
        element: reportContainerRef.current,
      });
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.apiError(error, 'Erro ao exportar PDF');
    } finally {
      setExporting(false);
    }
  }, [activeReport, dateFilter.startDate, dateFilter.endDate]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
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
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEmailModalOpen(true)}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Enviar para e-mail
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={exporting}
              className="gap-2"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {exporting ? 'Exportando...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>

        {/* Report Tabs */}
        <ReportTabs activeReport={activeReport} onReportChange={setActiveReport} />

        {/* Filters */}
        <ReportFilters
          reportType={activeReport}
          dateFilter={dateFilter}
          onDateFilterChange={setDateFilter}
          includePending={includePending}
          onIncludePendingChange={setIncludePending}
          selectedYears={selectedYears}
          onYearsChange={setSelectedYears}
          onRefresh={handleRefresh}
        />

        {/* Report Content */}
        <div ref={reportContainerRef} className="min-h-[500px]">
          {renderReport()}
        </div>
      </div>

      {/* Email Modal */}
      <SendReportEmailModal
        open={emailModalOpen}
        onOpenChange={setEmailModalOpen}
        reportType={activeReport}
        startDate={dateFilter.startDate}
        endDate={dateFilter.endDate}
        includePending={includePending}
        selectedYears={selectedYears}
        userEmail={user?.email}
      />
    </PageShell>
  );
}
