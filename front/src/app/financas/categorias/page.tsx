'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell } from '@/components/organisms/PageShell';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Tag,
  Pencil,
  X,
  Lock,
} from 'lucide-react';
import { CategoriasPageSkeleton } from '@/components/organisms/skeletons/CategoriasPageSkeleton';
import { financeApi } from '@/lib/finance-api';
import { useFinanceDataRefresh } from '@/hooks/useFinanceDataRefresh';
import type {
  FinanceCategory,
  CategoryFormData,
  FinanceCategoryType,
  BudgetCategory,
} from '@/types/finance';
import { BudgetCategorySelect, BudgetCategoryBadge } from '@/components/molecules/BudgetCategorySelect';
import { CategoryIcon, IconSelector, ColorPicker } from '@/components/atoms/CategoryIcon';
import { DeleteConfirm, useAlert } from '@/components/molecules/ConfirmDialog';

export default function CategoriasPage() {
  const { user, session, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FinanceCategory | null>(null);
  const { alert, AlertDialog: AlertDialogComponent } = useAlert();
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    type: 'DESPESA',
    color: '#64748b',
    icon: 'Tag',
  });

  // Ref para evitar reload desnecessário
  const hasLoadedRef = useRef(false);

  const loadData = useCallback(async (forceReload = false) => {
    if (!session?.access_token) return;

    if (!forceReload && hasLoadedRef.current) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await financeApi.getCategories(session.access_token);
      setCategories(data);
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    loadData();
  }, [user, authLoading, router, loadData]);

  // Listen for data changes from global dialogs
  useFinanceDataRefresh(() => {
    loadData(true);
  });

  const openNewDialog = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      type: 'DESPESA',
      color: '#64748b',
      icon: 'Tag',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (category: FinanceCategory) => {
    if (category.is_system) return;
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color,
      icon: category.icon,
      budget_category: category.budget_category || undefined,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!session?.access_token) return;

    setSaving(true);
    try {
      if (editingCategory) {
        await financeApi.updateCategory(
          editingCategory.id,
          { name: formData.name, color: formData.color, icon: formData.icon, budget_category: formData.budget_category },
          session.access_token
        );
      } else {
        await financeApi.createCategory(formData, session.access_token);
      }
      setDialogOpen(false);
      loadData(true);
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteDialog = (category: FinanceCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!session?.access_token || !categoryToDelete) return;

    try {
      await financeApi.deleteCategory(categoryToDelete.id, session.access_token);
      loadData(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir categoria';
      alert({
        title: 'Nao foi possivel excluir',
        description: message,
        variant: 'warning',
      });
    }
  };

  // Group categories by type
  const expenseCategories = categories.filter((c) => c.type === 'DESPESA');
  const incomeCategories = categories.filter((c) => c.type === 'RECEITA');

  if (authLoading || loading) {
    return <CategoriasPageSkeleton />;
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="text-sm text-slate-500">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadData()} className="mt-2">
            Tentar novamente
          </Button>
        </div>
      </PageShell>
    );
  }

  const CategoryItem = ({ category }: { category: FinanceCategory }) => (
    <div className="group flex items-center justify-between rounded-md border border-slate-100 px-3 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50/50">
      <div className="flex items-center gap-3">
        <CategoryIcon
          icon={category.icon}
          color={category.color}
          size="sm"
          withBackground
        />
        <span className="text-sm font-medium text-slate-700">{category.name}</span>
        {category.is_system && (
          <Lock className="h-3 w-3 text-slate-300" />
        )}
        <BudgetCategoryBadge category={category.budget_category} />
      </div>
      {!category.is_system && (
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => openEditDialog(category)}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => openDeleteDialog(category)}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Categories Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Expense Categories */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-900">
                  Despesas
                </h2>
                <span className="text-xs text-slate-400">
                  {expenseCategories.length} categorias
                </span>
              </div>
            </div>
            <div className="p-3">
              {expenseCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Tag className="h-5 w-5 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-400">Nenhuma categoria</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {expenseCategories.map((category) => (
                    <CategoryItem key={category.id} category={category} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Income Categories */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-slate-900">
                  Receitas
                </h2>
                <span className="text-xs text-slate-400">
                  {incomeCategories.length} categorias
                </span>
              </div>
            </div>
            <div className="p-3">
              {incomeCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Tag className="h-5 w-5 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-400">Nenhuma categoria</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {incomeCategories.map((category) => (
                    <CategoryItem key={category.id} category={category} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editingCategory ? 'Editar categoria' : 'Nova categoria'}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {editingCategory
                ? 'Atualize os dados da categoria'
                : 'Preencha os dados da categoria'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium text-slate-600">
                Nome
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Ex: Streaming, Assinaturas..."
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Tipo
              </Label>
              <div className="flex rounded-md border border-slate-200 p-1 gap-1 bg-slate-50">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: 'DESPESA',
                    })
                  }
                  className={`flex-1 rounded-[4px] px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    formData.type === 'DESPESA'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-rose-700 hover:bg-rose-50/80'
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      type: 'RECEITA',
                    })
                  }
                  className={`flex-1 rounded-[4px] px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    formData.type === 'RECEITA'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/80'
                  }`}
                >
                  Receita
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Cor
              </Label>
              <ColorPicker
                value={formData.color}
                onChange={(color) => setFormData({ ...formData, color })}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-600">
                Icone
              </Label>
              <IconSelector
                value={formData.icon}
                onChange={(icon) => setFormData({ ...formData, icon })}
                color={formData.color}
              />
            </div>

            {/* Budget Category - only for expense categories */}
            {formData.type === 'DESPESA' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">
                  Categoria 50-30-20
                </Label>
                <BudgetCategorySelect
                  value={formData.budget_category || null}
                  onValueChange={(value: BudgetCategory) =>
                    setFormData({ ...formData, budget_category: value })
                  }
                />
                <p className="text-xs text-slate-400">
                  Define em qual bucket essa categoria se encaixa
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="h-8"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !formData.name}
              className="h-8 bg-slate-900 hover:bg-slate-800"
            >
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {editingCategory ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirm
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        itemName={categoryToDelete?.name || ''}
        itemType="categoria"
        onConfirm={handleDelete}
      />

      {AlertDialogComponent}
    </PageShell>
  );
}
