import Link from 'next/link';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import { AlertCircle, Home, Search } from 'lucide-react';

export default function AssetNotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-6 rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Ativo nao encontrado</h1>
        <p className="mb-8 max-w-md text-muted-foreground">
          O ticker informado nao foi encontrado em nossa base de dados. Verifique
          se o codigo esta correto e tente novamente.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Voltar ao Inicio
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">
              <Search className="mr-2 h-4 w-4" />
              Nova Pesquisa
            </Link>
          </Button>
        </div>
        <div className="mt-8 text-sm text-muted-foreground">
          <p>Tickers disponiveis: PETR4, VALE3, ITUB4, BBDC4, ABEV3, WEGE3, MGLU3, RENT3</p>
        </div>
      </div>
    </PageShell>
  );
}
