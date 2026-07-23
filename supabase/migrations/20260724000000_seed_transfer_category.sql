-- Aplicada no projeto remoto via MCP (apply_migration: seed_transfer_category).
--
-- Categoria pai "Transferências entre contas" (uma por tipo): as duas pernas
-- de uma transferência são gravadas como DESPESA (origem) e RECEITA (destino),
-- e o CHECK de type do catálogo só permite esses dois valores. Cinza neutro e
-- sem budget_category: transferência não é gasto nem renda — não entra nos
-- buckets do orçamento. A API usa esta categoria como default quando o cliente
-- não envia category_id na transferência (getTransferCategory).
insert into finance_global_categories (name, icon, color, type, sort_order, is_active)
select 'Transferências entre contas', 'ArrowLeftRight', '#6B7280', t.type, 997, true
from (values ('RECEITA'), ('DESPESA')) as t(type)
where not exists (
  select 1
  from finance_global_categories c
  where c.name = 'Transferências entre contas'
    and c.type = t.type
    and c.parent_id is null
);
