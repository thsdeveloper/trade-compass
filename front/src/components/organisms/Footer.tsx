import { AlertTriangle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <p className="font-medium">
              MoneyCompass nao e recomendacao de investimento.
            </p>
          </div>
          <p className="max-w-lg">
            As informacoes apresentadas sao apenas para fins educacionais e de
            analise. Decisoes de investimento sao de responsabilidade exclusiva
            do usuario.
          </p>
        </div>
      </div>
    </footer>
  );
}
