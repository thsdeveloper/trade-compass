import { describe, it, expect } from 'vitest';
import {
  matchTransfers,
  type MatchStatementInput,
  type MatchTransactionInput,
} from '../src/services/transfer-matching-service.js';

const NUBANK = 'acc-nubank';
const ITAU = 'acc-itau';
const BRADESCO = 'acc-bradesco';

function makeTx(overrides: Partial<MatchTransactionInput> = {}): MatchTransactionInput {
  return {
    description: 'PIX enviado',
    amount: 500,
    type: 'DESPESA',
    due_date: '2026-07-10',
    line_kind: 'TRANSFERENCIA_INTERNA',
    suggested_transfer_account_id: null,
    possible_duplicate: false,
    ...overrides,
  };
}

function makeStatements(
  a: MatchTransactionInput[],
  b: MatchTransactionInput[],
  accountA = NUBANK,
  accountB = ITAU
): MatchStatementInput[] {
  return [
    { account_id: accountA, transactions: a },
    { account_id: accountB, transactions: b },
  ];
}

describe('matchTransfers()', () => {
  it('pareia DESPESA e RECEITA de contas diferentes com mesmo valor e mesma data', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', description: 'PIX enviado Itau' })],
        [makeTx({ type: 'RECEITA', description: 'PIX recebido Nubank' })]
      )
    );
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].out).toEqual({ statement_index: 0, tx_index: 0 });
    expect(result.pairs[0].in).toEqual({ statement_index: 1, tx_index: 0 });
  });

  it('pareia dentro da janela de 3 dias quando ha sinais de transferencia', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', due_date: '2026-07-10' })],
        [makeTx({ type: 'RECEITA', due_date: '2026-07-12' })]
      )
    );
    expect(result.pairs).toHaveLength(1);
  });

  it('NAO pareia fora da janela de 3 dias', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', due_date: '2026-07-10' })],
        [makeTx({ type: 'RECEITA', due_date: '2026-07-15' })]
      )
    );
    expect(result.pairs).toHaveLength(0);
  });

  it('NAO pareia valores diferentes', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', amount: 500 })],
        [makeTx({ type: 'RECEITA', amount: 500.5 })]
      )
    );
    expect(result.pairs).toHaveLength(0);
  });

  it('NAO pareia transacoes da mesma conta (dois extratos da mesma conta)', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA' })],
        [makeTx({ type: 'RECEITA' })],
        NUBANK,
        NUBANK
      )
    );
    expect(result.pairs).toHaveLength(0);
  });

  it('NAO pareia DESPESA com DESPESA', () => {
    const result = matchTransfers(
      makeStatements([makeTx({ type: 'DESPESA' })], [makeTx({ type: 'DESPESA' })])
    );
    expect(result.pairs).toHaveLength(0);
  });

  it('exclui PAGAMENTO_FATURA do pareamento', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', line_kind: 'PAGAMENTO_FATURA' })],
        [makeTx({ type: 'RECEITA' })]
      )
    );
    expect(result.pairs).toHaveLength(0);
  });

  it('score minimo: valor igual + 3 dias de diferenca SEM outros sinais nao pareia', () => {
    const result = matchTransfers(
      makeStatements(
        [
          makeTx({
            type: 'DESPESA',
            due_date: '2026-07-10',
            line_kind: 'NORMAL',
            description: 'Salario empresa',
          }),
        ],
        [
          makeTx({
            type: 'RECEITA',
            due_date: '2026-07-13',
            line_kind: 'NORMAL',
            description: 'Compra mercado',
          }),
        ]
      )
    );
    expect(result.pairs).toHaveLength(0);
  });

  it('NAO pareia sem sinal de transferencia interna, mesmo com valor e data iguais', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', line_kind: 'NORMAL', description: 'Debito avulso' })],
        [makeTx({ type: 'RECEITA', line_kind: 'NORMAL', description: 'Credito avulso' })]
      )
    );
    expect(result.pairs).toHaveLength(0);
  });

  it('NAO pareia PIX para terceiros (descricao de PIX mas line_kind NORMAL nas duas pernas)', () => {
    // Ex: PIX enviado para outra pessoa + PIX recebido de outra pessoa,
    // mesmo valor no mesmo dia por coincidencia — nao e transferencia propria
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', line_kind: 'NORMAL', description: 'PIX enviado Maria Souza' })],
        [makeTx({ type: 'RECEITA', line_kind: 'NORMAL', description: 'PIX recebido Joao Lima' })]
      )
    );
    expect(result.pairs).toHaveLength(0);
  });

  it('pareia quando apenas UMA perna tem sinal de transferencia interna da IA', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', description: 'PIX enviado Thiago Pereira' })],
        [makeTx({ type: 'RECEITA', line_kind: 'NORMAL', description: 'PIX recebido Thiago Pereira' })]
      )
    );
    expect(result.pairs).toHaveLength(1);
  });

  it('sugestao de conta contraparte correta e sinal suficiente para parear', () => {
    const result = matchTransfers(
      makeStatements(
        [
          makeTx({
            type: 'DESPESA',
            line_kind: 'NORMAL',
            description: 'Transferencia enviada',
            suggested_transfer_account_id: ITAU,
          }),
        ],
        [makeTx({ type: 'RECEITA', line_kind: 'NORMAL', description: 'Credito recebido' })]
      )
    );
    expect(result.pairs).toHaveLength(1);
  });

  it('line_kind TRANSFERENCIA_INTERNA nos dois lados + mesma data + descricao PIX = HIGH', () => {
    const result = matchTransfers(
      makeStatements(
        [makeTx({ type: 'DESPESA', description: 'PIX enviado' })],
        [makeTx({ type: 'RECEITA', description: 'PIX recebido' })]
      )
    );
    expect(result.pairs).toHaveLength(1);
    expect(result.pairs[0].confidence).toBe('HIGH');
  });

  it('sugestao de conta contraparte correta aumenta o score', () => {
    // Duas candidatas RECEITA identicas em contas diferentes; a sugestao desempata
    const statements: MatchStatementInput[] = [
      {
        account_id: NUBANK,
        transactions: [
          makeTx({
            type: 'DESPESA',
            description: 'Transferencia enviada',
            suggested_transfer_account_id: BRADESCO,
          }),
        ],
      },
      { account_id: ITAU, transactions: [makeTx({ type: 'RECEITA', line_kind: 'NORMAL', description: 'Credito' })] },
      { account_id: BRADESCO, transactions: [makeTx({ type: 'RECEITA', line_kind: 'NORMAL', description: 'Credito' })] },
    ];
    const result = matchTransfers(statements);
    expect(result.pairs).toHaveLength(1);
    // Deve escolher a conta sugerida (Bradesco, statement 2), nao o Itau
    expect(result.pairs[0].in.statement_index).toBe(2);
  });

  it('ida e volta no mesmo dia (A->B e B->A) gera dois pares corretos', () => {
    const result = matchTransfers(
      makeStatements(
        [
          makeTx({ type: 'DESPESA', description: 'PIX enviado Itau' }),
          makeTx({ type: 'RECEITA', description: 'PIX recebido Itau' }),
        ],
        [
          makeTx({ type: 'RECEITA', description: 'PIX recebido Nubank' }),
          makeTx({ type: 'DESPESA', description: 'PIX enviado Nubank' }),
        ]
      )
    );
    expect(result.pairs).toHaveLength(2);
    const pairA = result.pairs.find((p) => p.out.statement_index === 0);
    const pairB = result.pairs.find((p) => p.out.statement_index === 1);
    expect(pairA?.in).toEqual({ statement_index: 1, tx_index: 0 });
    expect(pairB?.in).toEqual({ statement_index: 0, tx_index: 1 });
  });

  it('empate de candidatas identicas: atribuicao deterministica e sobra fica sem par', () => {
    // Dois PIX de 500 saindo do Nubank no mesmo dia, mas so UMA entrada no Itau
    const result = matchTransfers(
      makeStatements(
        [
          makeTx({ type: 'DESPESA', description: 'PIX enviado 1' }),
          makeTx({ type: 'DESPESA', description: 'PIX enviado 2' }),
        ],
        [makeTx({ type: 'RECEITA', description: 'PIX recebido' })]
      )
    );
    expect(result.pairs).toHaveLength(1);
    // Desempate estavel: primeira DESPESA (indices menores) ganha
    expect(result.pairs[0].out).toEqual({ statement_index: 0, tx_index: 0 });
  });

  it('determinismo: mesma entrada produz sempre a mesma saida', () => {
    const statements = makeStatements(
      [
        makeTx({ type: 'DESPESA', description: 'PIX enviado A', amount: 100 }),
        makeTx({ type: 'DESPESA', description: 'PIX enviado B', amount: 200 }),
      ],
      [
        makeTx({ type: 'RECEITA', description: 'PIX recebido B', amount: 200 }),
        makeTx({ type: 'RECEITA', description: 'PIX recebido A', amount: 100 }),
      ]
    );
    const a = matchTransfers(statements);
    const b = matchTransfers(statements);
    expect(a).toEqual(b);
    expect(a.pairs).toHaveLength(2);
  });

  it('contraparte sem extrato no lote nunca forma par', () => {
    const result = matchTransfers([
      {
        account_id: NUBANK,
        transactions: [makeTx({ type: 'DESPESA', suggested_transfer_account_id: BRADESCO })],
      },
    ]);
    expect(result.pairs).toHaveLength(0);
  });

  describe('duplicatas intra-lote', () => {
    it('marca transacao repetida vinda de OUTRO extrato da mesma conta', () => {
      // Mesmo arquivo subido 2x: statements 0 e 1 da mesma conta com a mesma transacao
      const tx = makeTx({ type: 'DESPESA', line_kind: 'NORMAL', description: 'Compra mercado' });
      const result = matchTransfers([
        { account_id: NUBANK, transactions: [tx] },
        { account_id: NUBANK, transactions: [{ ...tx }] },
      ]);
      expect(result.intra_batch_duplicates).toEqual([{ statement_index: 1, tx_index: 0 }]);
    });

    it('NAO marca transacoes identicas dentro do MESMO extrato (compras reais repetidas)', () => {
      const tx = makeTx({ type: 'DESPESA', line_kind: 'NORMAL', description: 'Cafe' });
      const result = matchTransfers([
        { account_id: NUBANK, transactions: [tx, { ...tx }] },
      ]);
      expect(result.intra_batch_duplicates).toHaveLength(0);
    });

    it('NAO marca transacoes de contas diferentes como duplicata', () => {
      const result = matchTransfers(
        makeStatements(
          [makeTx({ type: 'DESPESA', line_kind: 'NORMAL' })],
          [makeTx({ type: 'DESPESA', line_kind: 'NORMAL' })]
        )
      );
      expect(result.intra_batch_duplicates).toHaveLength(0);
    });
  });
});
