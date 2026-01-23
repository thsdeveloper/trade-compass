'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  TableIcon,
  Loader2,
  Download,
} from 'lucide-react';
import { CurrencyInput } from '@/components/ui/currency-input';
import { financeApi } from '@/lib/finance-api';
import type {
  MortgageWithProgress,
  MortgageInstallment,
  AmortizationSimulationResponse,
  CalculatedInstallment,
} from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface FullAmortizationTableProps {
  mortgage: MortgageWithProgress;
  installments: MortgageInstallment[];
  accessToken: string;
}

export function FullAmortizationTable({
  mortgage,
  installments,
  accessToken,
}: FullAmortizationTableProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showSimulated, setShowSimulated] = useState(false);
  const [simulatedAmount, setSimulatedAmount] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [simulation, setSimulation] = useState<AmortizationSimulationResponse | null>(null);
  const pageSize = 24;

  // Fetch simulated schedule when amount changes
  const fetchSimulation = useCallback(async () => {
    if (!showSimulated || simulatedAmount <= 0) {
      setSimulation(null);
      return;
    }

    setSimulating(true);
    try {
      const result = await financeApi.simulateMortgageAmortization(
        mortgage.id,
        {
          extra_payments: [
            {
              id: 'table-sim',
              type: 'RECURRING',
              amount: simulatedAmount,
              start_month: 1,
              payment_type: 'REDUCE_TERM',
            },
          ],
          include_current_schedule: true,
        },
        accessToken
      );
      setSimulation(result);
    } catch (error) {
      console.error('Error fetching simulation:', error);
      setSimulation(null);
    } finally {
      setSimulating(false);
    }
  }, [mortgage.id, simulatedAmount, showSimulated, accessToken]);

  useEffect(() => {
    if (showSimulated && simulatedAmount > 0) {
      const timer = setTimeout(fetchSimulation, 500);
      return () => clearTimeout(timer);
    }
  }, [fetchSimulation, showSimulated, simulatedAmount]);

  // Use simulated data or calculate from mortgage params
  const displayData = useMemo(() => {
    if (showSimulated && simulation) {
      const simScenario = simulation.scenarios.find((s) => s.name === 'Com Aportes');
      if (simScenario) {
        return simScenario.installments;
      }
    }

    // If no installments generated, create theoretical schedule
    if (installments.length === 0) {
      const remainingInstallments = mortgage.remaining_installments || mortgage.total_installments;
      const balance = mortgage.current_balance || mortgage.financed_amount;
      const amortization = balance / remainingInstallments;
      const monthlyRate = Math.pow(1 + mortgage.base_annual_rate / 100, 1 / 12) - 1;
      const startDate = new Date(mortgage.first_installment_date);

      const result: CalculatedInstallment[] = [];
      let currentBalance = balance;

      for (let i = 0; i < remainingInstallments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(dueDate.getMonth() + i);
        const interest = currentBalance * monthlyRate;
        const mip = currentBalance * ((mortgage.mip_rate || 0) / 100);
        const dfi = (mortgage.property_value * ((mortgage.dfi_rate || 0) / 100)) / 12;
        const total = amortization + interest + mip + dfi + (mortgage.admin_fee || 0);
        const balanceAfter = Math.max(0, currentBalance - amortization);

        result.push({
          installment_number: i + 1,
          due_date: dueDate.toISOString().split('T')[0],
          amortization_amount: amortization,
          interest_amount: interest,
          mip_insurance: mip,
          dfi_insurance: dfi,
          admin_fee: mortgage.admin_fee || 0,
          tr_adjustment: 0,
          total_amount: total,
          balance_before: currentBalance,
          balance_after: balanceAfter,
        });

        currentBalance = balanceAfter;
      }

      return result;
    }

    // Convert MortgageInstallment to CalculatedInstallment format
    return installments.map((inst) => ({
      installment_number: inst.installment_number,
      due_date: inst.due_date,
      amortization_amount: inst.amortization_amount,
      interest_amount: inst.interest_amount,
      mip_insurance: inst.mip_insurance,
      dfi_insurance: inst.dfi_insurance,
      admin_fee: inst.admin_fee,
      tr_adjustment: inst.tr_adjustment,
      total_amount: inst.total_amount,
      balance_before: inst.balance_before,
      balance_after: inst.balance_after,
    }));
  }, [installments, showSimulated, simulation, mortgage]);

  const filteredData = displayData.filter((inst) => {
    if (!search) return true;
    const date = new Date(inst.due_date + 'T00:00:00');
    const dateStr = date.toLocaleDateString('pt-BR');
    return (
      inst.installment_number.toString().includes(search) ||
      dateStr.includes(search)
    );
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const totals = useMemo(() => {
    return displayData.reduce(
      (acc, inst) => ({
        totalPaid: acc.totalPaid + inst.total_amount,
        totalInterest: acc.totalInterest + inst.interest_amount,
        totalAmortization: acc.totalAmortization + inst.amortization_amount,
        totalInsurance: acc.totalInsurance + inst.mip_insurance + inst.dfi_insurance,
      }),
      { totalPaid: 0, totalInterest: 0, totalAmortization: 0, totalInsurance: 0 }
    );
  }, [displayData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TableIcon className="h-5 w-5 text-primary" />
            Tabela de Amortizacao
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por numero ou data..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 h-9 text-[13px]"
              />
            </div>

            {/* Simulation Toggle */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="show-simulated"
                  checked={showSimulated}
                  onCheckedChange={setShowSimulated}
                />
                <Label htmlFor="show-simulated" className="text-sm">
                  Simular aportes mensais
                </Label>
              </div>

              {showSimulated && (
                <CurrencyInput
                  value={simulatedAmount}
                  onChange={setSimulatedAmount}
                  className="w-[150px] h-9 text-[13px]"
                  placeholder="R$ 0,00"
                />
              )}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-xs text-muted-foreground">Total a Pagar</p>
              <p className="font-semibold tabular-nums">{formatCurrency(totals.totalPaid)}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-xs text-red-600">Total de Juros</p>
              <p className="font-semibold text-red-700 tabular-nums">
                {formatCurrency(totals.totalInterest)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <p className="text-xs text-emerald-600">Amortizacao</p>
              <p className="font-semibold text-emerald-700 tabular-nums">
                {formatCurrency(totals.totalAmortization)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border">
              <p className="text-xs text-muted-foreground">Parcelas</p>
              <p className="font-semibold tabular-nums">{displayData.length}</p>
            </div>
          </div>

          {simulating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Recalculando tabela...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-[60px] whitespace-nowrap">No.</TableHead>
              <TableHead className="whitespace-nowrap">Data</TableHead>
              <TableHead className="text-right whitespace-nowrap">Saldo Antes</TableHead>
              <TableHead className="text-right whitespace-nowrap">Amortizacao</TableHead>
              <TableHead className="text-right whitespace-nowrap">Juros</TableHead>
              <TableHead className="text-right whitespace-nowrap">Seguros</TableHead>
              <TableHead className="text-right whitespace-nowrap">Parcela</TableHead>
              <TableHead className="text-right whitespace-nowrap">Saldo Apos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((inst) => (
              <TableRow key={inst.installment_number} className="text-xs">
                <TableCell className="font-medium tabular-nums">
                  {inst.installment_number}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(inst.due_date)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(inst.balance_before)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-emerald-600">
                  {formatCurrency(inst.amortization_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-red-600">
                  {formatCurrency(inst.interest_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(inst.mip_insurance + inst.dfi_insurance)}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCurrency(inst.total_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCurrency(inst.balance_after)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, filteredData.length)} de{' '}
            {filteredData.length} parcelas
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
