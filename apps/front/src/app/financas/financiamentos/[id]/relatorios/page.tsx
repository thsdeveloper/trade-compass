'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import {
  RefreshCw,
  BarChart3,
  FileText,
  Download,
  Calendar,
  Loader2,
  TrendingDown,
  Building2,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/organisms/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MortgageBalanceChart } from '@/components/molecules/MortgageBalanceChart';
import { MortgagePaymentChart } from '@/components/molecules/MortgagePaymentChart';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  MortgageInstallment,
  AnnualMortgageReport,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[350px] rounded-lg" />
      <Skeleton className="h-[350px] rounded-lg" />
    </div>
  );
}

function AnnualReportCard({ report }: { report: AnnualMortgageReport }) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold">Extrato Anual {report.year}</h3>
            <p className="text-sm text-muted-foreground">
              {report.institution_name} - {report.contract_number}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Saldo Inicial</p>
          <p className="font-semibold">{formatCurrency(report.balance_start_of_year)}</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30">
          <p className="text-xs text-muted-foreground mb-1">Saldo Final</p>
          <p className="font-semibold">{formatCurrency(report.balance_end_of_year)}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50">
          <p className="text-xs text-emerald-600 mb-1">Total Amortizado</p>
          <p className="font-semibold text-emerald-700">
            {formatCurrency(report.total_amortization)}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-red-50">
          <p className="text-xs text-red-600 mb-1">Juros Pagos</p>
          <p className="font-semibold text-red-700">{formatCurrency(report.total_interest)}</p>
        </div>
      </div>

      <div className="pt-4 border-t space-y-3">
        <h4 className="text-sm font-medium">Detalhamento para IR</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Pagamentos totais:</span>
            <span className="font-medium">{formatCurrency(report.total_paid)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Seguros:</span>
            <span className="font-medium">{formatCurrency(report.total_insurance)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tarifas administrativas:</span>
            <span className="font-medium">{formatCurrency(report.total_admin_fee)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amortizacoes extras:</span>
            <span className="font-medium">{formatCurrency(report.extra_payments_total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-muted-foreground">
          {report.installments.length} parcelas pagas em {report.year}
        </p>
      </div>
    </div>
  );
}

export default function MortgageRelatoriosPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [mortgage, setMortgage] = useState<MortgageWithProgress | null>(null);
  const [installments, setInstallments] = useState<MortgageInstallment[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [annualReport, setAnnualReport] = useState<AnnualMortgageReport | null>(null);

  const currentYear = new Date().getFullYear();
  const startYear = mortgage
    ? parseInt(mortgage.first_installment_date.substring(0, 4))
    : currentYear - 5;
  const years = Array.from({ length: currentYear - startYear + 1 }, (_, i) =>
    (startYear + i).toString()
  );

  const fetchData = useCallback(async () => {
    if (!session?.access_token || !id) return;

    setLoading(true);
    try {
      const [mortgageData, installmentsData] = await Promise.all([
        financeApi.getMortgage(id, session.access_token),
        financeApi.getMortgageInstallments(id, session.access_token),
      ]);
      setMortgage(mortgageData);
      setInstallments(installmentsData);

      // Set default selected year to current year
      if (!selectedYear) {
        setSelectedYear(currentYear.toString());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, id, selectedYear, currentYear]);

  const fetchAnnualReport = useCallback(async () => {
    if (!session?.access_token || !id || !selectedYear) return;

    setLoadingReport(true);
    try {
      const report = await financeApi.getMortgageAnnualReport(
        id,
        parseInt(selectedYear),
        session.access_token
      );
      setAnnualReport(report);
    } catch (error) {
      console.error('Error fetching annual report:', error);
      setAnnualReport(null);
    } finally {
      setLoadingReport(false);
    }
  }, [session?.access_token, id, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedYear && mortgage) {
      fetchAnnualReport();
    }
  }, [selectedYear, mortgage, fetchAnnualReport]);

  if (loading) {
    return (
      <PageShell
        title="Relatorios"
        description="Carregando..."
        backHref={`/financas/financiamentos/${id}`}
      >
        <PageSkeleton />
      </PageShell>
    );
  }

  if (!mortgage) {
    return (
      <PageShell
        title="Financiamento nao encontrado"
        description=""
        backHref="/financas/financiamentos"
      >
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground">O financiamento solicitado nao foi encontrado.</p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Relatorios e Graficos"
      description={`${mortgage.institution_name} - ${mortgage.contract_number}`}
      backHref={`/financas/financiamentos/${id}`}
      actions={
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      }
    >
      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="charts" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Graficos
          </TabsTrigger>
          <TabsTrigger value="annual" className="gap-2">
            <FileText className="h-4 w-4" />
            Extrato Anual
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          {installments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Parcelas nao geradas</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Gere as parcelas do financiamento para visualizar os graficos.
              </p>
            </div>
          ) : (
            <>
              <MortgageBalanceChart installments={installments} />
              <MortgagePaymentChart installments={installments} />
            </>
          )}
        </TabsContent>

        <TabsContent value="annual" className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Ano:</span>
            </div>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingReport ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : annualReport ? (
            <AnnualReportCard report={annualReport} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Sem dados para {selectedYear}</h3>
              <p className="text-muted-foreground text-sm">
                Nao ha parcelas pagas neste ano para gerar o extrato.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
