'use client';

import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavItem } from '@/components/atoms/NavItem';

interface NavGroupItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroupProps {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavGroupItem[];
  isExpanded: boolean;
  isCollapsed?: boolean;
  onToggle: () => void;
  onItemClick?: () => void;
}

export function NavGroup({
  id,
  label,
  icon: Icon,
  items,
  isExpanded,
  isCollapsed = false,
  onToggle,
  onItemClick,
}: NavGroupProps) {
  const pathname = usePathname();

  // Check if any child item is active
  const isGroupActive = items.some((item) => pathname === item.href);

  // In collapsed mode, show as a simple button that expands on hover/click
  if (isCollapsed) {
    return (
      <div className="relative group">
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
            'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            isGroupActive
              ? 'bg-sidebar-accent text-sidebar-accent-foreground'
              : 'text-sidebar-foreground/70'
          )}
          title={label}
        >
          <Icon className="h-4 w-4 shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div data-nav-group={id}>
      {/* Group Header */}
      <button
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
          isGroupActive
            ? 'text-sidebar-accent-foreground'
            : 'text-sidebar-foreground/70'
        )}
        aria-expanded={isExpanded}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Collapsible Content with CSS Grid Animation */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-sidebar-border pl-3">
            {items.map((item) => (
              <NavItem
                key={item.id}
                href={item.href}
                label={item.label}
                icon={item.icon}
                isActive={pathname === item.href}
                onClick={onItemClick}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
