'use client';

import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <PageShell>
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <p className="text-sm text-slate-500">
          {error.message || 'Ocorreu um erro ao carregar os objetivos'}
        </p>
        <Button variant="outline" size="sm" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </PageShell>
  );
}
