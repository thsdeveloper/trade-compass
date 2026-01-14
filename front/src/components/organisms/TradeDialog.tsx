'use client';

import { useState, useEffect, useRef } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react';
import type {
  DayTrade,
  DayTradeFormData,
  FuturesAsset,
  TradeDirection,
} from '@/types/daytrade';

interface TradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: DayTradeFormData) => Promise<void>;
  trade?: DayTrade | null;
  getImageUrl?: (path: string) => string;
}

// Convert ISO UTC string to local datetime-local format (YYYY-MM-DDTHH:mm)
function isoToLocalDatetime(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Get current local datetime in datetime-local format
function getCurrentLocalDatetime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function TradeDialog({
  open,
  onOpenChange,
  onSave,
  trade,
  getImageUrl,
}: TradeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<DayTradeFormData>({
    asset: 'WINFUT',
    direction: 'BUY',
    contracts: 1,
    entry_price: 0,
    exit_price: undefined,
    entry_time: new Date().toISOString().slice(0, 16),
    exit_time: undefined,
    mep: undefined,
    men: undefined,
    notes: '',
    image_path: undefined,
    image_file: undefined,
  });

  useEffect(() => {
    if (trade) {
      setFormData({
        asset: trade.asset,
        direction: trade.direction,
        contracts: trade.contracts,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price ?? undefined,
        entry_time: isoToLocalDatetime(trade.entry_time),
        exit_time: trade.exit_time ? isoToLocalDatetime(trade.exit_time) : undefined,
        mep: trade.mep ?? undefined,
        men: trade.men ?? undefined,
        notes: trade.notes ?? '',
        image_path: trade.image_path ?? undefined,
        image_file: undefined,
      });
      // Set image preview if trade has an image
      if (trade.image_path && getImageUrl) {
        setImagePreview(getImageUrl(trade.image_path));
      } else {
        setImagePreview(null);
      }
    } else {
      setFormData({
        asset: 'WINFUT',
        direction: 'BUY',
        contracts: 1,
        entry_price: 0,
        exit_price: undefined,
        entry_time: getCurrentLocalDatetime(),
        exit_time: undefined,
        mep: undefined,
        men: undefined,
        notes: '',
        image_path: undefined,
        image_file: undefined,
      });
      setImagePreview(null);
    }
  }, [trade, open, getImageUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return;
      }
      setFormData({ ...formData, image_file: file, image_path: undefined });
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData({ ...formData, image_file: undefined, image_path: undefined });
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!trade;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            {isEditing ? 'Editar Trade' : 'Novo Trade'}
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {isEditing
              ? 'Atualize os dados do trade realizado.'
              : 'Registre um novo trade de day trade.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset" className="text-[12px] font-medium">Ativo</Label>
              <Select
                value={formData.asset}
                onValueChange={(value: FuturesAsset) =>
                  setFormData({ ...formData, asset: value })
                }
              >
                <SelectTrigger id="asset" className="h-9 text-[13px]">
                  <SelectValue placeholder="Selecione o ativo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WINFUT">WINFUT</SelectItem>
                  <SelectItem value="WDOFUT">WDOFUT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direction" className="text-[12px] font-medium">Direcao</Label>
              <Select
                value={formData.direction}
                onValueChange={(value: TradeDirection) =>
                  setFormData({ ...formData, direction: value })
                }
              >
                <SelectTrigger id="direction" className="h-9 text-[13px]">
                  <SelectValue placeholder="Selecione a direcao" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">Compra</SelectItem>
                  <SelectItem value="SELL">Venda</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contracts" className="text-[12px] font-medium">Quantidade de Contratos</Label>
            <Input
              id="contracts"
              type="number"
              min={1}
              value={formData.contracts}
              onChange={(e) =>
                setFormData({ ...formData, contracts: parseInt(e.target.value) || 1 })
              }
              className="h-9 text-[13px]"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_price" className="text-[12px] font-medium">Preco de Entrada</Label>
              <Input
                id="entry_price"
                type="number"
                step="0.01"
                value={formData.entry_price || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    entry_price: parseFloat(e.target.value) || 0,
                  })
                }
                className="h-9 text-[13px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_price" className="text-[12px] font-medium">Preco de Saida</Label>
              <Input
                id="exit_price"
                type="number"
                step="0.01"
                value={formData.exit_price ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    exit_price: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  })
                }
                className="h-9 text-[13px]"
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entry_time" className="text-[12px] font-medium">Data/Hora Entrada</Label>
              <Input
                id="entry_time"
                type="datetime-local"
                value={formData.entry_time}
                onChange={(e) =>
                  setFormData({ ...formData, entry_time: e.target.value })
                }
                className="h-9 text-[13px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exit_time" className="text-[12px] font-medium">Data/Hora Saida</Label>
              <Input
                id="exit_time"
                type="datetime-local"
                value={formData.exit_time ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    exit_time: e.target.value || undefined,
                  })
                }
                className="h-9 text-[13px]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mep" className="text-[12px] font-medium">MEP (pontos)</Label>
              <Input
                id="mep"
                type="number"
                step="0.5"
                min="0"
                value={formData.mep ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    mep: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="h-9 text-[13px]"
                placeholder="Max. Excursao Positiva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="men" className="text-[12px] font-medium">MEN (pontos)</Label>
              <Input
                id="men"
                type="number"
                step="0.5"
                min="0"
                value={formData.men ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    men: e.target.value ? parseFloat(e.target.value) : undefined,
                  })
                }
                className="h-9 text-[13px]"
                placeholder="Max. Excursao Negativa"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-[12px] font-medium">Observacoes</Label>
            <Input
              id="notes"
              value={formData.notes ?? ''}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="h-9 text-[13px]"
              placeholder="Anotacoes sobre o trade..."
            />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-2">
            <Label className="text-[12px] font-medium">Imagem da Operacao</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative rounded-lg border bg-muted/30 p-2">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-full rounded-md object-cover"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-3 top-3 h-7 w-7 bg-background/80 hover:bg-background"
                  onClick={handleRemoveImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 py-6 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50"
              >
                <div className="rounded-full bg-muted p-2">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-medium">Clique para anexar imagem</p>
                  <p className="text-[11px] text-muted-foreground/70">PNG, JPG ate 5MB</p>
                </div>
              </button>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 text-[13px]"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="h-8 px-4 text-[13px]">
              {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isEditing ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
