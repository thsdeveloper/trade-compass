'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageShell>
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-5 w-5 text-red-500" />
        <p className="text-sm text-slate-500">
          {error.message || 'Ocorreu um erro ao carregar a pagina'}
        </p>
        <Button variant="outline" size="sm" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </PageShell>
  );
}
