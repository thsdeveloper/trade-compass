'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Check, CreditCard, Pencil, X, ArrowLeftRight } from 'lucide-react';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
import { DataTableColumnHeader, createSelectColumn } from '@/components/molecules/DataTable';
import { cn } from '@/lib/utils';
import type { TransactionWithDetails, TransactionStatus } from '@/types/finance';
import { formatCurrency, TRANSACTION_STATUS_LABELS } from '@/types/finance';

interface ColumnOptions {
  onPay?: (transaction: TransactionWithDetails) => void;
  onEdit?: (transaction: TransactionWithDetails) => void;
  onCancel?: (transaction: TransactionWithDetails) => void;
  getInvoiceDueDate?: (dueDate: string, closingDay: number, dueDay: number) => string;
  enableSelection?: boolean;
}

const getStatusStyles = (status: TransactionStatus) => {
  switch (status) {
    case 'PAGO':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'PENDENTE':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'VENCIDO':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'CANCELADO':
      return 'bg-slate-50 text-slate-500 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

export function getTransactionColumns(
  options: ColumnOptions = {}
): ColumnDef<TransactionWithDetails>[] {
  const { onPay, onEdit, onCancel, getInvoiceDueDate, enableSelection } = options;

  const columns: ColumnDef<TransactionWithDetails>[] = [];

  if (enableSelection) {
    columns.push(createSelectColumn<TransactionWithDetails>());
  }

  columns.push(
    {
      accessorKey: 'description',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Descricao" />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-slate-900">
                {transaction.description}
              </p>
              {transaction.transfer_id && (
                <span title={`Transferencia ${transaction.type === 'DESPESA' ? 'para' : 'de'} ${transaction.transfer_counterpart_account?.name || 'outra conta'}`}>
                  <ArrowLeftRight className="h-3.5 w-3.5 text-blue-500" />
                </span>
              )}
              {transaction.credit_card_id && (
                <span title={transaction.credit_card?.name}>
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                </span>
              )}
            </div>
            {transaction.transfer_id && transaction.transfer_counterpart_account && (
              <p className="text-xs text-blue-500">
                {transaction.type === 'DESPESA' ? 'Para: ' : 'De: '}
                {transaction.transfer_counterpart_account.name}
              </p>
            )}
            {transaction.installment_number && (
              <p className="text-xs text-slate-400">
                Parcela {transaction.installment_number}/
                {transaction.total_installments}
              </p>
            )}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {transaction.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: '#6366f115',
                      color: '#6366f1',
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'category.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Categoria" />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="flex items-center gap-2">
            <CategoryIcon
              icon={transaction.category?.icon}
              color={transaction.category?.color}
              size="xs"
            />
            <span className="text-sm text-slate-600">
              {transaction.category?.name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'account.name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Conta" />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="flex items-center gap-1.5">
            {transaction.credit_card && (
              <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            )}
            <span className="text-sm text-slate-600">
              {transaction.credit_card?.name || transaction.account?.name || '-'}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'due_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vencimento" />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <span className="text-sm tabular-nums text-slate-600">
            {new Date(transaction.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        );
      },
    },
    {
      accessorKey: 'payment_date',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Dt. Pagamento" />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        if (!transaction.payment_date) return <span className="text-sm text-slate-400">-</span>;
        return (
          <span className="text-sm tabular-nums text-slate-600">
            {new Date(transaction.payment_date + 'T12:00:00').toLocaleDateString('pt-BR')}
          </span>
        );
      },
    },
    {
      accessorKey: 'amount',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Valor" className="justify-end" />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <span
            className={cn(
              'text-sm font-medium tabular-nums',
              transaction.type === 'RECEITA'
                ? 'text-emerald-600'
                : transaction.type === 'TRANSFERENCIA' || transaction.transfer_id
                  ? 'text-blue-600'
                  : 'text-red-600'
            )}
          >
            {transaction.type === 'RECEITA' ? '+' : '-'}
            {formatCurrency(Math.abs(transaction.amount))}
          </span>
        );
      },
      meta: {
        className: 'text-right',
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <span
            className={cn(
              'inline-flex rounded-md border px-2 py-0.5 text-xs font-medium',
              transaction.transfer_id
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : transaction.credit_card_id && transaction.status === 'PENDENTE'
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : getStatusStyles(transaction.status)
            )}
          >
            {transaction.transfer_id
              ? 'Transferencia'
              : transaction.credit_card_id && transaction.credit_card && transaction.status === 'PENDENTE' && getInvoiceDueDate
                ? `Na fatura de ${getInvoiceDueDate(transaction.due_date, transaction.credit_card.closing_day, transaction.credit_card.due_day)}`
                : TRANSACTION_STATUS_LABELS[transaction.status]}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Acoes</span>,
      cell: ({ row }) => {
        const transaction = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            {transaction.status === 'PENDENTE' && !transaction.credit_card_id && !transaction.transfer_id && onPay && (
              <button
                onClick={() => onPay(transaction)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                title="Marcar como pago"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {!transaction.transfer_id && onEdit && (
              <button
                onClick={() => onEdit(transaction)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                title="Editar"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {transaction.status !== 'CANCELADO' && (transaction.transfer_id || transaction.status !== 'PAGO') && onCancel && (
              <button
                onClick={() => onCancel(transaction)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title={transaction.transfer_id ? 'Cancelar transferencia' : 'Cancelar'}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      },
      meta: {
        className: 'text-right',
      },
    }
  );

  return columns;
}
