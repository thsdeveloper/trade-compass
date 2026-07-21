import { describe, it, expect, beforeEach, vi } from 'vitest';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_ID = '33333333-3333-4333-8333-333333333333';
const TOKEN = 'token-valido';

const createUserClient = vi.fn();

vi.mock('../src/lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn() } },
  createUserClient: (...args: unknown[]) => createUserClient(...args),
  verifyUserPassword: vi.fn(),
}));

const { getAccountUsage, deleteAccount } = await import(
  '../src/data/finance/account-repository.js'
);

type QueryResult = { count: number | null; error: { message: string; code?: string } | null };

/**
 * Simula o query builder do PostgREST: os filtros encadeiam e o objeto e
 * "thenable", entao `await` na cadeia resolve no resultado configurado.
 */
function tabelaComResultado(resultado: QueryResult) {
  const builder: Record<string, unknown> = {};
  for (const metodo of ['select', 'eq', 'neq', 'in', 'update']) {
    builder[metodo] = () => builder;
  }
  builder.then = (resolve: (value: QueryResult) => unknown) => Promise.resolve(resolve(resultado));
  return builder;
}

const OK = (count: number): QueryResult => ({ count, error: null });
const FALHA = (message: string, code?: string): QueryResult => ({
  count: null,
  error: { message, code },
});

/** Mapeia cada tabela consultada por getAccountUsage ao resultado desejado. */
function clientComTabelas(porTabela: Record<string, QueryResult>) {
  return {
    from: (tabela: string) => tabelaComResultado(porTabela[tabela] ?? OK(0)),
  };
}

const SEM_VINCULOS: Record<string, QueryResult> = {
  finance_transactions: OK(0),
  finance_recurrences: OK(0),
  finance_invoice_payments: OK(0),
  finance_goals: OK(0),
};

beforeEach(() => {
  createUserClient.mockReset();
});

describe('getAccountUsage', () => {
  it('devolve can_delete true quando as quatro contagens sao zero', async () => {
    createUserClient.mockReturnValue(clientComTabelas(SEM_VINCULOS));

    const usage = await getAccountUsage(ACCOUNT_ID, USER_ID, TOKEN);

    expect(usage).toEqual({
      transactions: 0,
      recurrences: 0,
      invoice_payments: 0,
      goals: 0,
      can_delete: true,
    });
  });

  it('conta metas vinculadas e bloqueia a exclusao', async () => {
    createUserClient.mockReturnValue(
      clientComTabelas({ ...SEM_VINCULOS, finance_goals: OK(1) })
    );

    const usage = await getAccountUsage(ACCOUNT_ID, USER_ID, TOKEN);

    expect(usage.goals).toBe(1);
    expect(usage.can_delete).toBe(false);
  });

  // O PostgREST nao rejeita a promessa quando a consulta falha: devolve
  // { count: null, error }. Se o erro fosse ignorado, a contagem viraria zero e
  // a regra liberaria a exclusao — exatamente o que estes testes impedem.
  for (const tabela of [
    'finance_transactions',
    'finance_recurrences',
    'finance_invoice_payments',
    'finance_goals',
  ]) {
    it(`falha fechada quando a contagem de ${tabela} da erro`, async () => {
      createUserClient.mockReturnValue(
        clientComTabelas({ ...SEM_VINCULOS, [tabela]: FALHA('statement timeout', '57014') })
      );

      await expect(getAccountUsage(ACCOUNT_ID, USER_ID, TOKEN)).rejects.toThrow(
        'Erro ao verificar vinculos da conta'
      );
    });
  }
});

describe('deleteAccount', () => {
  it('nao desativa a conta quando a verificacao de vinculos falha', async () => {
    const update = vi.fn();
    createUserClient.mockImplementation(() => ({
      from: (tabela: string) => {
        if (tabela === 'finance_accounts') {
          update();
          return tabelaComResultado(OK(0));
        }
        return tabelaComResultado(
          tabela === 'finance_transactions' ? FALHA('statement timeout', '57014') : OK(0)
        );
      },
    }));

    await expect(deleteAccount(ACCOUNT_ID, USER_ID, TOKEN)).rejects.toThrow(
      'Erro ao verificar vinculos da conta'
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('bloqueia com a mensagem de registros vinculados quando ha lancamentos', async () => {
    createUserClient.mockReturnValue(
      clientComTabelas({ ...SEM_VINCULOS, finance_transactions: OK(12) })
    );

    await expect(deleteAccount(ACCOUNT_ID, USER_ID, TOKEN)).rejects.toThrow(
      /registros vinculados/
    );
  });
});
