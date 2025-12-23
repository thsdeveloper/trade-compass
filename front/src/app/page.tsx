import { PageShell } from '@/components/organisms/PageShell';
import { TickerInput } from '@/components/atoms/TickerInput';
import { api } from '@/lib/api';
import { Compass } from 'lucide-react';
import Link from 'next/link';

export default async function HomePage() {
  let assets: Array<{ ticker: string; name: string }> = [];

  try {
    assets = await api.getAssets();
  } catch {
    // Fallback para lista vazia se API nao estiver disponivel
  }

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

        {/* Lista de ativos disponiveis */}
        {assets.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Ativos disponiveis:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {assets.map((asset) => (
                <Link
                  key={asset.ticker}
                  href={`/asset/${asset.ticker}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
                >
                  <span className="font-semibold">{asset.ticker}</span>
                  <span className="text-muted-foreground text-xs hidden sm:inline">
                    {asset.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

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
