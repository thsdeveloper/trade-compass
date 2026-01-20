'use client';

import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { UserNav } from '@/components/molecules/UserNav';
import { NewFinanceButton } from '@/components/molecules/NewFinanceButton';
import { NotificationDropdown } from '@/components/molecules/NotificationDropdown';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const { isCollapsed } = useSidebar();

  return (
    <header
      className={cn(
        'sticky top-0 z-30 hidden h-14 items-center justify-between gap-2 border-b border-sidebar-border bg-sidebar px-6 lg:flex',
        'transition-[padding-left] duration-200 ease-in-out',
        isCollapsed ? 'lg:pl-[calc(4rem+1.5rem)]' : 'lg:pl-[calc(16rem+1.5rem)]',
        className
      )}
    >
      {/* Left side - New button */}
      <NewFinanceButton />

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
