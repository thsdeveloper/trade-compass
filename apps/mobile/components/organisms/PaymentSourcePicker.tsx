import { useMemo, useState, type ReactNode } from 'react';

import { PickerModal, type PickerOption } from '@/components/organisms/PickerModal';
import { resolveBankKey } from '@/lib/bancos-brasil';
import { getCategoryIcon } from '@/lib/category-icons';
import type { FinanceAccount, FinanceCreditCard } from '@/types/finance';
import {
  ACCOUNT_TYPE_LABELS,
  CREDIT_CARD_BRAND_LABELS,
  formatCurrency,
} from '@/types/finance';

export type PaymentSource =
  | { kind: 'account'; account: FinanceAccount }
  | { kind: 'card'; card: FinanceCreditCard };

export interface PaymentSourceRef {
  kind: 'account' | 'card';
  id: string;
}

interface PaymentSourcePickerProps {
  accounts: FinanceAccount[];
  creditCards: FinanceCreditCard[];
  selected: PaymentSourceRef | null;
  onSelect: (source: PaymentSource) => void;
  /** Título do modal (padrão "Pagar com" — modo Cartão usa "Cartão de crédito"). */
  title?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  renderTrigger: (args: {
    open: () => void;
    selected: PaymentSource | undefined;
  }) => ReactNode;
}

/**
 * Seletor unificado de origem do pagamento de uma despesa: seções "Contas"
 * (com saldo) e "Cartões de crédito" (com limite disponível) no mesmo
 * PickerModal. Selecionar um lado limpa o outro — transação tem conta OU
 * cartão, nunca ambos.
 */
export function PaymentSourcePicker({
  accounts,
  creditCards,
  selected,
  onSelect,
  title = 'Pagar com',
  searchPlaceholder = 'Buscar conta ou cartão...',
  emptyText = 'Nenhuma conta ou cartão cadastrado',
  renderTrigger,
}: PaymentSourcePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedSource = useMemo<PaymentSource | undefined>(() => {
    if (!selected) return undefined;
    if (selected.kind === 'account') {
      const account = accounts.find((a) => a.id === selected.id);
      return account ? { kind: 'account', account } : undefined;
    }
    const card = creditCards.find((c) => c.id === selected.id);
    return card ? { kind: 'card', card } : undefined;
  }, [selected, accounts, creditCards]);

  const options = useMemo<PickerOption[]>(() => {
    const accountOptions: PickerOption[] = accounts.map((account) => ({
      id: account.id,
      label: account.name,
      color: account.color,
      iconName: getCategoryIcon(account.icon),
      bankKey: resolveBankKey(account.bank?.name, account.name),
      subtitle: `${ACCOUNT_TYPE_LABELS[account.type]} • ${formatCurrency(account.current_balance)}`,
    }));

    const cardOptions: PickerOption[] = creditCards.map((card) => ({
      id: card.id,
      label: card.name,
      color: card.color,
      iconName: 'creditcard' as const,
      subtitle: `${CREDIT_CARD_BRAND_LABELS[card.brand]} • Disponível ${formatCurrency(card.available_limit)}`,
    }));

    // Com um único tipo de origem o cabeçalho de seção vira ruído — lista direto
    if (accountOptions.length === 0) return cardOptions;
    if (cardOptions.length === 0) return accountOptions;

    const sections: PickerOption[] = [];
    if (accountOptions.length > 0) {
      sections.push({
        id: '__accounts',
        label: 'Contas',
        disabled: true,
        children: accountOptions,
      });
    }
    if (cardOptions.length > 0) {
      sections.push({
        id: '__cards',
        label: 'Cartões de crédito',
        disabled: true,
        children: cardOptions,
      });
    }
    return sections;
  }, [accounts, creditCards]);

  const handleSelect = (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (account) {
      onSelect({ kind: 'account', account });
      return;
    }
    const card = creditCards.find((c) => c.id === id);
    if (card) onSelect({ kind: 'card', card });
  };

  return (
    <>
      {renderTrigger({ open: () => setIsOpen(true), selected: selectedSource })}

      <PickerModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        searchPlaceholder={searchPlaceholder}
        options={options}
        selectedId={selected?.id ?? null}
        onSelect={handleSelect}
        emptyText={emptyText}
      />
    </>
  );
}
