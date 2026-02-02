'use client';

import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useGlobalSearchOptional } from '@/contexts/GlobalSearchContext';
import { UserNav } from '@/components/molecules/UserNav';
import { NewFinanceButton } from '@/components/molecules/NewFinanceButton';
import { NotificationDropdown } from '@/components/molecules/NotificationDropdown';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { isCollapsed } = useSidebar();
  const globalSearch = useGlobalSearchOptional();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 hidden h-14 items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-6 lg:flex',
        'transition-[padding-left] duration-200 ease-in-out',
        isCollapsed ? 'lg:pl-[calc(4rem+1.5rem)]' : 'lg:pl-[calc(16rem+1.5rem)]',
        className
      )}
    >
      {/* Left side - New button and Search */}
      <div className="flex items-center gap-2">
        <NewFinanceButton />
        {globalSearch && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-64 justify-start text-muted-foreground"
            onClick={globalSearch.openSearch}
          >
            <Search className="mr-2 h-4 w-4" />
            <span className="flex-1 text-left">Buscar...</span>
            <kbd className="ml-2 px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
              Cmd+K
            </kbd>
          </Button>
        )}
      </div>

      {/* Right side - Notifications and User */}
      <div className="flex items-center gap-2">
        {/* Notification dropdown */}
        <NotificationDropdown />

        {/* User avatar with dropdown */}
        <UserNav variant="header" />
      </div>
    </header>
  );
}
