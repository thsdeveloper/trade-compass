'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Compass, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '#features', label: 'Funcionalidades' },
  { href: '#how-it-works', label: 'Como Funciona' },
  { href: '#pricing', label: 'Preços' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingHeader() {
  const { user, loading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
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

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                  isScrolled
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    : 'text-slate-100 hover:text-white hover:bg-white/10'
                )}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            {loading ? (
              <div
                className={cn(
                  'h-10 w-28 animate-pulse rounded-full',
                  isScrolled ? 'bg-slate-100' : 'bg-white/10'
                )}
              />
            ) : user ? (
              <Button asChild className="rounded-full px-6 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/20">
                <Link href="/financas">Ir para o Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  asChild
                  className={cn(
                    'rounded-full px-5',
                    isScrolled
                      ? 'text-slate-600 hover:text-slate-900'
                      : 'text-slate-100 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Link href="/login">Entrar</Link>
                </Button>
                <Button asChild className="rounded-full px-6 bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-950/20">
                  <Link href="/cadastro">Começar Grátis</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'rounded-full',
                  isScrolled
                    ? 'text-slate-900 hover:bg-slate-100'
                    : 'text-white hover:bg-white/10 hover:text-white'
                )}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] bg-white/95 backdrop-blur-xl">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2.5">
                  <div className="rounded-xl bg-blue-600 p-2">
                    <Compass className="h-4 w-4 text-white" />
                  </div>
                  MoneyCompass
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-8 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => scrollToSection(link.href)}
                    className="text-left text-base font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl px-4 py-3 transition-all"
                  >
                    {link.label}
                  </button>
                ))}
                <hr className="my-4 border-slate-100" />
                {loading ? (
                  <div className="h-12 bg-slate-100 animate-pulse rounded-full" />
                ) : user ? (
                  <Button asChild className="w-full rounded-full bg-blue-600 hover:bg-blue-500 text-white">
                    <Link href="/financas">Ir para o Dashboard</Link>
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button variant="outline" asChild className="w-full rounded-full">
                      <Link href="/login">Entrar</Link>
                    </Button>
                    <Button asChild className="w-full rounded-full bg-blue-600 hover:bg-blue-500 text-white">
                      <Link href="/cadastro">Começar Grátis</Link>
                    </Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
