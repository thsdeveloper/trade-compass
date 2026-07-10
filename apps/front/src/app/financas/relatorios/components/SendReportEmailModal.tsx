'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, Send } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { toast } from '@/lib/toast';
import type { ReportType } from '@/types/reports';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  'cash-flow': 'Fluxo de Caixa',
  'budget-analysis': 'Analise de Orcamento',
  'category-breakdown': 'Gastos por Categoria',
  'payment-methods': 'Formas de Pagamento',
  'goals-progress': 'Progresso dos Objetivos',
  'recurring-analysis': 'Gastos Fixos vs Variaveis',
  'yoy-comparison': 'Comparativo Anual',
};

interface SendReportEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: ReportType;
  startDate: string;
  endDate: string;
  includePending: boolean;
  selectedYears?: number[];
  userEmail?: string;
}

export function SendReportEmailModal({
  open,
  onOpenChange,
  reportType,
  startDate,
  endDate,
  includePending,
  selectedYears,
  userEmail,
}: SendReportEmailModalProps) {
  const [email, setEmail] = useState(userEmail || '');
  const [emailError, setEmailError] = useState<string | null>(null);

  const sendReportMutation = trpc.email.sendReport.useMutation({
    onSuccess: () => {
      toast.success('Relatorio enviado com sucesso!');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.apiError(error, 'Erro ao enviar relatorio');
    },
  });

  useEffect(() => {
    if (open && userEmail) {
      setEmail(userEmail);
    }
  }, [open, userEmail]);

  useEffect(() => {
    if (!open) {
      setEmailError(null);
    }
  }, [open]);

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!value.trim()) {
      setEmailError('Email e obrigatorio');
      return false;
    }
    if (!emailRegex.test(value)) {
      setEmailError('Email invalido');
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      return;
    }

    sendReportMutation.mutate({
      email,
      reportType,
      startDate,
      endDate,
      includePending,
      selectedYears: reportType === 'yoy-comparison' ? selectedYears : undefined,
    });
  };

  const formatDateBR = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Enviar Relatorio por E-mail
          </DialogTitle>
          <DialogDescription>
            O relatorio sera enviado em PDF para o e-mail informado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Report info */}
            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="mb-2">
                <span className="text-slate-500">Tipo:</span>{' '}
                <span className="font-medium text-slate-700">
                  {REPORT_TYPE_LABELS[reportType]}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Periodo:</span>{' '}
                <span className="font-medium text-slate-700">
                  {reportType === 'yoy-comparison' && selectedYears
                    ? selectedYears.join(', ')
                    : `${formatDateBR(startDate)} a ${formatDateBR(endDate)}`}
                </span>
              </div>
            </div>

            {/* Email input */}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) validateEmail(e.target.value);
                }}
                onBlur={() => validateEmail(email)}
                aria-invalid={!!emailError}
                disabled={sendReportMutation.isPending}
              />
              {emailError && (
                <p className="text-sm text-red-500">{emailError}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sendReportMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={sendReportMutation.isPending}>
              {sendReportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
