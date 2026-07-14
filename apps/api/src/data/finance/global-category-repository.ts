import { createUserClient } from '../../lib/supabase.js';
import type {
  GlobalCategory,
  GlobalCategoryWithChildren,
} from '../../domain/finance-types.js';

const TABLE = 'finance_global_categories';

export async function getGlobalCategories(
  accessToken: string
): Promise<GlobalCategory[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Erro ao buscar categorias globais: ${error.message}`);
  }

  return data || [];
}

export function buildGlobalCategoryTree(
  categories: GlobalCategory[]
): GlobalCategoryWithChildren[] {
  const parents = categories.filter((c) => c.parent_id === null);
  const childrenByParent = new Map<string, GlobalCategory[]>();

  for (const category of categories) {
    if (!category.parent_id) continue;
    const siblings = childrenByParent.get(category.parent_id) ?? [];
    siblings.push(category);
    childrenByParent.set(category.parent_id, siblings);
  }

  return parents.map((parent) => ({
    ...parent,
    children: childrenByParent.get(parent.id) ?? [],
  }));
}
