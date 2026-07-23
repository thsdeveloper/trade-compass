import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const TOKEN_USER_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_ACCOUNT_ID = '44444444-4444-4444-8444-444444444444';
const DEST_ACCOUNT_ID = '55555555-5555-4555-8555-555555555555';
const TRANSFER_CATEGORY_DESPESA = 'cat-transfer-despesa';
const TRANSFER_CATEGORY_RECEITA = 'cat-transfer-receita';

// Captura dos inserts em finance_transactions feitos pelo createTransfer
let insertedRows: Record<string, unknown>[] = [];

function fakeClient() {
  return {
    from: () => ({
      insert: (rows: Record<string, unknown>[]) => ({
        select: async () => {
          insertedRows = rows;
          return {
            data: rows.map((r, i) => ({ id: `tx-${i}`, ...r })),
            error: null,
          };
        },
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

const getTransferCategory = vi.fn();

vi.mock('../src/data/finance/category-repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/data/finance/category-repository.js')>();
  return {
    ...actual,
    getTransferCategory: (...args: unknown[]) => getTransferCategory(...args),
  };
});

const { buildServer } = await import('../src/api/server.js');

let app: FastifyInstance;

function postTransfer(payload: unknown, token: string | null = 'token-valido') {
  return app.inject({
    method: 'POST',
    url: '/finance/transactions/transfer',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: payload as Record<string, unknown>,
  });
}

const validPayload = {
  source_account_id: SOURCE_ACCOUNT_ID,
  destination_account_id: DEST_ACCOUNT_ID,
  description: 'Reserva do mês',
  amount: 250,
  transfer_date: '2026-07-21',
};

beforeAll(async () => {
  app = await buildServer();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  insertedRows = [];
  getAccountById.mockReset();
  updateAccountBalance.mockReset();
  getTransferCategory.mockReset();
  getAccountById.mockImplementation(async (id: string) =>
    id === SOURCE_ACCOUNT_ID
      ? { id: SOURCE_ACCOUNT_ID, current_balance: 1000 }
      : { id: DEST_ACCOUNT_ID, current_balance: 200 }
  );
  getTransferCategory.mockImplementation(async (type: string) => ({
    id: type === 'DESPESA' ? TRANSFER_CATEGORY_DESPESA : TRANSFER_CATEGORY_RECEITA,
  }));
});

describe('POST /finance/transactions/transfer', () => {
  it('exige autenticacao', async () => {
    expect((await postTransfer(validPayload, null)).statusCode).toBe(401);
  });

  it('rejeita origem igual ao destino', async () => {
    const res = await postTransfer({
      ...validPayload,
      destination_account_id: SOURCE_ACCOUNT_ID,
    });
    expect(res.statusCode).toBe(400);
  });

  it('cria transferencia SEM category_id usando a categoria de sistema por perna', async () => {
    const res = await postTransfer(validPayload);

    expect(res.statusCode).toBe(201);
    expect(insertedRows).toHaveLength(2);

    const source = insertedRows.find((r) => r.type === 'DESPESA')!;
    const dest = insertedRows.find((r) => r.type === 'RECEITA')!;

    // Categoria resolvida por perna: DESPESA na origem, RECEITA no destino
    expect(source.category_id).toBe(TRANSFER_CATEGORY_DESPESA);
    expect(dest.category_id).toBe(TRANSFER_CATEGORY_RECEITA);

    // Pernas nascem PAGAS, vinculadas pelo mesmo transfer_id
    expect(source.status).toBe('PAGO');
    expect(dest.status).toBe('PAGO');
    expect(source.transfer_id).toBe(dest.transfer_id);
    expect(source.account_id).toBe(SOURCE_ACCOUNT_ID);
    expect(dest.account_id).toBe(DEST_ACCOUNT_ID);

    // Saldo sai da origem e entra no destino na hora
    expect(updateAccountBalance).toHaveBeenCalledWith(
      SOURCE_ACCOUNT_ID,
      TOKEN_USER_ID,
      750,
      'token-valido'
    );
    expect(updateAccountBalance).toHaveBeenCalledWith(
      DEST_ACCOUNT_ID,
      TOKEN_USER_ID,
      450,
      'token-valido'
    );
  });

  it('mantem a categoria enviada pelo cliente (compatibilidade com a web)', async () => {
    const res = await postTransfer({ ...validPayload, category_id: 'cat-web' });

    expect(res.statusCode).toBe(201);
    expect(getTransferCategory).not.toHaveBeenCalled();
    expect(insertedRows.every((r) => r.category_id === 'cat-web')).toBe(true);
  });

  it('propaga recurrence_id para as duas pernas', async () => {
    const res = await postTransfer({ ...validPayload, recurrence_id: 'rec-9' });

    expect(res.statusCode).toBe(201);
    expect(insertedRows.every((r) => r.recurrence_id === 'rec-9')).toBe(true);
  });
});
