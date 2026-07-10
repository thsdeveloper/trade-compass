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
import { ChevronLeft, ChevronRight, Clock, TrendingDown, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MortgageExtraPayment } from '@/types/finance';
import { formatCurrency, MORTGAGE_EXTRA_PAYMENT_TYPE_LABELS } from '@/types/finance';

interface MortgageExtraPaymentsTableProps {
  extraPayments: MortgageExtraPayment[];
  pageSize?: number;
}

export function MortgageExtraPaymentsTable({
  extraPayments,
  pageSize = 10,
}: MortgageExtraPaymentsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(extraPayments.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedPayments = extraPayments.slice(startIndex, startIndex + pageSize);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const getTypeIcon = (type: string) => {
    return type === 'REDUCE_TERM' ? (
      <Clock className="h-3.5 w-3.5" />
    ) : (
      <TrendingDown className="h-3.5 w-3.5" />
    );
  };

  const getTypeBadgeColor = (type: string) => {
    return type === 'REDUCE_TERM'
      ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
  };

  // Calculate totals
  const totalAmount = extraPayments.reduce((sum, p) => sum + p.amount, 0);
  const totalSaved = extraPayments.reduce((sum, p) => sum + (p.interest_saved || 0), 0);
  const totalMonthsReduced = extraPayments.reduce((sum, p) => sum + (p.months_reduced || 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <PiggyBank className="h-4 w-4" />
            Total Amortizado
          </div>
          <p className="text-lg font-semibold">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <TrendingDown className="h-4 w-4" />
            Economia em Juros
          </div>
          <p className="text-lg font-semibold text-emerald-600">{formatCurrency(totalSaved)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Clock className="h-4 w-4" />
            Meses Reduzidos
          </div>
          <p className="text-lg font-semibold text-blue-600">{totalMonthsReduced}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Saldo Antes</TableHead>
              <TableHead className="text-right">Saldo Apos</TableHead>
              <TableHead className="text-right">Economia</TableHead>
              <TableHead className="text-right">Meses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma amortizacao extraordinaria registrada
                </TableCell>
              </TableRow>
            ) : (
              paginatedPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>
                    <Badge className={getTypeBadgeColor(payment.payment_type)}>
                      <span className="flex items-center gap-1">
                        {getTypeIcon(payment.payment_type)}
                        {MORTGAGE_EXTRA_PAYMENT_TYPE_LABELS[payment.payment_type]}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(payment.balance_before)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(payment.balance_after)}
                  </TableCell>
                  <TableCell className="text-right text-emerald-600">
                    {payment.interest_saved ? formatCurrency(payment.interest_saved) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-blue-600">
                    {payment.months_reduced ? `-${payment.months_reduced}` : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + pageSize, extraPayments.length)}{' '}
            de {extraPayments.length} amortizacoes
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
