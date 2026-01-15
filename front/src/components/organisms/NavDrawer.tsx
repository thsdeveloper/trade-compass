'use client';

import Link from 'next/link';
import {
  Compass,
  PanelLeftClose,
  PanelLeft,
  Wallet,
  Receipt,
  Building2,
  CreditCard,
  Tags,
  CandlestickChart,
  BarChart3,
  Eye,
  Bell,
  FileWarning,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NavGroup } from '@/components/molecules/NavGroup';
import { UserNav } from '@/components/molecules/UserNav';

// Navigation configuration
const navigationConfig = [
  {
    id: 'financas',
    label: 'Financas',
    icon: Wallet,
    requiresAuth: true,
    items: [
      { id: 'transacoes', label: 'Transacoes', href: '/financas', icon: Receipt },
      { id: 'dividas', label: 'Dividas', href: '/financas/dividas', icon: FileWarning },
      { id: 'contas', label: 'Contas', href: '/financas/contas', icon: Building2 },
      { id: 'cartoes', label: 'Cartoes', href: '/financas/cartoes', icon: CreditCard },
      { id: 'categorias', label: 'Categorias', href: '/financas/categorias', icon: Tags },
    ],
  },
  {
    id: 'daytrade',
    label: 'Day Trade',
    icon: CandlestickChart,
    requiresAuth: true,
    items: [
      { id: 'backtest', label: 'Backtest', href: '/backtest', icon: BarChart3 },
      { id: 'watchlist', label: 'Watchlist', href: '/watchlist', icon: Eye },
      { id: 'alertas', label: 'Alertas', href: '/alerts', icon: Bell },
    ],
  },
];

interface NavDrawerProps {
  className?: string;
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

export function NavDrawer({
  className,
  variant = 'desktop',
  onNavigate,
}: NavDrawerProps) {
  const { isCollapsed, toggleCollapsed, isGroupExpanded, toggleGroup } = useSidebar();
  const { user } = useAuth();

  const isMobile = variant === 'mobile';
  const showCollapsed = !isMobile && isCollapsed;

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar',
        // Desktop: fixed sidebar
        !isMobile && [
          'fixed inset-y-0 left-0 z-40 border-r border-sidebar-border',
          'transition-[width] duration-200 ease-in-out',
          isCollapsed ? 'w-16' : 'w-64',
        ],
        // Mobile: full height in sheet
        isMobile && 'h-full w-full',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border px-4',
          showCollapsed && 'justify-center px-2'
        )}
      >
        {!showCollapsed && (
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-2 font-semibold text-sidebar-foreground"
          >
            <Compass className="h-5 w-5 text-sidebar-primary" />
            <span>MoneyCompass</span>
          </Link>
        )}

        {showCollapsed && (
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center justify-center"
            title="MoneyCompass"
          >
            <Compass className="h-5 w-5 text-sidebar-primary" />
          </Link>
        )}

        {/* Desktop collapse toggle */}
        {!isMobile && !showCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="ml-auto h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            title="Recolher menu"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}

        {!isMobile && showCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            title="Expandir menu"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {navigationConfig.map((group) => {
            // Hide auth-required groups for non-authenticated users
            if (group.requiresAuth && !user) {
              return null;
            }

            return (
              <NavGroup
                key={group.id}
                id={group.id}
                label={group.label}
                icon={group.icon}
                items={group.items}
                isExpanded={isGroupExpanded(group.id)}
                isCollapsed={showCollapsed}
                onToggle={() => toggleGroup(group.id)}
                onItemClick={onNavigate}
              />
            );
          })}
        </div>
      </nav>

      {/* Footer with UserNav */}
      <div
        className={cn(
          'border-t border-sidebar-border p-4',
          showCollapsed && 'flex justify-center p-2'
        )}
      >
        {!showCollapsed ? (
          <UserNav />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UserNav />
          </div>
        )}
      </div>
    </aside>
  );
}
