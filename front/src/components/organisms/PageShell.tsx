'use client';

import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { TopNav } from './TopNav';
import { NavDrawer } from './NavDrawer';
import { Header } from './Header';
import { Footer } from './Footer';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: React.ReactNode;
}

function PageShellContent({ children }: PageShellProps) {
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
        <main className="container mx-auto flex-1 px-4 py-8 pb-20 lg:px-8">
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

export function PageShell({ children }: PageShellProps) {
  return (
    <SidebarProvider>
      <PageShellContent>{children}</PageShellContent>
    </SidebarProvider>
  );
}
