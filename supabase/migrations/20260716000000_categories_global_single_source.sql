-- Torna finance_global_categories a fonte única de categorias.
-- Repõe as FKs de finance_transactions e finance_recurrences para o catálogo
-- global, remove o seeding de categorias por usuário e dropa finance_categories.
-- Seguro: nenhuma transação usava categoria criada por usuário.
-- Aplicada no projeto remoto em 2026-07-16 via MCP.

-- 1. budget_category (50/30/20) no catálogo global
alter table public.finance_global_categories
  add column if not exists budget_category budget_category_type;

update public.finance_global_categories set budget_category = 'ESSENCIAL'
 where parent_id is null and type = 'DESPESA'
   and name in ('Alimentação','Moradia','Transporte','Saúde','Educação',
                'Contas e Taxas','Impostos','Família e Filhos');

update public.finance_global_categories set budget_category = 'ESTILO_VIDA'
 where parent_id is null and type = 'DESPESA'
   and name in ('Lazer e Entretenimento','Compras e Vestuário','Viagens',
                'Assinaturas e Serviços Digitais','Doações e Presentes','Pets',
                'Trabalho e Negócios','Outros Gastos');

-- filhas herdam o bucket da mãe
update public.finance_global_categories c
   set budget_category = p.budget_category
  from public.finance_global_categories p
 where c.parent_id = p.id;

-- 2. Dropar FKs antigas antes de repontar (a FK vigente rejeitaria ids globais)
alter table public.finance_transactions drop constraint finance_transactions_category_id_fkey;
alter table public.finance_recurrences drop constraint finance_recurrences_category_id_fkey;

-- 3. Repontar por nome → categoria-mãe global (renomeações antigas + fallback)
update public.finance_transactions t
   set category_id = m.new_id
  from (
    select fc.id as old_id,
      coalesce(
        (select g.id from public.finance_global_categories g
          where g.parent_id is null and g.type = fc.type::text
            and lower(g.name) = lower(case
              when fc.name = 'Lazer' then 'Lazer e Entretenimento'
              when fc.name = 'Outros' then 'Outros Gastos'
              when fc.name = 'Serviços' then 'Assinaturas e Serviços Digitais'
              when fc.name = 'Vestuário' then 'Compras e Vestuário'
              else fc.name end)
          limit 1),
        (select g.id from public.finance_global_categories g
          where g.parent_id is null and g.type = fc.type::text
            and g.name = case when fc.type::text = 'DESPESA' then 'Outros Gastos' else 'Outras Receitas' end
          limit 1)
      ) as new_id
    from public.finance_categories fc
  ) m
 where t.category_id = m.old_id;

update public.finance_recurrences r
   set category_id = m.new_id
  from (
    select fc.id as old_id,
      coalesce(
        (select g.id from public.finance_global_categories g
          where g.parent_id is null and g.type = fc.type::text
            and lower(g.name) = lower(case
              when fc.name = 'Lazer' then 'Lazer e Entretenimento'
              when fc.name = 'Outros' then 'Outros Gastos'
              when fc.name = 'Serviços' then 'Assinaturas e Serviços Digitais'
              when fc.name = 'Vestuário' then 'Compras e Vestuário'
              else fc.name end)
          limit 1),
        (select g.id from public.finance_global_categories g
          where g.parent_id is null and g.type = fc.type::text
            and g.name = case when fc.type::text = 'DESPESA' then 'Outros Gastos' else 'Outras Receitas' end
          limit 1)
      ) as new_id
    from public.finance_categories fc
  ) m
 where r.category_id = m.old_id;

-- 4. Novas FKs para o catálogo global
alter table public.finance_transactions
  add constraint finance_transactions_category_id_fkey
    foreign key (category_id) references public.finance_global_categories(id);
alter table public.finance_recurrences
  add constraint finance_recurrences_category_id_fkey
    foreign key (category_id) references public.finance_global_categories(id);

-- 5. Remover seeding por usuário e a tabela de categorias de usuário
drop trigger if exists on_auth_user_created_finance_categories on auth.users;
drop function if exists public.create_default_finance_categories() cascade;
drop table if exists public.finance_categories;
drop function if exists public.update_finance_categories_updated_at() cascade;
