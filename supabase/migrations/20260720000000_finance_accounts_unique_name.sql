-- Impede duas contas ativas com o mesmo nome (case/space-insensitive) para o mesmo usuario.
-- Nome duplicado torna o seletor de conta em transacoes ambiguo, e o novo formulario de
-- cadastro no app mobile torna isso trivial de acontecer.
--
-- O filtro parcial WHERE is_active = true e essencial: o DELETE de conta e soft
-- (is_active = false), entao sem ele o usuario nao conseguiria recriar uma conta que apagou.
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_accounts_user_name
  ON public.finance_accounts (user_id, lower(btrim(name::text)))
  WHERE is_active = true;
