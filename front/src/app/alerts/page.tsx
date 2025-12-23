import Link from 'next/link';
import { PageShell } from '@/components/organisms/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAlerts, getHistory } from '@/mocks/market';
import { Bell, History, Clock, Calendar, CheckCircle } from 'lucide-react';

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Agora';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min atras`;
  } else if (diffHours < 24) {
    return `${diffHours}h atras`;
  } else if (diffDays === 1) {
    return 'Ontem';
  } else {
    return `${diffDays} dias atras`;
  }
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export default function AlertsPage() {
  const alerts = getAlerts();
  const history = getHistory();

  return (
    <PageShell>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Alertas & Historico</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe eventos importantes dos seus ativos
            </p>
          </div>
        </div>

        {/* Alertas Ativos */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold">Alertas Ativos</h2>
            {alerts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {alerts.length}
              </Badge>
            )}
          </div>

          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">
                  Nenhum alerta ativo
                </p>
                <p className="text-sm text-muted-foreground/70">
                  Voce sera notificado quando houver eventos relevantes.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Link key={alert.id} href={`/asset/${alert.ticker}`}>
                  <Card className="transition-all hover:border-primary/50 hover:shadow-sm">
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {alert.ticker}
                          </Badge>
                        </div>
                        <p className="text-sm">{alert.title}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(alert.createdAt)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Historico */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <History className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Historico de Eventos</h2>
          </div>

          {history.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <History className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="font-medium text-muted-foreground">
                  Nenhum evento no historico
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono">
                            {event.ticker}
                          </Badge>
                        </div>
                        <p className="font-medium">{event.event}</p>
                        {event.outcomeNote && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                            {event.outcomeNote}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(event.date)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Info */}
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          <p>
            O historico mantem os ultimos 30 dias de eventos. Alertas expiram
            automaticamente apos 24 horas.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
