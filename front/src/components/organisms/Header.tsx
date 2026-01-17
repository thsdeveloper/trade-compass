'use client';

import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { Button } from '@/components/ui/button';
import { UserNav } from '@/components/molecules/UserNav';
import { NewFinanceButton } from '@/components/molecules/NewFinanceButton';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { isCollapsed } = useSidebar();

  // Mock notification count - replace with real data
  const notificationCount = 3;
  const hasNotifications = notificationCount > 0;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 hidden h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:flex',
        'transition-[padding-left] duration-200 ease-in-out',
        isCollapsed ? 'lg:pl-[calc(4rem+1.5rem)]' : 'lg:pl-[calc(16rem+1.5rem)]',
        className
      )}
    >
      {/* Left side - New button */}
      <NewFinanceButton />

      {/* Right side - Notifications and User */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground transition-colors duration-150 hover:text-foreground"
          title="Notificacoes"
        >
          <Bell className="h-[18px] w-[18px]" />
          {hasNotifications && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex items-center justify-center',
                'h-4 min-w-4 rounded-full bg-destructive px-1',
                'font-mono text-[10px] font-medium leading-none text-white',
                'animate-in fade-in-0 zoom-in-50 duration-150'
              )}
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </Button>

        {/* User avatar with dropdown */}
        <UserNav variant="header" />
      </div>
    </header>
  );
}
