'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { RefreshCw, Calculator, TableIcon, Layers, GitCompare, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/organisms/PageShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WhatIfSimulator } from '@/components/organisms/finance/WhatIfSimulator';
import { FullAmortizationTable } from '@/components/organisms/finance/FullAmortizationTable';
import { MultiplePaymentsSimulator } from '@/components/organisms/finance/MultiplePaymentsSimulator';
import { ScenarioComparator } from '@/components/organisms/finance/ScenarioComparator';
import { financeApi } from '@/lib/finance-api';
import type { MortgageWithProgress, MortgageInstallment } from '@/types/finance';

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[80px] rounded-lg" />
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}

export default function MortgageSimuladorPage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [mortgage, setMortgage] = useState<MortgageWithProgress | null>(null);
  const [installments, setInstallments] = useState<MortgageInstallment[]>([]);

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
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <PageShell
        title="Simulador de Amortizacao"
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
      title="Simulador de Amortizacao"
      description={`${mortgage.institution_name} - ${mortgage.contract_number}`}
      backHref={`/financas/financiamentos/${id}`}
      actions={
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      }
    >
      <Tabs defaultValue="whatif" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatif" className="gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">E Se?</span>
          </TabsTrigger>
          <TabsTrigger value="table" className="gap-2">
            <TableIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Tabela Completa</span>
          </TabsTrigger>
          <TabsTrigger value="multiple" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Multiplos Aportes</span>
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2">
            <GitCompare className="h-4 w-4" />
            <span className="hidden sm:inline">Comparador</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatif">
          <WhatIfSimulator
            mortgage={mortgage}
            accessToken={session?.access_token || ''}
          />
        </TabsContent>

        <TabsContent value="table">
          <FullAmortizationTable
            mortgage={mortgage}
            installments={installments}
            accessToken={session?.access_token || ''}
          />
        </TabsContent>

        <TabsContent value="multiple">
          <MultiplePaymentsSimulator
            mortgage={mortgage}
            accessToken={session?.access_token || ''}
          />
        </TabsContent>

        <TabsContent value="compare">
          <ScenarioComparator
            mortgage={mortgage}
            accessToken={session?.access_token || ''}
          />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
