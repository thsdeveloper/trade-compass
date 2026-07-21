import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { PickerModal, type PickerOption } from '@/components/organisms/PickerModal';
import { getBanks, getBenefitProviders, getPopularBanks } from '@/lib/finance-api';
import type { Bank, FinanceAccountType } from '@/types/finance';

/** A partir de quantos caracteres a busca vai ao servidor (nunca com termo vazio). */
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

interface BankPickerProps {
  /** Define a lista carregada: BENEFICIO usa as empresas de benefício. */
  accountType: FinanceAccountType;
  selected: Bank | null;
  onSelect: (bank: Bank) => void;
  /** Trigger customizado (ex.: chip); se ausente, o picker não renderiza nada. */
  renderTrigger: (args: { open: () => void; selected: Bank | null }) => ReactNode;
}

/**
 * Seletor do catálogo público de bancos (public.banks). O `id` da opção é o
 * UUID que vira `bank_id`; a logo é resolvida pelo NOME do banco — o UUID
 * nunca casa em `resolveBankKey`.
 */
export function BankPicker({
  accountType,
  selected,
  onSelect,
  renderTrigger,
}: BankPickerProps) {
  const isBenefit = accountType === 'BENEFICIO';

  const [isOpen, setIsOpen] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Termo que a lista atual em `banks` de fato representa. */
  const [appliedTerm, setAppliedTerm] = useState('');

  // Descarta respostas fora de ordem: só a última requisição pedida vale.
  const requestRef = useRef(0);

  const term = query.trim();
  // Empresas de benefício são poucas e vêm de um endpoint próprio: filtramos
  // localmente em vez de buscar no catálogo inteiro (as listas são disjuntas).
  const isServerSearch = !isBenefit && term.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!isOpen) return;

    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError(null);

    const run = async () => {
      try {
        const result = isServerSearch
          ? await getBanks(term)
          : isBenefit
            ? await getBenefitProviders()
            : await getPopularBanks();
        if (requestId !== requestRef.current) return;
        setBanks(result);
        setAppliedTerm(isServerSearch ? term : '');
      } catch (err) {
        if (requestId !== requestRef.current) return;
        setBanks([]);
        setError(err instanceof Error ? err.message : 'Erro ao carregar bancos');
      } finally {
        if (requestId === requestRef.current) setIsLoading(false);
      }
    };

    if (isServerSearch) {
      const timer = setTimeout(run, SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(timer);
    }
    run();
  }, [isOpen, isServerSearch, isBenefit, term]);

  const options = useMemo<PickerOption[]>(
    () =>
      banks.map((bank) => ({
        id: bank.id,
        label: bank.name,
        subtitle: bank.full_name ?? undefined,
        // String, nunca o UUID — é o que a lib de logos sabe resolver.
        bankKey: bank.name,
        // O catálogo local só conhece as marcas grandes: sem este fallback, os
        // demais bancos renderiam sem avatar e desalinhados na lista.
        iconName: 'building.columns.fill',
      })),
    [banks]
  );

  const handleSelect = (id: string) => {
    const bank = banks.find((b) => b.id === id);
    if (bank) onSelect(bank);
  };

  return (
    <>
      {renderTrigger({ open: () => setIsOpen(true), selected })}

      <PickerModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title={isBenefit ? 'Escolher empresa' : 'Escolher banco'}
        searchPlaceholder={isBenefit ? 'Buscar empresa...' : 'Buscar banco...'}
        options={options}
        selectedId={selected?.id ?? null}
        onSelect={handleSelect}
        onQueryChange={setQuery}
        // Enquanto a busca do servidor não chega (debounce + rede), a lista em
        // tela ainda é a anterior: filtramos localmente para ela não "resetar".
        filterLocally={!isServerSearch || appliedTerm !== term}
        isLoading={isLoading}
        emptyText={
          error ??
          (isBenefit ? 'Nenhuma empresa encontrada.' : 'Nenhum banco encontrado.')
        }
      />
    </>
  );
}
