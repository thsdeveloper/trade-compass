'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';

export function WaitlistFooter() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="rounded-xl bg-blue-600 p-2">
              <Compass className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">MoneyCompass</span>
          </Link>

          <p className="text-sm text-slate-500 text-center sm:text-right">
            &copy; {new Date().getFullYear()} MoneyCompass. Todos os direitos reservados.
          </p>
        </div>

        <p className="mt-6 text-xs text-slate-500 text-center sm:text-left max-w-2xl">
          Este produto não constitui aconselhamento financeiro. Consulte um profissional para
          decisões de investimento.
        </p>
      </div>
    </footer>
  );
}
