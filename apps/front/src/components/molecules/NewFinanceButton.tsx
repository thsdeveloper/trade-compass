'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Receipt,
  AlertCircle,
  Wallet,
  CreditCard,
  Tag,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFinanceDialogs, type FinanceDialogType } from '@/contexts/FinanceDialogContext';
import { cn } from '@/lib/utils';

interface NewFinanceButtonProps {
  className?: string;
  variant?: 'default' | 'icon';
}

const menuItems: Array<{
  type: FinanceDialogType;
  label: string;
  icon: typeof Receipt;
  group: 'primary' | 'secondary';
}> = [
  { type: 'transaction', label: 'Nova Transacao', icon: Receipt, group: 'primary' },
  { type: 'goal', label: 'Novo Objetivo', icon: Target, group: 'primary' },
  { type: 'debt', label: 'Nova Divida', icon: AlertCircle, group: 'primary' },
  { type: 'account', label: 'Nova Conta', icon: Wallet, group: 'secondary' },
  { type: 'creditCard', label: 'Novo Cartao', icon: CreditCard, group: 'secondary' },
  { type: 'category', label: 'Nova Categoria', icon: Tag, group: 'secondary' },
];

// Componente interno que usa o hook (so renderiza quando tem provider)
function NewFinanceButtonContent({ className, variant }: NewFinanceButtonProps) {
  const { openDialog } = useFinanceDialogs();

  // Defer dialog opening to avoid focus conflicts between DropdownMenu and Dialog
  const handleOpenDialog = useCallback((type: FinanceDialogType) => {
    // Use requestAnimationFrame to wait for DropdownMenu to fully close
    // before opening the Dialog, preventing focus management conflicts
    requestAnimationFrame(() => {
      openDialog(type);
    });
  }, [openDialog]);

  const primaryItems = menuItems.filter((item) => item.group === 'primary');
  const secondaryItems = menuItems.filter((item) => item.group === 'secondary');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'icon' ? (
          <Button
            size="icon"
            variant="ghost"
            className={cn('h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground', className)}
            title="Novo"
          >
            <Plus className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            size="sm"
            className={cn(
              'h-8 bg-white text-sidebar text-sm font-medium hover:bg-white/90',
              className
            )}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Novo
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {primaryItems.map((item) => (
          <DropdownMenuItem
            key={item.type}
            onSelect={() => handleOpenDialog(item.type)}
            className="cursor-pointer"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {secondaryItems.map((item) => (
          <DropdownMenuItem
            key={item.type}
            onSelect={() => handleOpenDialog(item.type)}
            className="cursor-pointer"
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Componente wrapper que verifica pathname antes de renderizar
export function NewFinanceButton({ className, variant = 'default' }: NewFinanceButtonProps) {
  const pathname = usePathname();

  // So mostra em rotas de financas (onde o provider existe)
  if (!pathname.startsWith('/financas')) {
    return null;
  }

  return <NewFinanceButtonContent className={className} variant={variant} />;
}
