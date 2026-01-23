import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceCategory,
  FinanceCategoryType,
  BudgetCategory,
  CreateCategoryDTO,
  UpdateCategoryDTO,
} from '../../domain/finance-types.js';

const TABLE = 'finance_categories';

// Mapeamento automatico de tipo de categoria para budget category (50-30-20)
export function getDefaultBudgetCategory(type: FinanceCategoryType): BudgetCategory | null {
  const mapping: Record<FinanceCategoryType, BudgetCategory | null> = {
    DESPESA: 'ESTILO_VIDA', // Padrao para despesas, usuario pode alterar
    RECEITA: null, // Receitas nao tem budget category
  };
  return mapping[type];
}

export async function getCategoriesByUser(
  userId: string,
  accessToken: string
): Promise<FinanceCategory[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar categorias: ${error.message}`);
  }

  return data || [];
}

export async function getCategoryById(
  categoryId: string,
  userId: string,
  accessToken: string
): Promise<FinanceCategory | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', categoryId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar categoria: ${error.message}`);
  }

  return data;
}

export async function createCategory(
  userId: string,
  category: CreateCategoryDTO,
  accessToken: string
): Promise<FinanceCategory> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      name: category.name,
      type: category.type,
      color: category.color || '#6366f1',
      icon: category.icon || 'Tag',
      is_system: false,
      budget_category: category.budget_category ?? getDefaultBudgetCategory(category.type),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar categoria: ${error.message}`);
  }

  return data;
}

export async function updateCategory(
  categoryId: string,
  userId: string,
  updates: UpdateCategoryDTO,
  accessToken: string
): Promise<FinanceCategory> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .update(updates)
    .eq('id', categoryId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar categoria: ${error.message}`);
  }

  if (!data) {
    throw new Error('Categoria nao encontrada');
  }

  return data;
}

export async function deleteCategory(
  categoryId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Verifica se existem transacoes vinculadas a esta categoria
  const { count, error: countError } = await client
    .from('finance_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('user_id', userId);

  if (countError) {
    throw new Error(`Erro ao verificar transacoes: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error(`Nao e possivel excluir esta categoria pois existem ${count} transacao(oes) vinculada(s)`);
  }

  // Soft delete - apenas desativa
  const { error } = await client
    .from(TABLE)
    .update({ is_active: false })
    .eq('id', categoryId)
    .eq('user_id', userId)
    .eq('is_system', false); // Nao permite desativar categorias do sistema

  if (error) {
    throw new Error(`Erro ao remover categoria: ${error.message}`);
  }
}

export async function getOrCreateAdjustmentCategory(
  userId: string,
  type: FinanceCategoryType,
  accessToken: string
): Promise<FinanceCategory> {
  const client = createUserClient(accessToken);
  const name = type === 'RECEITA' ? 'Ajuste de Saldo (Entrada)' : 'Ajuste de Saldo (Saida)';

  // Buscar categoria existente
  const { data: existing } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('name', name)
    .eq('type', type)
    .eq('is_system', true)
    .single();

  if (existing) return existing;

  // Criar categoria de sistema
  const { data, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      name,
      type,
      color: '#8b5cf6',
      icon: 'RefreshCw',
      is_system: true,
      budget_category: null,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar categoria de ajuste: ${error.message}`);
  return data;
}
