import { z } from 'zod';

// Schemas zod compartilhados entre a rota REST e o router tRPC de financas.
// Fonte unica de verdade para validacao de entrada.

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export const accountTypeEnum = z.enum(
  ['CONTA_CORRENTE', 'POUPANCA', 'CARTEIRA', 'INVESTIMENTO', 'BENEFICIO'],
  { error: 'Tipo de conta invalido' }
);

export const createAccountSchema = z.object({
  name: z
    .string({ error: 'O nome da conta e obrigatorio' })
    .trim()
    .min(2, 'O nome da conta precisa ter ao menos 2 caracteres')
    .max(60, 'O nome da conta pode ter no maximo 60 caracteres'),
  type: accountTypeEnum,
  bank_id: z.uuid({ error: 'Banco invalido' }).nullish(),
  initial_balance: z
    .number({ error: 'Saldo inicial invalido' })
    .finite('Saldo inicial invalido')
    .default(0),
  color: z.string().regex(HEX_COLOR, 'Cor invalida').optional(),
  icon: z.string().max(40, 'Icone invalido').optional(),
});

export const updateAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'O nome da conta precisa ter ao menos 2 caracteres')
    .max(60, 'O nome da conta pode ter no maximo 60 caracteres')
    .optional(),
  bank_id: z.uuid({ error: 'Banco invalido' }).nullish(),
  color: z.string().regex(HEX_COLOR, 'Cor invalida').optional(),
  icon: z.string().max(40, 'Icone invalido').optional(),
  // is_active NAO entra aqui de proposito: a exclusao e soft delete
  // (is_active = false) e so o DELETE aplica a regra de registros vinculados.
  // Aceitar o campo no PATCH abriria um segundo caminho de exclusao sem guarda.
  initial_balance: z.number({ error: 'Saldo inicial invalido' }).finite('Saldo inicial invalido').optional(),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountTypeInput = z.infer<typeof accountTypeEnum>;
