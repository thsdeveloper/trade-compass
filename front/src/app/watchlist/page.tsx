'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api, type WatchlistItemResponse } from '@/lib/api';
import { PageShell } from '@/components/organisms/PageShell';
import { Card, CardContent } from '@/components/ui/card';
import { ZoneBadge } from '@/components/atoms/ZoneBadge';
import { Eye, ChevronRight, Plus, Trash2, Edit2 } from 'lucide-react';
import { WatchlistPageSkeleton } from '@/components/organisms/skeletons/WatchlistPageSkeleton';
import { Button } from '@/components/ui/button';
import { AddAssetDialog } from '@/components/organisms/AddAssetDialog';
import { EditNotesDialog } from '@/components/organisms/EditNotesDialog';

export default function WatchlistPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [watchlist, setWatchlist] = useState<WatchlistItemResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchlistItemResponse | null>(
    null
  );

  const loadWatchlist = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      setLoading(true);
      const data = await api.getWatchlist(session.access_token);
      setWatchlist(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar watchlist'
      );
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth');
      return;
    }

    loadWatchlist();
  }, [user, authLoading, router, loadWatchlist]);

  const handleAddAsset = async (ticker: string, notes?: string) => {
    if (!session?.access_token) return;

    await api.addToWatchlist({ ticker, notes }, session.access_token);
    await loadWatchlist();
    setIsAddDialogOpen(false);
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    if (!session?.access_token) return;

    await api.updateWatchlistItem(id, { notes }, session.access_token);
    await loadWatchlist();
    setEditingItem(null);
  };

  const handleRemove = async (id: string) => {
    if (!session?.access_token) return;

    try {
      await api.removeFromWatchlist(id, session.access_token);
      setWatchlist(watchlist.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover item');
    }
  };

  if (authLoading || loading) {
    return <WatchlistPageSkeleton />;
  }

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Watchlist</h1>
              <p className="text-sm text-muted-foreground">
                {watchlist.length} ativos monitorados
              </p>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Ativo
          </Button>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        {/* List */}
        {watchlist.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Eye className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="font-medium text-muted-foreground">
                Nenhum ativo na watchlist
              </p>
              <p className="text-sm text-muted-foreground/70">
                Adicione ativos para monitorar suas zonas de decisao.
              </p>
              <Button
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                Adicionar Primeiro Ativo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {watchlist.map((item) => (
              <Card
                key={item.id}
                className="transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <CardContent className="flex items-center justify-between p-4">
                  <Link
                    href={`/asset/${item.ticker}`}
                    className="flex flex-1 items-center gap-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-mono font-semibold">
                      {item.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold">{item.ticker}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.name}
                      </p>
                      {item.notes && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground/70">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2">
                    <ZoneBadge zone={item.zone} />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingItem(item)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Link href={`/asset/${item.ticker}`}>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="rounded-lg bg-muted/50 p-4">
          <h3 className="mb-3 text-sm font-medium">Legenda das Zonas</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-emerald-500"></span>
              <span className="text-muted-foreground">
                Favoravel - Contexto propicio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-amber-500"></span>
              <span className="text-muted-foreground">
                Neutra - Aguardar definicao
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-500"></span>
              <span className="text-muted-foreground">
                Risco - Cautela recomendada
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AddAssetDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddAsset}
      />

      {editingItem && (
        <EditNotesDialog
          open={!!editingItem}
          onOpenChange={() => setEditingItem(null)}
          item={editingItem}
          onSave={handleUpdateNotes}
        />
      )}
    </PageShell>
  );
}
