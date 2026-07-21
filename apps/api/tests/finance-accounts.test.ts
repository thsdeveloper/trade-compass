import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

const TOKEN_USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '99999999-9999-4999-8999-999999999999';
const BANK_ID = '22222222-2222-4222-8222-222222222222';

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
  createUserClient: vi.fn(),
  verifyUserPassword: vi.fn(),
}));

const createAccount = vi.fn();
const updateAccount = vi.fn();
const deleteAccount = vi.fn();
const getAccountById = vi.fn();
const getAccountUsage = vi.fn();

vi.mock('../src/data/finance/account-repository.js', () => ({
  getAccountsByUser: vi.fn(async () => []),
  getAccountById: (...args: unknown[]) => getAccountById(...args),
  createAccount: (...args: unknown[]) => createAccount(...args),
  updateAccount: (...args: unknown[]) => updateAccount(...args),
  updateAccountBalance: vi.fn(),
  deleteAccount: (...args: unknown[]) => deleteAccount(...args),
  getAccountUsage: (...args: unknown[]) => getAccountUsage(...args),
}));

const { buildServer } = await import('../src/api/server.js');

let app: FastifyInstance;

function accountFixture() {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    user_id: TOKEN_USER_ID,
    bank_id: BANK_ID,
    name: 'Conta Nubank',
    type: 'CONTA_CORRENTE',
    initial_balance: 100,
    current_balance: 100,
    color: '#8a05be',
    icon: 'Wallet',
    is_active: true,
    created_at: '2026-07-20T00:00:00.000Z',
    updated_at: '2026-07-20T00:00:00.000Z',
    bank: { id: BANK_ID, name: 'Nubank' },
  };
}

