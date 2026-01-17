'use client';

import { useEffect } from 'react';
import { PageShell } from './PageShell';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('Error boundary caught:', error);
  }, [error]);

  return (
    <PageShell>
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-6 w-6 text-red-500" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Algo deu errado
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {error.message || 'Ocorreu um erro ao carregar os dados'}
          </p>
        </div>
        <Button onClick={reset} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    </PageShell>
  );
}
