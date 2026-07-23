import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const TOKEN_USER_ID = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';

// Transacoes retornadas pelo select do supabase (fake)
let dbTransactions: Record<string, unknown>[] = [];
const updateCalls: { payload: unknown; ids: string[] }[] = [];

function fakeClient() {
  return {
    from: () => ({
      select: () => ({
        in: (_col: string, ids: string[]) => ({
          eq: async () => ({
            data: dbTransactions.filter((t) => ids.includes(t.id as string)),
            error: null,
          }),
        }),
      }),
      update: (payload: unknown) => ({
        in: (_col: string, ids: string[]) => ({
          eq: async () => {
            updateCalls.push({ payload, ids });
            return { error: null };
          },
        }),
      }),
    }),
  };
}

// Auth: o middleware valida o Bearer token via supabaseAdmin.auth.getUser
vi.mock('../src/lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(async (token: string) =>
        token === 'token-valido'
          ? { data: { user: { id: TOKEN_USER_ID, email: 'user@teste.com' } }, error: null }
          : { data: { user: null }, error: { message: 'invalid token' } }
      ),
    },
  },
  createUserClient: vi.fn(() => fakeClient()),
  verifyUserPassword: vi.fn(),
}));

const getAccountById = vi.fn();
const updateAccountBalance = vi.fn();

vi.mock('../src/data/finance/account-repository.js', () => ({
  getAccountsByUser: vi.fn(async () => []),
  getAccountById: (...args: unknown[]) => getAccountById(...args),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  updateAccountBalance: (...args: unknown[]) => updateAccountBalance(...args),
  deleteAccount: vi.fn(),
  getAccountUsage: vi.fn(),
}));

const { buildServer } = await import('../src/api/server.js');

let app: FastifyInstance;

function transactionFixture(overrides: Record<string, unknown>) {
  return {
    user_id: TOKEN_USER_ID,
    account_id: ACCOUNT_ID,
    credit_card_id: null,
    transfer_id: null,
    type: 'DESPESA',
    status: 'PENDENTE',
    amount: 10,
    paid_amount: null,
    ...overrides,
  };
}

function bulkDelete(payload: unknown, token: string | null = 'token-valido') {
  return app.inject({
    method: 'POST',
    url: '/finance/transactions/bulk-delete',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: payload as Record<string, unknown>,
  });
}

beforeAll(async () => {
  app = await buildServer();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  dbTransactions = [];
  updateCalls.length = 0;
  getAccountById.mockReset();
  updateAccountBalance.mockReset();
});

describe('POST /finance/transactions/bulk-delete', () => {
  it('exige autenticacao', async () => {
    const res = await bulkDelete({ ids: ['t1'] }, null);
    expect(res.statusCode).toBe(401);
  });

  it('rejeita lista vazia ou invalida', async () => {
    expect((await bulkDelete({ ids: [] })).statusCode).toBe(400);
    expect((await bulkDelete({})).statusCode).toBe(400);
    expect((await bulkDelete({ ids: [123] })).statusCode).toBe(400);
  });

  it('rejeita mais de 500 ids', async () => {
    const ids = Array.from({ length: 501 }, (_, i) => `t${i}`);
    expect((await bulkDelete({ ids })).statusCode).toBe(400);
  });

  it('cancela pendentes e estorna saldo das pagas, pulando transferencias e cartao pago', async () => {
    dbTransactions = [
      transactionFixture({ id: 't1', status: 'PENDENTE' }),
      transactionFixture({ id: 't2', status: 'PAGO', type: 'DESPESA', paid_amount: 50 }),
      transactionFixture({ id: 't3', status: 'PAGO', type: 'RECEITA', paid_amount: 30 }),
      transactionFixture({ id: 't4', transfer_id: 'tr-1' }),
      transactionFixture({
        id: 't5',
        status: 'PAGO',
        account_id: null,
        credit_card_id: 'card-1',
      }),
      transactionFixture({ id: 't6', status: 'CANCELADO' }),
    ];
    getAccountById.mockResolvedValue({ id: ACCOUNT_ID, current_balance: 100 });

    const res = await bulkDelete({ ids: ['t1', 't2', 't3', 't4', 't5', 't6', 't7'] });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.deleted.sort()).toEqual(['t1', 't2', 't3']);
    expect(body.skipped).toEqual(
      expect.arrayContaining([
        { id: 't4', reason: 'transfer' },
        { id: 't5', reason: 'credit_card_paid' },
        { id: 't6', reason: 'already_cancelled' },
        { id: 't7', reason: 'not_found' },
      ])
    );
    expect(body.skipped).toHaveLength(4);

    // Um unico update de status para os cancelaveis
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].payload).toEqual({ status: 'CANCELADO' });
    expect([...updateCalls[0].ids].sort()).toEqual(['t1', 't2', 't3']);

    // Estorno liquido: +50 (despesa paga) - 30 (receita paga) => 100 + 20 = 120
    expect(updateAccountBalance).toHaveBeenCalledTimes(1);
    expect(updateAccountBalance).toHaveBeenCalledWith(
      ACCOUNT_ID,
      TOKEN_USER_ID,
      120,
      'token-valido'
    );
  });

  it('nao mexe no saldo quando so ha pendentes', async () => {
    dbTransactions = [transactionFixture({ id: 't1', status: 'PENDENTE' })];

    const res = await bulkDelete({ ids: ['t1'] });

    expect(res.statusCode).toBe(200);
    expect(res.json().deleted).toEqual(['t1']);
    expect(updateAccountBalance).not.toHaveBeenCalled();
  });
});
