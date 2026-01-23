'use client';

import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { TopNav } from './TopNav';
import { NavDrawer } from './NavDrawer';
import { Header } from './Header';
import { Footer } from './Footer';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  backHref?: string;
  actions?: React.ReactNode;
}

function PageShellContent({ children, title, description, backHref, actions }: PageShellProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen">
      {/* Mobile TopNav - hidden on desktop */}
      <TopNav />

      {/* Desktop Sidebar - hidden on mobile */}
      <NavDrawer className="hidden lg:flex" />

      {/* Desktop Header - hidden on mobile */}
      <Header />

      {/* Main content area with sidebar offset on desktop */}
      <div
        className={cn(
          'flex min-h-screen flex-col',
          'lg:transition-[padding-left] lg:duration-200 lg:ease-in-out',
          isCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <main className="flex-1 px-4 py-4 pb-20 lg:px-6">
          {/* Page Header */}
          {(title || backHref || actions) && (
            <div className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {backHref && (
                    <Link href={backHref}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  <div>
                    {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
                    {description && (
                      <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                    )}
                  </div>
                </div>
                {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
              </div>
            </div>
          )}
          {children}
        </main>
        <Footer
          className={cn(
            'lg:transition-[left] lg:duration-200 lg:ease-in-out',
            isCollapsed ? 'left-0 lg:left-16' : 'left-0 lg:left-64'
          )}
        />
      </div>
    </div>
  );
}

export function PageShell({ children, title, description, backHref, actions }: PageShellProps) {
  return (
    <SidebarProvider>
      <PageShellContent
        title={title}
        description={description}
        backHref={backHref}
        actions={actions}
      >
        {children}
      </PageShellContent>
    </SidebarProvider>
  );
}
