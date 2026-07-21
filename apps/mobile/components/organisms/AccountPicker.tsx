import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { BankLogo } from '@/components/atoms/BankLogo';
import { PickerModal, type PickerOption } from '@/components/organisms/PickerModal';
import { resolveBankKey } from '@/lib/bancos-brasil';
import { getCategoryIcon } from '@/lib/category-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FinanceAccount } from '@/types/finance';
import { ACCOUNT_TYPE_LABELS, formatCurrency } from '@/types/finance';

interface AccountPickerProps {
  accounts: FinanceAccount[];
  selectedId: string | null;
  onSelect: (account: FinanceAccount) => void;
  placeholder?: string;
  /** Trigger customizado (ex.: chip); se ausente, usa a linha padrão */
  renderTrigger?: (args: {
    open: () => void;
    selected: FinanceAccount | undefined;
  }) => ReactNode;
}

export function AccountPicker({
  accounts,
  selectedId,
  onSelect,
  placeholder = 'Selecione uma conta',
  renderTrigger,
}: AccountPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const selectedAccount = accounts.find((a) => a.id === selectedId);

  const options = useMemo<PickerOption[]>(
    () =>
      accounts.map((account) => ({
        id: account.id,
        label: account.name,
        color: account.color,
        iconName: getCategoryIcon(account.icon),
        bankKey: resolveBankKey(account.bank?.name, account.name),
        subtitle: `${ACCOUNT_TYPE_LABELS[account.type]} • ${formatCurrency(account.current_balance)}`,
      })),
    [accounts]
  );

  const handleSelect = (id: string) => {
    const account = accounts.find((a) => a.id === id);
    if (account) onSelect(account);
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: () => setIsOpen(true), selected: selectedAccount })
      ) : (
        <TouchableOpacity
          style={[styles.trigger, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.7}
        >
          {selectedAccount ? (
            <View style={styles.selectedContainer}>
              <BankLogo
                bank={selectedAccount.bank?.name}
                name={selectedAccount.name}
                size={22}
                fallback={
                  <IconSymbol
                    name={getCategoryIcon(selectedAccount.icon)}
                    size={18}
                    color={selectedAccount.color}
                  />
                }
              />
              <Text style={[styles.selectedText, { color: colors.text }]}>
                {selectedAccount.name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.placeholder, { color: colors.icon }]}>
              {placeholder}
            </Text>
          )}
          <IconSymbol name="chevron.right" size={20} color={colors.icon} />
        </TouchableOpacity>
      )}

      <PickerModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title="Selecione uma conta"
        searchPlaceholder="Buscar conta..."
        options={options}
        selectedId={selectedId}
        onSelect={handleSelect}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedText: {
    fontSize: 16,
  },
  placeholder: {
    fontSize: 16,
  },
});