function post(payload: unknown, token: string | null = 'token-valido') {
  return app.inject({
    method: 'POST',
    url: '/finance/accounts',
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

function patch(payload: unknown, token: string | null = 'token-valido') {
  return app.inject({
    method: 'PATCH',
    url: `/finance/accounts/${accountFixture().id}`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    payload: payload as Record<string, unknown>,
  });
}

function del(token: string | null = 'token-valido') {
  return app.inject({
    method: 'DELETE',
    url: `/finance/accounts/${accountFixture().id}`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function usage(token: string | null = 'token-valido') {
  return app.inject({
    method: 'GET',
    url: `/finance/accounts/${accountFixture().id}/usage`,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

function usageFixture(overrides: Record<string, number> = {}) {
  const counts = {
    transactions: 0,
    recurrences: 0,
    invoice_payments: 0,
    goals: 0,
    ...overrides,
  };

  return {
    ...counts,
    can_delete: Object.values(counts).every((count) => count === 0),
  };
}

beforeEach(() => {
  createAccount.mockReset();
  createAccount.mockResolvedValue(accountFixture());
  updateAccount.mockReset();
  updateAccount.mockResolvedValue(accountFixture());
  deleteAccount.mockReset();
  deleteAccount.mockResolvedValue(undefined);
  getAccountById.mockReset();
  getAccountById.mockResolvedValue(accountFixture());
  getAccountUsage.mockReset();
  getAccountUsage.mockResolvedValue(usageFixture());
});

describe('POST /finance/accounts', () => {
  it('retorna 401 sem header Authorization', async () => {
    const response = await post({ name: 'Conta Nubank', type: 'CONTA_CORRENTE' }, null);

    expect(response.statusCode).toBe(401);
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('retorna 400 quando o body esta ausente', async () => {
    const response = await post(undefined);

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Bad Request');
    expect(body.fields).toBeDefined();
  });

  it('retorna 400 com nome vazio e aponta o campo', async () => {
    const response = await post({ name: '   ', type: 'CONTA_CORRENTE' });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.fields.name).toBe('O nome da conta precisa ter ao menos 2 caracteres');
    expect(body.message).toBe(body.fields.name);
  });

  it('retorna 400 com tipo fora do enum', async () => {
    const response = await post({ name: 'Conta Nubank', type: 'CRIPTO' });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.fields.type).toBe('Tipo de conta invalido');
  });

  it('retorna 400 com bank_id que nao e uuid', async () => {
    const response = await post({
      name: 'Conta Nubank',
      type: 'CONTA_CORRENTE',
      bank_id: 'nubank',
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.fields.bank_id).toBe('Banco invalido');
  });

  it('retorna 409 quando o indice unico de nome dispara (23505)', async () => {
    const err = new Error('duplicate key value violates unique constraint') as Error & {
      code?: string;
    };
    err.code = '23505';
    createAccount.mockRejectedValue(err);

    const response = await post({ name: 'Conta Nubank', type: 'CONTA_CORRENTE' });

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Voce ja tem uma conta com esse nome');
  });

  it('nao vaza a mensagem crua do Postgres no 500', async () => {
    createAccount.mockRejectedValue(new Error('relation "finance_accounts" does not exist'));

    const response = await post({ name: 'Conta Nubank', type: 'CONTA_CORRENTE' });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.message).toBe('Nao foi possivel criar a conta');
  });

  it('retorna 201 com o shape da conta (incluindo o banco)', async () => {
    const response = await post({
      name: 'Conta Nubank',
      type: 'CONTA_CORRENTE',
      bank_id: BANK_ID,
      initial_balance: 100,
      color: '#8a05be',
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.body);
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Conta Nubank');
    expect(body.type).toBe('CONTA_CORRENTE');
    expect(body.bank.name).toBe('Nubank');
  });

  it('usa o user.id do token e ignora qualquer user_id do body', async () => {
    const response = await post({
      name: 'Conta Nubank',
      type: 'CONTA_CORRENTE',
      user_id: OTHER_USER_ID,
    });

    expect(response.statusCode).toBe(201);
    expect(createAccount).toHaveBeenCalledTimes(1);

    const [userId, payload, accessToken] = createAccount.mock.calls[0];
    expect(userId).toBe(TOKEN_USER_ID);
    expect(accessToken).toBe('token-valido');
    expect(payload).not.toHaveProperty('user_id');
  });
});

describe('PATCH /finance/accounts/:id', () => {
  it('retorna 401 sem header Authorization', async () => {
    const response = await patch({ name: 'Outro nome' }, null);

    expect(response.statusCode).toBe(401);
    expect(updateAccount).not.toHaveBeenCalled();
  });

  it('descarta colunas nao declaradas no schema (mass-assignment)', async () => {
    const response = await patch({
      name: 'Conta renomeada',
      id: '44444444-4444-4444-8444-444444444444',
      user_id: OTHER_USER_ID,
      current_balance: 99999999,
      created_at: '1970-01-01T00:00:00.000Z',
    });

    expect(response.statusCode).toBe(200);
    expect(updateAccount).toHaveBeenCalledTimes(1);

    const [accountId, userId, payload] = updateAccount.mock.calls[0];
    expect(accountId).toBe(accountFixture().id);
    expect(userId).toBe(TOKEN_USER_ID);
    expect(payload).toEqual({ name: 'Conta renomeada' });
  });

  it('retorna 400 quando o body nao tem nenhum campo atualizavel', async () => {
    const response = await patch({ current_balance: 500 });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Informe ao menos um campo para atualizar'
    );
    expect(updateAccount).not.toHaveBeenCalled();
  });

  it('retorna 400 com cor fora do formato hex', async () => {
    const response = await patch({ color: 'roxo' });

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).fields.color).toBe('Cor invalida');
    expect(updateAccount).not.toHaveBeenCalled();
  });

  it('retorna 409 quando o rename colide com o indice unico (23505)', async () => {
    const err = new Error('duplicate key value violates unique constraint') as Error & {
      code?: string;
    };
    err.code = '23505';
    updateAccount.mockRejectedValue(err);

    const response = await patch({ name: 'Conta Nubank' });

    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body).message).toBe('Voce ja tem uma conta com esse nome');
  });

  it('aceita bank_id null para desvincular o banco', async () => {
    const response = await patch({ bank_id: null });

    expect(response.statusCode).toBe(200);
    expect(updateAccount.mock.calls[0][2]).toEqual({ bank_id: null });
  });
});

describe('DELETE /finance/accounts/:id', () => {
  it('retorna 401 sem header Authorization', async () => {
    const response = await del(null);

    expect(response.statusCode).toBe(401);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('retorna 409 quando a conta tem registros vinculados', async () => {
    deleteAccount.mockRejectedValue(
      new Error(
        'Nao e possivel remover esta conta pois ela possui registros vinculados: 3 transacao(oes), 1 meta(s) vinculada(s). Remova ou transfira esses registros antes de excluir a conta.'
      )
    );

    const response = await del();

    expect(response.statusCode).toBe(409);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Conflict');
    expect(body.message).toContain('registros vinculados');
    expect(body.message).toContain('1 meta(s) vinculada(s)');
  });

  it('retorna 200 quando nao ha nada vinculado', async () => {
    const response = await del();

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ success: true });

    const [accountId, userId, accessToken] = deleteAccount.mock.calls[0];
    expect(accountId).toBe(accountFixture().id);
    expect(userId).toBe(TOKEN_USER_ID);
    expect(accessToken).toBe('token-valido');
  });

  it('nao vaza a mensagem crua do Postgres no 500', async () => {
    deleteAccount.mockRejectedValue(new Error('relation "finance_goals" does not exist'));

    const response = await del();

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Nao foi possivel remover a conta');
  });
});

describe('GET /finance/accounts/:id/usage', () => {
  it('retorna 401 sem header Authorization', async () => {
    const response = await usage(null);

    expect(response.statusCode).toBe(401);
    expect(getAccountUsage).not.toHaveBeenCalled();
  });

  it('retorna 404 quando a conta nao existe ou nao e do usuario', async () => {
    getAccountById.mockResolvedValue(null);

    const response = await usage();

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Conta nao encontrada');
    expect(getAccountUsage).not.toHaveBeenCalled();
  });

  it('retorna as contagens com can_delete true quando nao ha vinculos', async () => {
    const response = await usage();

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      transactions: 0,
      recurrences: 0,
      invoice_payments: 0,
      goals: 0,
      can_delete: true,
    });

    const [accountId, userId, accessToken] = getAccountUsage.mock.calls[0];
    expect(accountId).toBe(accountFixture().id);
    expect(userId).toBe(TOKEN_USER_ID);
    expect(accessToken).toBe('token-valido');
  });

  it('retorna can_delete false quando ha meta vinculada', async () => {
    getAccountUsage.mockResolvedValue(usageFixture({ transactions: 2, goals: 1 }));

    const response = await usage();

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.transactions).toBe(2);
    expect(body.goals).toBe(1);
    expect(body.can_delete).toBe(false);
  });

  it('nao e sombreada pela rota /:id e nao vaza a mensagem crua do Postgres no 500', async () => {
    getAccountUsage.mockRejectedValue(new Error('relation "finance_goals" does not exist'));

    const response = await usage();

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe(
      'Nao foi possivel carregar os vinculos da conta'
    );
  });
});
