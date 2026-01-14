'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Eye, Bell, Home, BarChart3, CandlestickChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { UserNav } from '@/components/molecules';

const navItems = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/watchlist', label: 'Watchlist', icon: Eye, requiresAuth: true },
  { href: '/daytrade', label: 'Day Trade', icon: CandlestickChart, requiresAuth: true },
  { href: '/backtest', label: 'Backtest', icon: BarChart3 },
  { href: '/alerts', label: 'Alertas', icon: Bell },
];

export function TopNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Compass className="h-6 w-6 text-primary" />
          <span className="text-xl font-semibold">TradeCompass</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            // Skip auth-required items if not logged in
            if (item.requiresAuth && !user) return null;

            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}

          <div className="ml-4 flex items-center">
            <UserNav />
          </div>
        </nav>
      </div>
    </header>
  );
}
