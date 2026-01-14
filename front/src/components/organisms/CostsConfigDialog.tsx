'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Settings } from 'lucide-react';
import type { CostsConfig } from '@/types/daytrade';
import { DEFAULT_COSTS } from '@/types/daytrade';

interface CostsConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costsConfig: CostsConfig | null;
  onSave: (winfutCost: number, wdofutCost: number) => Promise<void>;
}

export function CostsConfigDialog({
  open,
  onOpenChange,
  costsConfig,
  onSave,
}: CostsConfigDialogProps) {
  const [loading, setLoading] = useState(false);
  const [winfutCost, setWinfutCost] = useState(DEFAULT_COSTS.WINFUT);
  const [wdofutCost, setWdofutCost] = useState(DEFAULT_COSTS.WDOFUT);

  useEffect(() => {
    if (costsConfig) {
      setWinfutCost(costsConfig.winfut_cost);
      setWdofutCost(costsConfig.wdofut_cost);
    } else {
      setWinfutCost(DEFAULT_COSTS.WINFUT);
      setWdofutCost(DEFAULT_COSTS.WDOFUT);
    }
  }, [costsConfig, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(winfutCost, wdofutCost);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setWinfutCost(DEFAULT_COSTS.WINFUT);
    setWdofutCost(DEFAULT_COSTS.WDOFUT);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurar Custos B3
          </DialogTitle>
          <DialogDescription>
            Configure os custos de emolumentos e registro da B3 por contrato.
            Esses valores serao aplicados automaticamente em todos os trades.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">WINFUT</span>
                <span className="text-xs text-muted-foreground">Mini Indice</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="winfut_cost">Custo por contrato (R$)</Label>
                <Input
                  id="winfut_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={winfutCost}
                  onChange={(e) => setWinfutCost(parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Custo total = R$ {winfutCost.toFixed(2)} x contratos x 2 (entrada + saida)
                </p>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">WDOFUT</span>
                <span className="text-xs text-muted-foreground">Mini Dolar</span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wdofut_cost">Custo por contrato (R$)</Label>
                <Input
                  id="wdofut_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={wdofutCost}
                  onChange={(e) => setWdofutCost(parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Custo total = R$ {wdofutCost.toFixed(2)} x contratos x 2 (entrada + saida)
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Sobre os custos:</p>
            <p>
              Os valores padrao incluem emolumentos e taxa de registro da B3.
              Ajuste conforme os custos da sua corretora.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="outline" onClick={handleReset}>
              Restaurar Padrao
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
