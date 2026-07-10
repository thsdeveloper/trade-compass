'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2, Loader2, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ConfirmVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void | Promise<void>;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
}: ConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirm action failed:', error);
    } finally {
      setLoading(false);
    }
  }, [onConfirm, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={false}>
        <DialogHeader className="flex-row items-start gap-4 text-left">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              config.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', config.iconColor)} />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9"
          >
            {cancelLabel}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className={cn('h-9', config.buttonClass)}
          >
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook para facilitar o uso do ConfirmDialog
interface UseConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmState {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  options: UseConfirmOptions;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    onConfirm: () => {},
    options: { title: '', description: '' },
  });

  const confirm = useCallback(
    (options: UseConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({
          open: true,
          onConfirm: () => resolve(true),
          options,
        });
      });
    },
    []
  );

  const handleOpenChange = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  const ConfirmDialogComponent = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      title={state.options.title}
      description={state.options.description}
      confirmLabel={state.options.confirmLabel}
      cancelLabel={state.options.cancelLabel}
      variant={state.options.variant}
      onConfirm={state.onConfirm}
    />
  );

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}

// Componente de confirmacao de exclusao especifico
interface DeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
}

export function DeleteConfirm({
  open,
  onOpenChange,
  itemName,
  itemType = 'item',
  onConfirm,
}: DeleteConfirmProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Excluir ${itemType}`}
      description={`Tem certeza que deseja excluir "${itemName}"? Esta ação não pode ser desfeita.`}
      confirmLabel="Excluir"
      cancelLabel="Cancelar"
      variant="danger"
      onConfirm={onConfirm}
    />
  );
}

// ==================== ALERT DIALOG ====================

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  buttonLabel?: string;
  variant?: AlertVariant;
}

const alertVariantConfig = {
  error: {
    icon: AlertCircle,
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
    buttonClass: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-500',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  success: {
    icon: Info,
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
    buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
};

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  buttonLabel = 'OK',
  variant = 'warning',
}: AlertDialogProps) {
  const config = alertVariantConfig[variant];
  const Icon = config.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]" showCloseButton={false}>
        <DialogHeader className="flex-row items-start gap-4 text-left">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              config.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', config.iconColor)} />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-base font-semibold text-slate-900">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            size="sm"
            onClick={() => onOpenChange(false)}
            className={cn('h-9', config.buttonClass)}
          >
            {buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook para facilitar o uso do AlertDialog
interface UseAlertOptions {
  title: string;
  description: string;
  buttonLabel?: string;
  variant?: AlertVariant;
}

interface AlertState {
  open: boolean;
  options: UseAlertOptions;
}

export function useAlert() {
  const [state, setState] = useState<AlertState>({
    open: false,
    options: { title: '', description: '' },
  });

  const alert = useCallback((options: UseAlertOptions) => {
    setState({
      open: true,
      options,
    });
  }, []);

  const handleOpenChange = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, open }));
  }, []);

  const AlertDialogComponent = (
    <AlertDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      title={state.options.title}
      description={state.options.description}
      buttonLabel={state.options.buttonLabel}
      variant={state.options.variant}
    />
  );

  return { alert, AlertDialog: AlertDialogComponent };
}
