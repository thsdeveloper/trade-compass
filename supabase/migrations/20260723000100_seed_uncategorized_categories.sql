-- Categoria pai "Não categorizado" (uma por tipo). Fallback para transações
-- sincronizadas da Pluggy: finance_transactions.category_id é NOT NULL, mas a
-- categoria da Pluggy ainda não é mapeada no MVP — então toda transação
-- importada recebe esta categoria (getOrCreateUncategorizedCategory na API).
-- Mesmo padrão do seed "Ajuste de saldo" (20260722000000): cinza neutro, sem
-- budget_category (não entra nos buckets 50-30-20).
insert into finance_global_categories (name, icon, color, type, sort_order, is_active)
select 'Não categorizado', 'HelpCircle', '#6B7280', t.type, 998, true
from (values ('RECEITA'), ('DESPESA')) as t(type)
where not exists (
  select 1
  from finance_global_categories c
  where c.name = 'Não categorizado'
    and c.type = t.type
    and c.parent_id is null
);
