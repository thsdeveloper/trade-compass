'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { Plus, RefreshCw, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/organisms/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { MortgageExtraPaymentDialog } from '@/components/organisms/finance/MortgageExtraPaymentDialog';
import { MortgageExtraPaymentsTable } from '@/components/organisms/finance/MortgageExtraPaymentsTable';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  MortgageExtraPayment,
  ExtraPaymentFormData,
} from '@/types/finance';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[80px] rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}

export default function MortgageAmortizacoesPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mortgage, setMortgage] = useState<MortgageWithProgress | null>(null);
  const [extraPayments, setExtraPayments] = useState<MortgageExtraPayment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.access_token || !id) return;

    setLoading(true);
    try {
      const [mortgageData, extraPaymentsData] = await Promise.all([
        financeApi.getMortgage(id, session.access_token),
        financeApi.getMortgageExtraPayments(id, session.access_token),
      ]);
      setMortgage(mortgageData);
      setExtraPayments(extraPaymentsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateExtraPayment = async (data: ExtraPaymentFormData) => {
    if (!session?.access_token || !id) return;
    await financeApi.createMortgageExtraPayment(id, data, session.access_token);
    await fetchData();
  };

  if (loading) {
    return (
      <PageShell
        title="Amortizacoes Extraordinarias"
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
      title="Amortizacoes Extraordinarias"
      description={`${mortgage.institution_name} - ${mortgage.contract_number}`}
      backHref={`/financas/financiamentos/${id}`}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Amortizacao
          </Button>
        </div>
      }
    >
      {extraPayments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center rounded-lg border">
          <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhuma amortizacao registrada</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md">
            Registre amortizacoes extraordinarias para reduzir o prazo ou o valor das parcelas do
            seu financiamento.
          </p>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Amortizacao
          </Button>
        </div>
      ) : (
        <MortgageExtraPaymentsTable extraPayments={extraPayments} />
      )}

      <MortgageExtraPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleCreateExtraPayment}
        mortgage={mortgage}
        accessToken={session?.access_token || ''}
      />
    </PageShell>
  );
}
