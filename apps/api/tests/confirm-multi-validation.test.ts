import { describe, it, expect } from 'vitest';
import {
  validateConfirmMultiBody,
  type ConfirmMultiImportBody,
  type ConfirmMatchedTransfer,
  type ConfirmImportItem,
} from '../src/services/import-validation-service.js';

const NUBANK = 'acc-nubank';
const ITAU = 'acc-itau';
const OUTSIDER = 'acc-de-outro-usuario';

const USER_ACCOUNTS = new Set([NUBANK, ITAU]);

function makeItem(overrides: Partial<ConfirmImportItem> = {}): ConfirmImportItem {
  return {
    kind: 'NORMAL',
    category_id: 'cat-1',
    type: 'DESPESA',
    description: 'Compra mercado',
    amount: 100,
    due_date: '2026-07-10',
    ...overrides,
  };
}

function makeTransfer(overrides: Partial<ConfirmMatchedTransfer> = {}): ConfirmMatchedTransfer {
  return {
    source_account_id: NUBANK,
    destination_account_id: ITAU,
    category_id: 'cat-1',
    description: 'Transferencia Nubank -> Itau',
    amount: 500,
    transfer_date: '2026-07-10',
    ...overrides,
  };
}

function makeBody(overrides: Partial<ConfirmMultiImportBody> = {}): ConfirmMultiImportBody {
  return {
    groups: [{ account_id: NUBANK, items: [makeItem()] }],
    transfers: [],
    ...overrides,
  };
}

describe('validateConfirmMultiBody()', () => {
  it('aceita body valido com groups e transfers', () => {
    const body = makeBody({
      groups: [
        { account_id: NUBANK, items: [makeItem()] },
        { account_id: ITAU, items: [makeItem({ type: 'RECEITA', description: 'Salario' })] },
      ],
      transfers: [makeTransfer()],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toBeNull();
  });

  it('aceita lote so com transfers (sem items nos groups)', () => {
    const body = makeBody({ groups: [], transfers: [makeTransfer()] });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toBeNull();
  });

  it('rejeita body undefined ou sem groups/transfers', () => {
    expect(validateConfirmMultiBody(undefined, USER_ACCOUNTS)).toMatch(/obrigatorios/);
    expect(
      validateConfirmMultiBody({ groups: [] } as unknown as ConfirmMultiImportBody, USER_ACCOUNTS)
    ).toMatch(/obrigatorios/);
  });

  it('rejeita lote vazio (0 itens e 0 transfers)', () => {
    const body = makeBody({ groups: [{ account_id: NUBANK, items: [] }], transfers: [] });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/ao menos uma/);
  });

  it('rejeita mais de 500 itens no total', () => {
    const items = Array.from({ length: 400 }, () => makeItem());
    const transfers = Array.from({ length: 101 }, () => makeTransfer());
    const body = makeBody({ groups: [{ account_id: NUBANK, items }], transfers });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/500/);
  });

  it('rejeita conta de grupo que nao pertence ao usuario', () => {
    const body = makeBody({ groups: [{ account_id: OUTSIDER, items: [makeItem()] }] });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/nao pertence/);
  });

  it('rejeita conta repetida entre grupos', () => {
    const body = makeBody({
      groups: [
        { account_id: NUBANK, items: [makeItem()] },
        { account_id: NUBANK, items: [makeItem()] },
      ],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/repetida/);
  });

  it('rejeita item sem campos obrigatorios', () => {
    const body = makeBody({
      groups: [{ account_id: NUBANK, items: [makeItem({ category_id: '' })] }],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/obrigatorios/);
  });

  it('rejeita item com valor invalido', () => {
    const body = makeBody({
      groups: [{ account_id: NUBANK, items: [makeItem({ amount: -5 })] }],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/valor invalido/);
  });

  it('rejeita item com data invalida', () => {
    const body = makeBody({
      groups: [{ account_id: NUBANK, items: [makeItem({ due_date: '10/07/2026' })] }],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/data invalida/);
  });

  it('rejeita TRANSFERENCIA_INTERNA sem conta contraparte', () => {
    const body = makeBody({
      groups: [
        { account_id: NUBANK, items: [makeItem({ kind: 'TRANSFERENCIA_INTERNA' })] },
      ],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/contraparte/);
  });

  it('rejeita TRANSFERENCIA_INTERNA com contraparte igual a conta do grupo', () => {
    const body = makeBody({
      groups: [
        {
          account_id: NUBANK,
          items: [makeItem({ kind: 'TRANSFERENCIA_INTERNA', transfer_account_id: NUBANK })],
        },
      ],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/diferente/);
  });

  it('rejeita TRANSFERENCIA_INTERNA com contraparte de outro usuario', () => {
    const body = makeBody({
      groups: [
        {
          account_id: NUBANK,
          items: [makeItem({ kind: 'TRANSFERENCIA_INTERNA', transfer_account_id: OUTSIDER })],
        },
      ],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/nao pertence/);
  });

  it('rejeita transfer com origem igual ao destino', () => {
    const body = makeBody({
      groups: [],
      transfers: [makeTransfer({ destination_account_id: NUBANK })],
    });
    expect(validateConfirmMultiBody(body, USER_ACCOUNTS)).toMatch(/diferentes/);
  });

  it('rejeita transfer com conta de outro usuario', () => {
    const bodySource = makeBody({
      groups: [],
      transfers: [makeTransfer({ source_account_id: OUTSIDER })],
    });
    expect(validateConfirmMultiBody(bodySource, USER_ACCOUNTS)).toMatch(/origem nao pertence/);

    const bodyDest = makeBody({
      groups: [],
      transfers: [makeTransfer({ destination_account_id: OUTSIDER })],
    });
    expect(validateConfirmMultiBody(bodyDest, USER_ACCOUNTS)).toMatch(/destino nao pertence/);
  });

  it('rejeita transfer com valor ou data invalidos', () => {
    expect(
      validateConfirmMultiBody(
        makeBody({ groups: [], transfers: [makeTransfer({ amount: 0 })] }),
        USER_ACCOUNTS
      )
    ).toMatch(/obrigatorios|valor invalido/);
    expect(
      validateConfirmMultiBody(
        makeBody({ groups: [], transfers: [makeTransfer({ transfer_date: 'ontem' })] }),
        USER_ACCOUNTS
      )
    ).toMatch(/data invalida/);
  });
});
