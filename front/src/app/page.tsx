import { PageShell } from '@/components/organisms/PageShell';
import { TickerInput } from '@/components/atoms/TickerInput';
import { WatchlistAssets } from '@/components/molecules/WatchlistAssets';
import { Compass } from 'lucide-react';

export default function HomePage() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-12 sm:py-20">
        {/* Hero */}
        <div className="mb-10 flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Compass className="h-12 w-12 text-primary sm:h-16 sm:w-16" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            TradeCompass
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Clareza para decidir. Dados para navegar o mercado.
          </p>
        </div>

        {/* Input */}
        <div className="w-full max-w-md">
          <TickerInput />
        </div>

        {/* Lista de ativos da watchlist do usuario */}
        <WatchlistAssets />

        {/* Features */}
        <div className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="text-center">
            <div className="mb-2 text-2xl">📊</div>
            <h3 className="font-semibold">Contexto de Mercado</h3>
            <p className="text-sm text-muted-foreground">
              Tendencia, volume e volatilidade em um olhar.
            </p>
          </div>
          <div className="text-center">
            <div className="mb-2 text-2xl">🎯</div>
            <h3 className="font-semibold">Zonas de Decisao</h3>
            <p className="text-sm text-muted-foreground">
              Identificacao clara de momentos favoraveis.
            </p>
          </div>
          <div className="text-center">
            <div className="mb-2 text-2xl">📋</div>
            <h3 className="font-semibold">Setups Monitorados</h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe padroes tecnicos em formacao.
            </p>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
