'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageShell } from '@/components/organisms/PageShell';

export default function FinanciamentosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Financiamentos error:', error);
  }, [error]);

  return (
    <PageShell
      title="Financiamentos"
      description="Gerencie seus financiamentos imobiliarios"
    >
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-red-100 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h3 className="font-semibold text-lg mb-1">Erro ao carregar</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Ocorreu um erro ao carregar os financiamentos. Tente novamente.
        </p>
        <Button onClick={reset}>Tentar novamente</Button>
      </div>
    </PageShell>
  );
}
