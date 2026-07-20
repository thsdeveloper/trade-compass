-- Objetivos selecionados pelo usuário no onboarding (slugs).
-- Usado para personalizar a experiência.
alter table public.profiles
  add column if not exists onboarding_goals text[];

comment on column public.profiles.onboarding_goals is
  'Objetivos selecionados pelo usuário no onboarding (slugs). Usado para personalizar a experiência.';
