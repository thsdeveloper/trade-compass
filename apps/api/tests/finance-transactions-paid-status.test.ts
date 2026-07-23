import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const TOKEN_USER_ID = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';
const CARD_ID = '77777777-7777-4777-8777-777777777777';

let insertedRow: Record<string, unknown> | null = null;

function fakeClient() {
  return {
    from: () => ({
      insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async () => {
            insertedRow = row;
            return { data: { id: 'tx-1', ...row }, error: null };
          },
        }),
      }),
    }),
  };
}

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

vi.mock('../src/data/finance/account-repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/data/finance/account-repository.js')>();
  return {
    ...actual,
    getAccountById: (...args: unknown[]) => getAccountById(...args),
    updateAccountBalance: (...args: unknown[]) => updateAccountBalance(...args),
  };
});

const getCreditCardById = vi.fn();
const updateCreditCardAvailableLimit = vi.fn();

vi.mock('../src/data/finance/credit-card-repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/data/finance/credit-card-repository.js')>();
  return {
    ...actual,
    getCreditCardById: (...args: unknown[]) => getCreditCardById(...args),
    updateCreditCardAvailableLimit: (...args: unknown[]) =>
      updateCreditCardAvailableLimit(...args),
  };
});

const { buildServer } = await import('../src/api/server.js');

let app: FastifyInstance;

function postTransaction(payload: unknown, token: string | null = 'token-valido') {
  return app.inject({
    method: 'POST',
    url: '/finance/transactions',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: payload as Record<string, unknown>,
  });
}

const basePayload = {
  category_id: 'cat-1',
  account_id: ACCOUNT_ID,
  type: 'DESPESA',
  description: 'Mercado',
  amount: 80,
  due_date: '2026-07-21',
};

beforeAll(async () => {
  app = await buildServer();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  insertedRow = null;
  getAccountById.mockReset();
  updateAccountBalance.mockReset();
  getCreditCardById.mockReset();
  updateCreditCardAvailableLimit.mockReset();
  getAccountById.mockResolvedValue({ id: ACCOUNT_ID, current_balance: 500 });
  getCreditCardById.mockResolvedValue({ id: CARD_ID, available_limit: 1000 });
});

describe('POST /finance/transactions com status', () => {
  it('rejeita status invalido', async () => {
    const res = await postTransaction({ ...basePayload, status: 'VENCIDO' });
    expect(res.statusCode).toBe(400);
  });

  it('sem status: cria PENDENTE e nao mexe no saldo', async () => {
    const res = await postTransaction(basePayload);

    expect(res.statusCode).toBe(201);
    expect(insertedRow).toMatchObject({
      status: 'PENDENTE',
      paid_amount: null,
      payment_date: null,
    });
    expect(updateAccountBalance).not.toHaveBeenCalled();
  });

  it('DESPESA com status PAGO: nasce efetuada e debita o saldo da conta', async () => {
    const res = await postTransaction({ ...basePayload, status: 'PAGO' });

    expect(res.statusCode).toBe(201);
    expect(insertedRow).toMatchObject({
      status: 'PAGO',
      paid_amount: 80,
      payment_date: '2026-07-21',
    });
    expect(updateAccountBalance).toHaveBeenCalledWith(
      ACCOUNT_ID,
      TOKEN_USER_ID,
      420,
      'token-valido'
    );
  });

  it('RECEITA com status PAGO: credita o saldo da conta', async () => {
    const res = await postTransaction({
      ...basePayload,
      type: 'RECEITA',
      description: 'Salario',
      amount: 300,
      status: 'PAGO',
    });

    expect(res.statusCode).toBe(201);
    expect(insertedRow).toMatchObject({ status: 'PAGO', paid_amount: 300 });
    expect(updateAccountBalance).toHaveBeenCalledWith(
      ACCOUNT_ID,
      TOKEN_USER_ID,
      800,
      'token-valido'
    );
  });

  it('despesa de cartao ignora status PAGO (fatura liquida a compra)', async () => {
    const res = await postTransaction({
      ...basePayload,
      account_id: undefined,
      credit_card_id: CARD_ID,
      status: 'PAGO',
    });

    expect(res.statusCode).toBe(201);
    expect(insertedRow).toMatchObject({
      status: 'PENDENTE',
      paid_amount: null,
      payment_date: null,
    });
    expect(updateAccountBalance).not.toHaveBeenCalled();
    // Limite do cartao continua sendo decrementado normalmente
    expect(updateCreditCardAvailableLimit).toHaveBeenCalledWith(
      CARD_ID,
      TOKEN_USER_ID,
      -80,
      'token-valido'
    );
  });
});
