'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Settings,
  FileText,
  BarChart3,
  PiggyBank,
  Calendar,
  RefreshCw,
  Loader2,
  Play,
  Calculator,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageShell } from '@/components/organisms/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { MortgageDialog } from '@/components/organisms/finance/MortgageDialog';
import { MortgageInstallmentsTable } from '@/components/organisms/finance/MortgageInstallmentsTable';
import { MortgagePaymentDialog } from '@/components/organisms/finance/MortgagePaymentDialog';
import { MortgageSimulationDialog } from '@/components/organisms/finance/MortgageSimulationDialog';
import { TRExplainerCard } from '@/components/molecules/TRExplainerCard';
import { TRHistoryChart } from '@/components/molecules/TRHistoryChart';
import { TRImpactSimulator } from '@/components/molecules/TRImpactSimulator';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  MortgageInstallment,
  MortgageFormData,
  PayInstallmentFormData,
  TRRate,
} from '@/types/finance';
import {
  formatCurrency,
  MORTGAGE_STATUS_LABELS,
  getMortgageStatusBgColor,
  MORTGAGE_AMORTIZATION_LABELS,
  MORTGAGE_RATE_INDEX_LABELS,
  MORTGAGE_MODALITY_LABELS,
} from '@/types/finance';

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[200px] rounded-lg" />
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}

