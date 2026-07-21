import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceCategory,
  FinanceCategoryType,
} from '../../domain/finance-types.js';

// Fonte única: catálogo global compartilhado (somente leitura para usuários).
// O parâmetro userId é mantido nas assinaturas por compatibilidade com os
// chamadores, mas ignorado — não há mais categorias por usuário.
const TABLE = 'finance_global_categories';

export async function getCategoriesByUser(
  _userId: string,
  accessToken: string
): Promise<FinanceCategory[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar categorias: ${error.message}`);
  }

  return data || [];
}

export async function getCategoryById(
  categoryId: string,
  _userId: string,
  accessToken: string
): Promise<FinanceCategory | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', categoryId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar categoria: ${error.message}`);
  }

  return data;
}

/**
 * Categoria genérica "Outros" (mãe) por tipo — usada para ajustes de saldo,
 * já que não há mais uma categoria de ajuste por usuário.
 */
/**
 * Regra de negocio: transacoes criadas pelo reajuste de saldo das contas
 * usam SEMPRE a categoria pai "Ajuste de saldo" do tipo correspondente
 * (seed 20260722000000). O fallback para "Outras Receitas"/"Outros Gastos"
 * so existe para ambientes onde o seed ainda nao rodou.
 */
export async function getOrCreateAdjustmentCategory(
  _userId: string,
  type: FinanceCategoryType,
  accessToken: string
): Promise<FinanceCategory> {
  const client = createUserClient(accessToken);

  const { data: adjustment, error: adjustmentError } = await client
    .from(TABLE)
    .select('*')
    .eq('type', type)
    .is('parent_id', null)
    .eq('name', 'Ajuste de saldo')
    .maybeSingle();

  if (adjustmentError) {
    throw new Error(`Erro ao obter categoria de ajuste: ${adjustmentError.message}`);
  }
  if (adjustment) {
    return adjustment;
  }

  const legacyName = type === 'RECEITA' ? 'Outras Receitas' : 'Outros Gastos';
  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('type', type)
    .is('parent_id', null)
    .eq('name', legacyName)
    .single();

  if (error || !data) {
    throw new Error(
      `Erro ao obter categoria de ajuste: ${error?.message ?? 'não encontrada'}`
    );
  }

  return data;
}

/**
 * Categoria pai "Não categorizado" por tipo (seed 20260723000100). Toda
 * transação sincronizada da Pluggy recebe esta categoria (category_id é NOT
 * NULL e a categoria da Pluggy ainda não é mapeada). Se o seed ainda não rodou,
 * cai no fallback de "Ajuste de saldo"/legado — o insert nunca fica sem categoria.
 */
export async function getOrCreateUncategorizedCategory(
  type: FinanceCategoryType,
  accessToken: string
): Promise<FinanceCategory> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('type', type)
    .is('parent_id', null)
    .eq('name', 'Não categorizado')
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao obter categoria padrão: ${error.message}`);
  }
  if (data) {
    return data;
  }

  // Seed ainda não aplicado: reusa a categoria de ajuste como último recurso.
  return getOrCreateAdjustmentCategory('', type, accessToken);
}
