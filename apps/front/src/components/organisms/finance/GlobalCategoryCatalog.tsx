'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { financeApi } from '@/lib/finance-api';
import { CategoryIcon } from '@/components/atoms/CategoryIcon';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  GlobalCategoryType,
  GlobalCategoryWithChildren,
} from '@/types/finance';

/**
 * Catálogo global de categorias (somente leitura) — o mesmo para todos os
 * usuários, organizado em categoria mãe -> filhas.
 */
export function GlobalCategoryCatalog() {
  const { session } = useAuth();
  const [categories, setCategories] = useState<GlobalCategoryWithChildren[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<GlobalCategoryType>('DESPESA');

  useEffect(() => {
    if (!session?.access_token) return;

    let cancelled = false;
    financeApi
      .getGlobalCategories(session.access_token)
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Erro ao carregar catálogo'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const visible = categories.filter((c) => c.type === activeType);

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Catálogo global de categorias
          </h2>
          <p className="text-sm text-slate-500">
            Categorias padrão disponíveis para todos os usuários, organizadas por
            grupo.
          </p>
        </div>
        <div className="flex rounded-lg bg-slate-100 p-1">
          {(['DESPESA', 'RECEITA'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                activeType === type
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {type === 'DESPESA' ? 'Despesas' : 'Receitas'}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando catálogo...
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((parent) => (
            <Card key={parent.id}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <CategoryIcon
                    icon={parent.icon}
                    color={parent.color}
                    size="md"
                    withBackground
                  />
                  <h3 className="font-medium text-slate-900">{parent.name}</h3>
                </div>
                <ul className="space-y-1.5">
                  {parent.children.map((child) => (
                    <li
                      key={child.id}
                      className="flex items-center gap-2 text-sm text-slate-600"
                    >
                      <CategoryIcon icon={child.icon} color={child.color} size="sm" />
                      {child.name}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