export default function MortgageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [mortgage, setMortgage] = useState<MortgageWithProgress | null>(null);
  const [installments, setInstallments] = useState<MortgageInstallment[]>([]);
  const [trRates, setTRRates] = useState<TRRate[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [simulationDialogOpen, setSimulationDialogOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<MortgageInstallment | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.access_token || !id) return;

    setLoading(true);
    try {
      const [mortgageData, installmentsData, trRatesData] = await Promise.all([
        financeApi.getMortgage(id, session.access_token),
        financeApi.getMortgageInstallments(id, session.access_token),
        financeApi.getTRRates(session.access_token, { start_date: '2024-01-01' }),
      ]);
      setMortgage(mortgageData);
      setInstallments(installmentsData);
      setTRRates(trRatesData);
    } catch (error) {
      console.error('Error fetching mortgage:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateMortgage = async (data: MortgageFormData) => {
    if (!session?.access_token || !id) return;
    await financeApi.updateMortgage(id, data, session.access_token);
    await fetchData();
  };

  const handleGenerateInstallments = async () => {
    if (!session?.access_token || !id) return;

    setGenerating(true);
    try {
      await financeApi.generateMortgageInstallments(id, session.access_token);
      await fetchData();
    } catch (error) {
      console.error('Error generating installments:', error);
      alert('Erro ao gerar parcelas');
    } finally {
      setGenerating(false);
    }
  };

  const handlePayInstallment = async (data: PayInstallmentFormData) => {
    if (!session?.access_token || !id || !selectedInstallment) return;
    await financeApi.payMortgageInstallment(
      id,
      selectedInstallment.installment_number,
      data,
      session.access_token
    );
    await fetchData();
  };

  const openPaymentDialog = (installment: MortgageInstallment) => {
    setSelectedInstallment(installment);
    setPaymentDialogOpen(true);
  };

  if (loading) {
    return (
      <PageShell title="Carregando..." description="">
        <DetailSkeleton />
      </PageShell>
    );
  }

  if (!mortgage) {
    return (
      <PageShell title="Financiamento nao encontrado" description="">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">
            O financiamento solicitado nao foi encontrado.
          </p>
          <Button onClick={() => router.push('/financas/financiamentos')}>
            Voltar para lista
          </Button>
        </div>
      </PageShell>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const activeRate = mortgage.is_reduced_rate_active
    ? mortgage.reduced_annual_rate || mortgage.base_annual_rate
    : mortgage.base_annual_rate;

  return (
    <PageShell
      title={mortgage.institution_name}
      description={`Contrato: ${mortgage.contract_number}`}
      backHref="/financas/financiamentos"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setSimulationDialogOpen(true)}>
            <Calculator className="mr-2 h-4 w-4" />
            Simular Quitacao
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Card */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-semibold">{mortgage.institution_name}</h2>
                  <Badge className={getMortgageStatusBgColor(mortgage.status)}>
                    {MORTGAGE_STATUS_LABELS[mortgage.status]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {MORTGAGE_MODALITY_LABELS[mortgage.modality]} -{' '}
                  {MORTGAGE_AMORTIZATION_LABELS[mortgage.amortization_system]}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {formatCurrency(mortgage.current_balance || mortgage.financed_amount)}
              </p>
              <p className="text-sm text-muted-foreground">Saldo devedor</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progresso do financiamento</span>
              <span className="font-medium">{mortgage.progress_percentage.toFixed(1)}%</span>
            </div>
            <Progress value={mortgage.progress_percentage} className="h-3" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{mortgage.paid_installments} parcelas pagas</span>
              <span>{mortgage.remaining_installments} parcelas restantes</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Valor do Imovel</p>
              <p className="font-medium">{formatCurrency(mortgage.property_value)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Valor Financiado</p>
              <p className="font-medium">{formatCurrency(mortgage.financed_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Taxa Anual</p>
              <p className="font-medium">
                {activeRate.toFixed(2)}% + {MORTGAGE_RATE_INDEX_LABELS[mortgage.rate_index]}
                {mortgage.is_reduced_rate_active && (
                  <span className="text-xs text-emerald-600 ml-1">(reduzida)</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Inicio</p>
              <p className="font-medium">{formatDate(mortgage.first_installment_date)}</p>
            </div>
          </div>

          {mortgage.next_installment && (
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Proxima parcela (#{mortgage.next_installment.installment_number}):
                  </span>
                  <span className="text-sm font-medium">
                    {formatDate(mortgage.next_installment.due_date)}
                  </span>
                </div>
                <span className="font-semibold text-primary">
                  {formatCurrency(mortgage.next_installment.total_amount)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="installments">
          <TabsList>
            <TabsTrigger value="installments" className="gap-2">
              <Calendar className="h-4 w-4" />
              Parcelas
            </TabsTrigger>
            <TabsTrigger value="tr" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa TR
            </TabsTrigger>
            <TabsTrigger value="extra" className="gap-2">
              <PiggyBank className="h-4 w-4" />
              Amortizacoes
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Relatorios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="installments" className="mt-6">
            {installments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Parcelas nao geradas</h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-md">
                  As parcelas do financiamento ainda nao foram geradas. Clique no botao
                  abaixo para gerar todas as {mortgage.total_installments} parcelas.
                </p>
                <Button onClick={handleGenerateInstallments} disabled={generating}>
                  {generating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Gerar Parcelas
                </Button>
              </div>
            ) : (
              <MortgageInstallmentsTable
                installments={installments}
                onPayInstallment={openPaymentDialog}
              />
            )}
          </TabsContent>

          <TabsContent value="tr" className="mt-6 space-y-6">
            {/* Explainer Card */}
            <TRExplainerCard
              currentRate={trRates.length > 0 ? trRates[trRates.length - 1].rate : 0.08}
            />

            {/* History Chart */}
            {trRates.length > 0 && (
              <TRHistoryChart
                trRates={trRates}
                financedAmount={mortgage.financed_amount}
              />
            )}

            {/* Impact Simulator */}
            <TRImpactSimulator
              currentBalance={mortgage.current_balance || mortgage.financed_amount}
              remainingInstallments={mortgage.remaining_installments}
              baseAnnualRate={mortgage.base_annual_rate}
            />
          </TabsContent>

          <TabsContent value="extra" className="mt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
                <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Amortizacoes Realizadas</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Registre amortizacoes para reduzir o prazo ou o valor das parcelas.
                </p>
                <Link href={`/financas/financiamentos/${id}/amortizacoes`}>
                  <Button variant="outline">Ver Amortizacoes</Button>
                </Link>
              </div>
              <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border border-primary/30 bg-primary/5">
                <Calculator className="h-12 w-12 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">Simulador de Amortizacao</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Simule diferentes cenarios de amortizacao e compare os resultados.
                </p>
                <Link href={`/financas/financiamentos/${id}/simulador`}>
                  <Button>Abrir Simulador</Button>
                </Link>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Documentos</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Armazene contratos, extratos e comprovantes.
              </p>
              <Link href={`/financas/financiamentos/${id}/documentos`}>
                <Button variant="outline">Ver Documentos</Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
              <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Relatorios</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Visualize graficos e extratos anuais para IR.
              </p>
              <Link href={`/financas/financiamentos/${id}/relatorios`}>
                <Button variant="outline">Ver Relatorios</Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <MortgageDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdateMortgage}
        mortgage={mortgage}
      />

      <MortgagePaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        onSave={handlePayInstallment}
        installment={selectedInstallment}
      />

      <MortgageSimulationDialog
        open={simulationDialogOpen}
        onOpenChange={setSimulationDialogOpen}
        mortgage={mortgage}
        accessToken={session?.access_token || ''}
      />
    </PageShell>
  );
}
