import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/atoms/Skeleton';
import { Spacing, BorderRadius } from '@/constants/theme';

/** Herói do saldo (centralizado sobre o gradiente). */
export function BalanceSkeleton() {
  return (
    <View style={styles.hero}>
      <Skeleton width={96} height={12} radius={6} />
      <Skeleton width={190} height={40} radius={10} />
      <Skeleton width={112} height={36} radius={18} />
    </View>
  );
}

/** Linhas de transação: avatar + duas linhas de texto + valor à direita. */
export function TransactionRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <View
          key={index}
          style={[styles.row, index < rows - 1 && styles.rowDivider]}
        >
          <Skeleton width={40} height={40} radius={20} />
          <View style={styles.rowText}>
            <Skeleton width="60%" height={13} />
            <Skeleton width="35%" height={11} />
          </View>
          <Skeleton width={64} height={14} />
        </View>
      ))}
    </View>
  );
}

/** Linhas com ícone quadrado + rótulo + valor (categorias, vencimentos, contas). */
export function IconRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <View>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={styles.row}>
          <Skeleton width={36} height={36} radius={BorderRadius.sm} />
          <View style={styles.rowText}>
            <Skeleton width="55%" height={13} />
          </View>
          <Skeleton width={72} height={13} />
        </View>
      ))}
    </View>
  );
}

/** Resumo do mês: três colunas (rótulo + valor). */
export function SummarySkeleton() {
  return (
    <View style={styles.summaryRow}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.summaryColumn}>
          <Skeleton width={54} height={11} />
          <Skeleton width={72} height={16} />
        </View>
      ))}
    </View>
  );
}

/** Card do orçamento: cabeçalho + área de gráfico. */
export function BudgetSkeleton() {
  return (
    <View style={styles.budgetCard}>
      <Skeleton width={80} height={12} />
      <Skeleton width={140} height={22} radius={6} />
      <Skeleton width={170} height={11} />
      <Skeleton width="100%" height={88} radius={BorderRadius.md} style={styles.budgetChart} />
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    paddingTop: Spacing['2xl'],
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowText: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  summaryColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  budgetCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  budgetChart: {
    marginTop: Spacing.sm,
  },
});
