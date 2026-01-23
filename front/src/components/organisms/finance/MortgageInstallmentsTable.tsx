'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MortgageInstallment } from '@/types/finance';
import {
  formatCurrency,
  MORTGAGE_INSTALLMENT_STATUS_LABELS,
  getMortgageInstallmentStatusBgColor,
} from '@/types/finance';

interface MortgageInstallmentsTableProps {
  installments: MortgageInstallment[];
  onPayInstallment?: (installment: MortgageInstallment) => void;
  pageSize?: number;
}

export function MortgageInstallmentsTable({
  installments,
  onPayInstallment,
  pageSize = 12,
}: MortgageInstallmentsTableProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredInstallments = installments.filter((inst) => {
    const matchesSearch =
      search === '' ||
      inst.installment_number.toString().includes(search) ||
      inst.due_date.includes(search);
    const matchesStatus =
      statusFilter === 'all' || inst.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredInstallments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInstallments = filteredInstallments.slice(
    startIndex,
    startIndex + pageSize
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  // Calculate totals for paid installments
  const paidInstallments = filteredInstallments.filter((i) => i.status === 'PAGA');
  const totals = {
    amort_juros: paidInstallments.reduce((sum, i) => sum + i.amortization_amount, 0),
    seguro: paidInstallments.reduce((sum, i) => sum + i.mip_insurance + i.dfi_insurance, 0),
    admin_fee: paidInstallments.reduce((sum, i) => sum + i.admin_fee, 0),
    subsidio: paidInstallments.reduce((sum, i) => sum + (i.government_subsidy || 0), 0),
    diferencial_tr: paidInstallments.reduce((sum, i) => sum + (i.interest_differential || 0) + (i.tr_adjustment || 0), 0),
    fgts: paidInstallments.reduce((sum, i) => sum + (i.fgts_amount || 0), 0),
    mora_multa: paidInstallments.reduce((sum, i) => sum + (i.mora_amount || 0) + (i.fine_amount || 0), 0),
    devido: paidInstallments.reduce((sum, i) => sum + i.total_amount, 0),
    pago: paidInstallments.reduce((sum, i) => sum + (i.paid_amount || 0), 0),
    diferenca: paidInstallments.reduce((sum, i) => sum + (i.payment_difference || 0), 0),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
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
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="h-9 rounded-md border bg-background px-3 text-[13px]"
        >
          <option value="all">Todos os status</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="PAGA">Pagas</option>
          <option value="VENCIDA">Vencidas</option>
          <option value="PARCIAL">Parciais</option>
        </select>
      </div>

      {/* Summary Cards */}
      {paidInstallments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground">Total Pago</p>
            <p className="font-semibold text-emerald-600">{formatCurrency(totals.pago)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground">Amort + Juros</p>
            <p className="font-semibold">{formatCurrency(totals.amort_juros)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground">Seguros</p>
            <p className="font-semibold">{formatCurrency(totals.seguro)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground">Taxa Admin</p>
            <p className="font-semibold">{formatCurrency(totals.admin_fee)}</p>
          </div>
          <div className="p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs text-red-600">Mora/Multa</p>
            <p className="font-semibold text-red-600">{formatCurrency(totals.mora_multa)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <p className="text-xs text-muted-foreground">Parcelas Pagas</p>
            <p className="font-semibold">{paidInstallments.length}</p>
          </div>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="w-[50px] whitespace-nowrap">No.</TableHead>
              <TableHead className="whitespace-nowrap">Vencimento</TableHead>
              <TableHead className="whitespace-nowrap">Pagamento</TableHead>
              <TableHead className="text-right whitespace-nowrap">Amort+Juros</TableHead>
              <TableHead className="text-right whitespace-nowrap">Seguro</TableHead>
              <TableHead className="text-right whitespace-nowrap">Taxa Adm</TableHead>
              <TableHead className="text-right whitespace-nowrap">Subsidio</TableHead>
              <TableHead className="text-right whitespace-nowrap">Dif.Juros+TR</TableHead>
              <TableHead className="text-right whitespace-nowrap">FGTS</TableHead>
              <TableHead className="text-right whitespace-nowrap">Mora/Multa</TableHead>
              <TableHead className="text-right whitespace-nowrap">Devido</TableHead>
              <TableHead className="text-right whitespace-nowrap">Pago</TableHead>
              <TableHead className="text-right whitespace-nowrap">Diferenca</TableHead>
              <TableHead className="text-center whitespace-nowrap">Dias Atraso</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="w-[60px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedInstallments.map((inst) => (
              <TableRow key={inst.id} className="text-xs">
                <TableCell className="font-medium">
                  {inst.installment_number}
                </TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(inst.due_date)}</TableCell>
                <TableCell className="whitespace-nowrap">{formatDate(inst.payment_date)}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(inst.amortization_amount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(inst.mip_insurance + inst.dfi_insurance)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(inst.admin_fee)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(inst.government_subsidy || 0)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency((inst.interest_differential || 0) + (inst.tr_adjustment || 0))}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(inst.fgts_amount || 0)}
                </TableCell>
                <TableCell className={`text-right ${(inst.mora_amount || 0) + (inst.fine_amount || 0) > 0 ? 'text-red-600 font-medium' : ''}`}>
                  {formatCurrency((inst.mora_amount || 0) + (inst.fine_amount || 0))}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(inst.total_amount)}
                </TableCell>
                <TableCell className="text-right font-medium text-emerald-600">
                  {inst.paid_amount ? formatCurrency(inst.paid_amount) : '-'}
                </TableCell>
                <TableCell className={`text-right ${(inst.payment_difference || 0) !== 0 ? 'text-amber-600' : ''}`}>
                  {formatCurrency(inst.payment_difference || 0)}
                </TableCell>
                <TableCell className={`text-center ${(inst.days_late || 0) > 0 ? 'text-red-600 font-medium' : ''}`}>
                  {inst.days_late || 0}
                </TableCell>
                <TableCell>
                  <Badge className={getMortgageInstallmentStatusBgColor(inst.status)}>
                    {MORTGAGE_INSTALLMENT_STATUS_LABELS[inst.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {(inst.status === 'PENDENTE' || inst.status === 'VENCIDA') && onPayInstallment && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPayInstallment(inst)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-
            {Math.min(startIndex + pageSize, filteredInstallments.length)} de{' '}
            {filteredInstallments.length} parcelas
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
            <span className="text-sm">
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
