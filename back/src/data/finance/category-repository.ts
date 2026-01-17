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
    MORADIA: 'ESSENCIAL',
    ALIMENTACAO: 'ESSENCIAL',
    TRANSPORTE: 'ESSENCIAL',
    SAUDE: 'ESSENCIAL',
    LAZER: 'ESTILO_VIDA',
    VESTUARIO: 'ESTILO_VIDA',
    SERVICOS: 'ESTILO_VIDA',
    EDUCACAO: 'ESTILO_VIDA',
    OUTROS: 'ESTILO_VIDA',
    INVESTIMENTOS: 'INVESTIMENTO',
    DIVIDA: 'ESSENCIAL',
    SALARIO: null,
    FREELANCE: null,
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
      budget_category: getDefaultBudgetCategory(category.type),
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
