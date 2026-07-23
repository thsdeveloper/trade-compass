import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { IconSymbol, type IconSymbolName } from '@/components/atoms/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { TransactionType } from '@/types/finance';

/**
 * Modo da tela de nova transação: os tipos do backend mais o modo Cartão,
 * que vira uma DESPESA com credit_card_id na hora de salvar.
 */
export type TransactionMode = TransactionType | 'CARTAO';

interface TransactionTypeToggleProps {
  value: TransactionMode;
  onChange: (type: TransactionMode) => void;
  /** Exibe o 3º modo Transferência (tela de nova transação). */
  includeTransfer?: boolean;
  /** Exibe o modo Cartão de crédito (compra que vai para a fatura). */
  includeCard?: boolean;
}

/**
 * Seletor Despesa/Receita (e opcionalmente Transferência e Cartão) em pill
 * segmentado: o segmento ativo é preenchido com a cor semântica
 * (vermelho/verde/azul/laranja) e ganha ícone, coerente com o dark da tela
 * de nova transação.
 */
export function TransactionTypeToggle({
  value,
  onChange,
  includeTransfer = false,
  includeCard = false,
}: TransactionTypeToggleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const segments: {
    key: TransactionMode;
    label: string;
    icon: IconSymbolName;
    color: string;
  }[] = [
    { key: 'DESPESA', label: 'Despesa', icon: 'arrow.down', color: colors.danger },
    { key: 'RECEITA', label: 'Receita', icon: 'arrow.up', color: colors.success },
    ...(includeTransfer
      ? [
          {
            key: 'TRANSFERENCIA' as const,
            label: 'Transferir',
            icon: 'arrow.triangle.swap' as IconSymbolName,
            color: colors.primary,
          },
        ]
      : []),
    ...(includeCard
      ? [
          {
            key: 'CARTAO' as const,
            label: 'Cartão',
            icon: 'creditcard' as IconSymbolName,
            color: colors.warning,
          },
        ]
      : []),
  ];

  // Com 4 modos o pill fica apertado: o ícone só aparece no segmento ativo
  const compact = segments.length >= 4;

  const select = (next: TransactionMode) => {
    if (next === value) return;
    Haptics.selectionAsync();
    onChange(next);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(118,118,128,0.12)' },
      ]}
    >
      {segments.map((seg) => {
        const active = value === seg.key;
        return (
          <TouchableOpacity
            key={seg.key}
            style={[styles.segment, active && { backgroundColor: seg.color }]}
            onPress={() => select(seg.key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {!compact || active ? (
              <IconSymbol
                name={seg.icon}
                size={16}
                color={active ? '#FFFFFF' : colors.textSecondary}
              />
            ) : null}
            <Text
              style={[
                styles.label,
                compact && styles.labelCompact,
                { color: active ? '#FFFFFF' : colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {seg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: BorderRadius.full,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  label: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  labelCompact: {
    fontSize: FontSize.sm,
  },
});
