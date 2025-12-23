'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Loader2 } from 'lucide-react';

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (ticker: string, notes?: string) => Promise<void>;
}

export function AddAssetDialog({
  open,
  onOpenChange,
  onAdd,
}: AddAssetDialogProps) {
  const [ticker, setTicker] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateTicker = (value: string): boolean => {
    const regex = /^[A-Z]{4}[0-9]{1,2}$/;
    return regex.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = ticker.trim().toUpperCase();

    if (!validateTicker(normalized)) {
      setError('Ticker invalido. Ex: PETR4, VALE3');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onAdd(normalized, notes || undefined);
      setTicker('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar ativo');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setTicker(normalized);
    if (error) setError('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setTicker('');
      setNotes('');
      setError('');
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Ativo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ticker</label>
            <Input
              type="text"
              placeholder="Ex: PETR4"
              value={ticker}
              onChange={(e) => handleChange(e.target.value)}
              className="uppercase"
              maxLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notas (opcional)</label>
            <Input
              type="text"
              placeholder="Suas anotacoes sobre o ativo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !ticker.trim()}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
