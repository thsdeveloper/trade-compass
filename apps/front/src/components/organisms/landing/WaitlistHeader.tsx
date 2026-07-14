'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function WaitlistHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToForm = () => {
    document.querySelector('#waitlist')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-xl bg-blue-600 p-2">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <span
              className={cn(
                'text-xl font-bold transition-colors',
                isScrolled ? 'text-slate-900' : 'text-white'
              )}
            >
              MoneyCompass
            </span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              asChild
              className={cn(
                'hidden sm:inline-flex rounded-full px-4 sm:px-5',
                isScrolled
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-100 hover:text-white hover:bg-white/10'
              )}
            >
              <Link href="/login">Entrar</Link>
            </Button>
            <Button
              onClick={scrollToForm}
              className="rounded-full px-5 sm:px-6 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/20"
            >
              Entrar na lista
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
