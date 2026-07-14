-- Lista de espera do pré-lançamento (captura de leads na landing page).
-- Escrita apenas via service_role (rota pública POST /waitlist na API valida
-- e insere com supabaseAdmin). Nenhuma policy pública: anon/authenticated não
-- leem nem escrevem diretamente.

create table public.waitlist_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing_hero',
  utm jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'INVITED', 'CONVERTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.waitlist_leads is 'Leads da lista de espera do pré-lançamento (landing page). Escrita via service_role.';
comment on column public.waitlist_leads.source is 'Origem do lead na página (ex.: landing_hero, landing_mobile, landing_footer)';
comment on column public.waitlist_leads.utm is 'Parâmetros utm_* capturados da URL no momento da inscrição';
comment on column public.waitlist_leads.status is 'PENDING = aguardando, INVITED = convite enviado, CONVERTED = virou usuário';

-- E-mail único, case-insensitive
create unique index waitlist_leads_unique_email
  on public.waitlist_leads (lower(email));

create index waitlist_leads_status_idx
  on public.waitlist_leads (status);

alter table public.waitlist_leads enable row level security;
