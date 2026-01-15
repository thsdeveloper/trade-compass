'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}

export function NavItem({
  href,
  label,
  icon: Icon,
  isActive,
  isCollapsed = false,
  onClick,
}: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70',
        isCollapsed && 'justify-center px-2'
      )}
      title={isCollapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}
