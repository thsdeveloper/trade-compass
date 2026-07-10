import type { TransactionType } from '../domain/finance-types.js';

/**
 * Validacao pura do confirm de importacao multi-arquivo.
 * Sem dependencia de banco/rotas para ser testavel isoladamente —
 * a rota fornece o Set de contas do usuario.
 */

export interface ConfirmImportItem {
  kind: 'NORMAL' | 'TRANSFERENCIA_INTERNA';
  category_id: string;
  type: TransactionType;
  description: string;
  amount: number;
  due_date: string;
  notes?: string;
  /** Conta contraparte (obrigatoria quando kind = TRANSFERENCIA_INTERNA) */
  transfer_account_id?: string;
}

export interface ConfirmMultiGroup {
  account_id: string;
  items: ConfirmImportItem[];
}

export interface ConfirmMatchedTransfer {
  /** Conta da perna DESPESA (origem do dinheiro) */
  source_account_id: string;
  /** Conta da perna RECEITA (destino do dinheiro) */
  destination_account_id: string;
  category_id: string;
  description: string;
  amount: number;
  transfer_date: string;
  notes?: string;
}

export interface ConfirmMultiImportBody {
  groups: ConfirmMultiGroup[];
  transfers: ConfirmMatchedTransfer[];
}

export const MAX_BATCH_ITEMS = 500;

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/**
 * Valida o body do confirm-multi. Retorna a mensagem de erro ou null se valido.
 */
export function validateConfirmMultiBody(
  body: ConfirmMultiImportBody | undefined,
  userAccountIds: Set<string>
): string | null {
  const groups = Array.isArray(body?.groups) ? body.groups : null;
  const transfers = Array.isArray(body?.transfers) ? body.transfers : null;
  if (!groups || !transfers) {
    return 'Formato invalido: groups e transfers sao obrigatorios';
  }

  const totalItems =
    groups.reduce((sum, g) => sum + (Array.isArray(g.items) ? g.items.length : 0), 0) +
    transfers.length;
  if (totalItems === 0) {
    return 'Informe ao menos uma transacao';
  }
  if (totalItems > MAX_BATCH_ITEMS) {
    return `Maximo de ${MAX_BATCH_ITEMS} transacoes por lote`;
  }

  const seenAccounts = new Set<string>();
  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const groupLabel = `Grupo ${g + 1}`;

    if (!group.account_id || !userAccountIds.has(group.account_id)) {
      return `${groupLabel}: conta invalida ou nao pertence ao usuario`;
    }
    if (seenAccounts.has(group.account_id)) {
      return `${groupLabel}: conta repetida entre grupos — agrupe as transacoes da mesma conta`;
    }
    seenAccounts.add(group.account_id);

    if (!Array.isArray(group.items)) {
      return `${groupLabel}: items invalido`;
    }

    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      const label = `${groupLabel}, transacao ${i + 1}`;

      if (!item.category_id || !item.type || !item.description || !item.amount || !item.due_date) {
        return `${label}: categoria, tipo, descricao, valor e data sao obrigatorios`;
      }
      if (!Number.isFinite(item.amount) || item.amount <= 0) {
        return `${label}: valor invalido`;
      }
      if (!isValidDate(item.due_date)) {
        return `${label}: data invalida`;
      }
      if (item.kind === 'TRANSFERENCIA_INTERNA') {
        if (!item.transfer_account_id) {
          return `${label}: transferencia interna exige a conta contraparte`;
        }
        if (item.transfer_account_id === group.account_id) {
          return `${label}: conta contraparte deve ser diferente da conta do extrato`;
        }
        if (!userAccountIds.has(item.transfer_account_id)) {
          return `${label}: conta contraparte nao pertence ao usuario`;
        }
      }
    }
  }

  for (let t = 0; t < transfers.length; t++) {
    const transfer = transfers[t];
    const label = `Transferencia ${t + 1}`;

    if (
      !transfer.source_account_id ||
      !transfer.destination_account_id ||
      !transfer.category_id ||
      !transfer.description ||
      !transfer.amount ||
      !transfer.transfer_date
    ) {
      return `${label}: origem, destino, categoria, descricao, valor e data sao obrigatorios`;
    }
    if (transfer.source_account_id === transfer.destination_account_id) {
      return `${label}: conta de origem e destino devem ser diferentes`;
    }
    if (!userAccountIds.has(transfer.source_account_id)) {
      return `${label}: conta de origem nao pertence ao usuario`;
    }
    if (!userAccountIds.has(transfer.destination_account_id)) {
      return `${label}: conta de destino nao pertence ao usuario`;
    }
    if (!Number.isFinite(transfer.amount) || transfer.amount <= 0) {
      return `${label}: valor invalido`;
    }
    if (!isValidDate(transfer.transfer_date)) {
      return `${label}: data invalida`;
    }
  }

  return null;
}
