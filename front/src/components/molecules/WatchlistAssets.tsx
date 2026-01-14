'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { api, type WatchlistItemResponse } from '@/lib/api';
import { AssetLogo } from '@/components/atoms/AssetLogo';

export function WatchlistAssets() {
  const { session, loading: authLoading } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItemResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!session?.access_token) {
      setWatchlist([]);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .getWatchlist(session.access_token)
      .then((items) => {
        setWatchlist(items);
      })
      .catch((err) => {
        console.error('Failed to load watchlist:', err);
        setError('Falha ao carregar watchlist');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [session?.access_token, authLoading]);

  // Usuario nao autenticado
  if (!authLoading && !session) {
    return (
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Faca login para ver seus ativos monitorados
        </p>
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
        >
          Entrar
        </Link>
      </div>
    );
  }

  // Carregando
  if (authLoading || loading) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Carregando ativos...</span>
      </div>
    );
  }

  // Erro
  if (error) {
    return (
      <div className="mt-8 text-center text-sm text-red-500">
        {error}
      </div>
    );
  }

  // Watchlist vazia
  if (watchlist.length === 0) {
    return (
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Sua watchlist esta vazia
        </p>
        <Link
          href="/watchlist"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Adicionar ativos
        </Link>
      </div>
    );
  }

  // Lista de ativos da watchlist
  return (
    <div className="mt-8 text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Eye className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Seus ativos monitorados ({watchlist.length})
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {watchlist.map((item) => (
          <Link
            key={item.id}
            href={`/asset/${item.ticker}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-sm font-medium transition-colors"
          >
            <AssetLogo ticker={item.ticker} size="sm" />
            <span className="font-semibold">{item.ticker}</span>
            <span className="text-muted-foreground text-xs hidden sm:inline">
              {item.name}
            </span>
            <ZoneBadge zone={item.zone} />
          </Link>
        ))}
      </div>
      <Link
        href="/watchlist"
        className="inline-flex items-center gap-1 mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="h-3 w-3" />
        Gerenciar watchlist
      </Link>
    </div>
  );
}

function ZoneBadge({ zone }: { zone: string }) {
  const colors = {
    FAVORAVEL: 'bg-green-500/20 text-green-600',
    NEUTRA: 'bg-yellow-500/20 text-yellow-600',
    RISCO: 'bg-red-500/20 text-red-600',
  };

  const color = colors[zone as keyof typeof colors] || colors.NEUTRA;

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {zone}
    </span>
  );
}
