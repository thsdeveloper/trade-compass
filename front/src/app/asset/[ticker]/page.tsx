import { notFound } from 'next/navigation';
import { PageShell } from '@/components/organisms/PageShell';
import { TickerInput } from '@/components/atoms/TickerInput';
import { ContextCards } from '@/components/molecules/ContextCards';
import { DecisionZoneCard } from '@/components/molecules/DecisionZoneCard';
import { SetupList } from '@/components/organisms/SetupList';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Clock } from 'lucide-react';

interface AssetPageProps {
  params: Promise<{ ticker: string }>;
}

export default async function AssetPage({ params }: AssetPageProps) {
  const { ticker } = await params;
  const normalizedTicker = ticker.toUpperCase();

  let analysis;
  try {
    analysis = await api.getAssetAnalysis(normalizedTicker);
  } catch {
    notFound();
  }

  const { summary, context, decisionZone, setups } = analysis;

  const formattedPrice = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(summary.price);

  // Formatar data sem problemas de timezone
  // A API retorna apenas a data (ex: "2025-12-22"), sem hora
  // Adicionamos T12:00:00 para evitar que a conversão UTC->local mude o dia
  const dateWithTime = summary.updatedAt.includes('T')
    ? summary.updatedAt
    : `${summary.updatedAt}T12:00:00`;
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'long',
  }).format(new Date(dateWithTime));

  return (
    <PageShell>
      <div className="space-y-8">
        {/* Barra de pesquisa */}
        <div className="flex justify-center">
          <TickerInput defaultValue={normalizedTicker} />
        </div>

        {/* Header do ativo */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="text-3xl font-bold">{summary.ticker}</h1>
            <span className="text-xl text-muted-foreground">{summary.name}</span>
          </div>
          <p className="text-2xl font-semibold">{formattedPrice}</p>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Atualizado em: {formattedDate}</span>
          </div>
        </div>

        {/* Zona de Decisao */}
        <DecisionZoneCard result={decisionZone} />

        {/* Contexto do Ativo */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Contexto do Ativo</h2>
          <ContextCards context={context} />
        </section>

        {/* Setups */}
        <section>
          <h2 className="mb-4 text-xl font-semibold">Setups Identificados</h2>
          <SetupList setups={setups} ticker={normalizedTicker} />
        </section>

        {/* Explicacao da IA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Analise Complementar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Com base no contexto atual, {summary.ticker} apresenta tendencia de{' '}
              <strong>{context.trend.toLowerCase()}</strong> com volume{' '}
              <strong>{context.volume.toLowerCase()}</strong> da media e volatilidade{' '}
              <strong>{context.volatility.toLowerCase()}</strong>.{' '}
              {decisionZone.zone === 'FAVORAVEL' &&
                'O cenario sugere condicoes potencialmente favoraveis para operacoes alinhadas com a tendencia.'}
              {decisionZone.zone === 'NEUTRA' &&
                'O momento atual nao apresenta sinais claros de direcao. Aguardar pode ser prudente.'}
              {decisionZone.zone === 'RISCO' &&
                'Cautela recomendada. O contexto atual apresenta caracteristicas que aumentam o risco de operacoes.'}
            </p>
            {decisionZone.reasons.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-muted-foreground">
                {decisionZone.reasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm text-muted-foreground/70">
              Esta analise e gerada automaticamente com base em dados historicos e
              nao constitui recomendacao de investimento.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
