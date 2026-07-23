import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const TOKEN_USER_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_ACCOUNT_ID = 'acc-origem';
const DEST_ACCOUNT_ID = 'acc-destino';
const TRANSFER_CATEGORY_ID = 'cat-transfer-despesa';

const DAY_MS = 86_400_000;
/** Data ISO (YYYY-MM-DD) de N dias atrás — N negativo = futuro */
function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * DAY_MS).toISOString().split('T')[0];
}

// Estado do banco fake
let recurrenceRows: Record<string, unknown>[] = [];
let recurrenceInserts: Record<string, unknown>[] = [];
let recurrenceUpdates: Record<string, unknown>[] = [];
let transactionInserts: unknown[] = [];

function fakeClient() {
  const secondEqForSelect = () => ({
    single: async () => ({ data: recurrenceRows[0] ?? null, error: null }),
    lte: async () => ({ data: recurrenceRows, error: null }),
  });

  return {
    from: (table: string) => {
      if (table === 'finance_recurrences') {
        return {
          insert: (row: Record<string, unknown>) => ({
            select: () => ({
              single: async () => {
                recurrenceInserts.push(row);
                return { data: { id: 'rec-1', ...row }, error: null };
              },
            }),
          }),
          select: () => ({
            eq: () => ({ eq: secondEqForSelect }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: () => ({
              eq: () => {
                recurrenceUpdates.push(payload);
                const p = Promise.resolve({ error: null });
                return Object.assign(p, {
                  select: () => ({
                    single: async () => ({ data: { id: 'rec-1' }, error: null }),
                  }),
                });
              },
            }),
          }),
        };
      }
      // finance_transactions
      return {
        insert: (rows: unknown) => {
          transactionInserts.push(rows);
          const p = Promise.resolve({ data: null, error: null });
          return Object.assign(p, {
            select: async () => ({
              data: (Array.isArray(rows) ? rows : [rows]).map((r, i) => ({
                id: `t-${i}`,
                ...(r as Record<string, unknown>),
              })),
              error: null,
            }),
          });
        },
      };
    },
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

const createTransfer = vi.fn();

vi.mock('../src/data/finance/transaction-repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/data/finance/transaction-repository.js')>();
  return {
    ...actual,
    createTransfer: (...args: unknown[]) => createTransfer(...args),
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

const updateTag = vi.fn();

vi.mock('../src/data/finance/tag-repository.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/data/finance/tag-repository.js')>();
  return {
    ...actual,
    updateTag: (...args: unknown[]) => updateTag(...args),
  };
});

const { buildServer } = await import('../src/api/server.js');

let app: FastifyInstance;

function inject(
  method: 'POST' | 'PATCH',
  url: string,
  payload?: unknown,
  token: string | null = 'token-valido'
) {
  return app.inject({
    method,
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(payload !== undefined ? { payload: payload as Record<string, unknown> } : {}),
  });
}

const transferRecurrencePayload = {
  type: 'TRANSFERENCIA',
  account_id: SOURCE_ACCOUNT_ID,
  destination_account_id: DEST_ACCOUNT_ID,
  description: 'Aporte na reserva',
  amount: 100,
  frequency: 'MENSAL',
  start_date: isoDaysAgo(0),
};

beforeAll(async () => {
  app = await buildServer();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  recurrenceRows = [];
  recurrenceInserts = [];
  recurrenceUpdates = [];
  transactionInserts = [];
  createTransfer.mockReset();
  getTransferCategory.mockReset();
  updateTag.mockReset();
  createTransfer.mockImplementation(async () => ({
    transfer_id: 'tr-1',
    source_transaction: { id: 's-1' },
    destination_transaction: { id: 'd-1' },
  }));
  getTransferCategory.mockResolvedValue({ id: TRANSFER_CATEGORY_ID });
});

describe('POST /finance/recurrences (TRANSFERENCIA)', () => {
  it('exige conta de origem e destino', async () => {
    const res = await inject('POST', '/finance/recurrences', {
      ...transferRecurrencePayload,
      destination_account_id: undefined,
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejeita origem igual ao destino', async () => {
    const res = await inject('POST', '/finance/recurrences', {
      ...transferRecurrencePayload,
      destination_account_id: SOURCE_ACCOUNT_ID,
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejeita cartao de credito em transferencia recorrente', async () => {
    const res = await inject('POST', '/finance/recurrences', {
      ...transferRecurrencePayload,
      credit_card_id: 'card-1',
    });
    expect(res.statusCode).toBe(400);
  });

  it('sem categoria: resolve a categoria de sistema e cria a 1a transferencia quando o inicio e hoje', async () => {
    const res = await inject('POST', '/finance/recurrences', transferRecurrencePayload);

    expect(res.statusCode).toBe(201);
    expect(getTransferCategory).toHaveBeenCalledWith('DESPESA', 'token-valido');
    expect(recurrenceInserts[0]).toMatchObject({
      category_id: TRANSFER_CATEGORY_ID,
      destination_account_id: DEST_ACCOUNT_ID,
      type: 'TRANSFERENCIA',
    });

    // Primeira ocorrencia materializada via createTransfer (nunca insert PENDENTE)
    expect(createTransfer).toHaveBeenCalledTimes(1);
    expect(createTransfer).toHaveBeenCalledWith(
      TOKEN_USER_ID,
      expect.objectContaining({
        source_account_id: SOURCE_ACCOUNT_ID,
        destination_account_id: DEST_ACCOUNT_ID,
        transfer_date: transferRecurrencePayload.start_date,
        recurrence_id: 'rec-1',
      }),
      'token-valido'
    );
    expect(transactionInserts).toHaveLength(0);
  });

  it('inicio futuro: agenda sem criar transacao (next_occurrence = start_date)', async () => {
    const futureStart = isoDaysAgo(-10);
    const res = await inject('POST', '/finance/recurrences', {
      ...transferRecurrencePayload,
      start_date: futureStart,
    });

    expect(res.statusCode).toBe(201);
    expect(createTransfer).not.toHaveBeenCalled();
    expect(transactionInserts).toHaveLength(0);
    expect(recurrenceInserts[0].next_occurrence).toBe(futureStart);
  });
});

describe('POST /finance/recurrences/generate-due', () => {
  function recurrenceFixture(overrides: Record<string, unknown>) {
    return {
      id: 'rec-1',
      user_id: TOKEN_USER_ID,
      category_id: 'cat-1',
      account_id: SOURCE_ACCOUNT_ID,
      destination_account_id: null,
      credit_card_id: null,
      description: 'Recorrencia',
      amount: 50,
      type: 'DESPESA',
      frequency: 'DIARIA',
      start_date: isoDaysAgo(10),
      end_date: null,
      next_occurrence: isoDaysAgo(1),
      is_active: true,
      ...overrides,
    };
  }

  it('materializa transferencias vencidas so ate hoje, via createTransfer', async () => {
    recurrenceRows = [
      recurrenceFixture({
        type: 'TRANSFERENCIA',
        destination_account_id: DEST_ACCOUNT_ID,
        next_occurrence: isoDaysAgo(2),
      }),
    ];

    const res = await inject('POST', '/finance/recurrences/generate-due');

    expect(res.statusCode).toBe(200);
    // Ocorrencias devidas: -2d, -1d e hoje — nada no futuro
    expect(res.json()).toEqual({ generated: 3 });
    expect(createTransfer).toHaveBeenCalledTimes(3);
    const dates = createTransfer.mock.calls.map(
      (call) => (call[1] as { transfer_date: string }).transfer_date
    );
    expect(dates).toEqual([isoDaysAgo(2), isoDaysAgo(1), isoDaysAgo(0)]);
    // next_occurrence avanca para amanha
    expect(recurrenceUpdates).toContainEqual({ next_occurrence: isoDaysAgo(-1) });
  });

  it('materializa RECEITA/DESPESA vencidas como PENDENTE em lote', async () => {
    recurrenceRows = [recurrenceFixture({ next_occurrence: isoDaysAgo(1) })];

    const res = await inject('POST', '/finance/recurrences/generate-due');

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ generated: 2 }); // ontem e hoje
    expect(createTransfer).not.toHaveBeenCalled();
    expect(transactionInserts).toHaveLength(1);
    const rows = transactionInserts[0] as Record<string, unknown>[];
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'PENDENTE' && r.recurrence_id === 'rec-1')).toBe(true);
    expect(rows.map((r) => r.due_date)).toEqual([isoDaysAgo(1), isoDaysAgo(0)]);
    expect(recurrenceUpdates).toContainEqual({ next_occurrence: isoDaysAgo(-1) });
  });

  it('desativa recorrencia cujo end_date ja passou, sem gerar nada', async () => {
    recurrenceRows = [
      recurrenceFixture({ next_occurrence: isoDaysAgo(3), end_date: isoDaysAgo(5) }),
    ];

    const res = await inject('POST', '/finance/recurrences/generate-due');

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ generated: 0 });
    expect(transactionInserts).toHaveLength(0);
    expect(recurrenceUpdates).toContainEqual({ is_active: false });
  });
});

describe('PATCH /finance/tags/:id', () => {
  it('renomeia a tag', async () => {
    updateTag.mockResolvedValue({ id: 'tag-1', name: 'Mercado' });

    const res = await inject('PATCH', '/finance/tags/tag-1', { name: '  Mercado  ' });

    expect(res.statusCode).toBe(200);
    expect(updateTag).toHaveBeenCalledWith(
      'tag-1',
      TOKEN_USER_ID,
      { name: 'Mercado' },
      'token-valido'
    );
  });

  it('rejeita nome vazio', async () => {
    expect((await inject('PATCH', '/finance/tags/tag-1', { name: '   ' })).statusCode).toBe(400);
  });

  it('404 quando a tag nao existe', async () => {
    updateTag.mockRejectedValue(new Error('Tag nao encontrada'));
    expect((await inject('PATCH', '/finance/tags/tag-x', { name: 'X' })).statusCode).toBe(404);
  });
});
