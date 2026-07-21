-- 1) Unicidade de nome por pai passa a considerar o TIPO: o mesmo nome pode
--    existir como RECEITA e DESPESA (ex: "Ajuste de saldo" nos dois tipos).
drop index if exists finance_global_categories_unique_name_per_parent;
create unique index finance_global_categories_unique_name_per_parent
  on finance_global_categories (name, type, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 2) Categoria pai "Ajuste de saldo" (uma por tipo): toda transacao criada
--    pelo recurso de reajuste de saldo das contas e atribuida a ela pela API
--    (getOrCreateAdjustmentCategory). Cinza neutro e sem budget_category:
--    ajuste tecnico nao entra nos buckets do orcamento.
insert into finance_global_categories (name, icon, color, type, sort_order, is_active)
select 'Ajuste de saldo', 'RefreshCw', '#6B7280', t.type, 999, true
from (values ('RECEITA'), ('DESPESA')) as t(type)
where not exists (
  select 1
  from finance_global_categories c
  where c.name = 'Ajuste de saldo'
    and c.type = t.type
    and c.parent_id is null
);
