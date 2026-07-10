'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Building2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/organisms/PageShell';
import { MortgageSummaryCards } from '@/components/molecules/MortgageSummaryCards';
import { MortgageProgressCard } from '@/components/molecules/MortgageProgressCard';
import { MortgageDialog } from '@/components/organisms/finance/MortgageDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithBank,
  MortgageSummary,
  MortgageFormData,
} from '@/types/finance';

function MortgagesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[100px] rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-[280px] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function FinanciamentosPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mortgages, setMortgages] = useState<MortgageWithBank[]>([]);
  const [summary, setSummary] = useState<MortgageSummary | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    try {
      const [mortgagesData, summaryData] = await Promise.all([
        financeApi.getMortgages(session.access_token),
        financeApi.getMortgageSummary(session.access_token),
      ]);
      setMortgages(mortgagesData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching mortgages:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveMortgage = async (data: MortgageFormData) => {
    if (!session?.access_token) return;

    await financeApi.createMortgage(data, session.access_token);
    await fetchData();
  };

  if (loading) {
    return (
      <PageShell
        title="Financiamentos"
        description="Gerencie seus financiamentos imobiliarios"
      >
        <MortgagesSkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Financiamentos"
      description="Gerencie seus financiamentos imobiliarios"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Financiamento
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {summary && <MortgageSummaryCards summary={summary} />}

        {mortgages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Nenhum financiamento</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Cadastre seu primeiro financiamento imobiliario para acompanhar
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Cadastrar Financiamento
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {mortgages.map((mortgage) => (
              <MortgageProgressCard key={mortgage.id} mortgage={mortgage} />
            ))}
          </div>
        )}
      </div>

      <MortgageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveMortgage}
      />
    </PageShell>
  );
}
