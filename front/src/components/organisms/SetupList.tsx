import { Accordion } from '@/components/ui/accordion';
import { SetupCard } from '@/components/molecules/SetupCard';
import type { Setup } from '@/types/market';
import { Target } from 'lucide-react';

interface SetupListProps {
  setups: Setup[];
  ticker: string;
}

export function SetupList({ setups, ticker }: SetupListProps) {
  if (setups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <Target className="mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="font-medium text-muted-foreground">
          Nenhum setup identificado
        </p>
        <p className="text-sm text-muted-foreground/70">
          Nao ha setups monitorados para este ativo no momento.
        </p>
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {setups.map((setup) => (
        <SetupCard key={setup.id} setup={setup} ticker={ticker} />
      ))}
    </Accordion>
  );
}
