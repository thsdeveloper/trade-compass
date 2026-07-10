'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { financeApi } from '@/lib/finance-api';
import { toast } from '@/lib/toast';

interface ResetTransactionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}

export function ResetTransactionsDialog({
  open,
  onOpenChange,
  onReset,
}: ResetTransactionsDialogProps) {
  const { session } = useAuth();

  const [password, setPassword] = useState('');
  const [zeroInitialBalances, setZeroInitialBalances] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (value: boolean) => {
    if (loading) return;
    if (!value) {
      setPassword('');
      setZeroInitialBalances(false);
      setError(null);
    }
    onOpenChange(value);
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !password || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await financeApi.resetAllTransactions(
        password,
        session.access_token,
        { zeroInitialBalances }
      );

      toast.success(
        `Reset concluído: ${result.transactions_deleted} transação(ões) apagada(s), ` +
          `${result.accounts_reset} conta(s) e ${result.credit_cards_reset} cartão(ões) com saldo restaurado`
      );
      handleOpenChange(false);
      onReset();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao zerar transações';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <ShieldAlert className="h-5 w-5" />
            Zerar todas as transações
          </DialogTitle>
          <DialogDescription>
            Esta ação é <strong>permanente e irreversível</strong>. Confira com
            atenção o que será feito antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-red-700">
              <AlertTriangle className="h-4 w-4" />
              O que será apagado:
            </p>
            <ul className="text-[13px] text-red-700 space-y-1 list-disc pl-5">
              <li>Todas as transações (receitas, despesas e transferências)</li>
              <li>Todos os pagamentos de fatura de cartão</li>
              <li>Todas as recorrências e parcelamentos</li>
              <li>
                {zeroInitialBalances
                  ? 'Saldo das contas (inicial e atual) será zerado (R$ 0,00)'
                  : 'Saldo das contas volta ao saldo inicial cadastrado'}
              </li>
              <li>Limite disponível dos cartões volta ao limite total</li>
            </ul>
            <p className="text-[13px] text-emerald-700 font-medium">
              Serão mantidos: contas, cartões, categorias, tags, metas, dívidas,
              renda fixa e financiamentos.
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={zeroInitialBalances}
              onCheckedChange={(checked) =>
                setZeroInitialBalances(checked === true)
              }
              disabled={loading}
              className="mt-0.5"
            />
            <span className="text-[13px] leading-snug">
              Zerar também o <strong>saldo inicial</strong> das contas
              <span className="block text-muted-foreground text-[12px]">
                Todas as contas ficam com R$ 0,00 — a aplicação volta 100% do
                zero. Sem marcar, o saldo volta ao valor inicial cadastrado em
                cada conta.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="reset-password" className="text-xs font-medium">
              Digite sua senha para confirmar{' '}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Sua senha de acesso"
              className="h-9 text-[13px]"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!password || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Zerando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Zerar transações
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
