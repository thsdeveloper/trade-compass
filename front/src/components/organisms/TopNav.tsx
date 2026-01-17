'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { MobileNav } from '@/components/organisms/MobileNav';
import { UserNav } from '@/components/molecules';
import { NewFinanceButton } from '@/components/molecules/NewFinanceButton';

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        {/* Mobile hamburger menu */}
        <MobileNav />

        {/* Logo - centered */}
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Compass className="h-5 w-5 text-primary" />
          <span className="font-semibold">MoneyCompass</span>
        </Link>

        {/* User actions */}
        <div className="flex items-center gap-1">
          <NewFinanceButton variant="icon" />
          <UserNav />
        </div>
      </div>
    </header>
  );
}
