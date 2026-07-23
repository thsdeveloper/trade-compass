import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SpendingChartInfoSheetProps = {
  visible: boolean;
  onClose: () => void;
  spendingColor: string;
  limitColor: string;
};

export function SpendingChartInfoSheet({
  visible,
  onClose,
  spendingColor,
  limitColor,
}: SpendingChartInfoSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <BottomSheet visible={visible} title="Como ler o gráfico" onClose={onClose}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Acompanhe como seus gastos evoluem durante o mês e compare o total
          acumulado com o seu limite.
        </Text>

        <View style={styles.row}>
          <View style={[styles.marker, { backgroundColor: spendingColor + '1F' }]}>
            <View style={[styles.solidLine, { backgroundColor: spendingColor }]} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Gastos acumulados
            </Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              A linha contínua sobe conforme novas despesas são registradas no mês.
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.marker, { backgroundColor: limitColor + '1F' }]}>
            <View style={[styles.dashedLine, { borderColor: limitColor }]} />
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Limite do mês
            </Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              A linha tracejada representa sua renda-base. Se os gastos passarem
              dela, o limite foi ultrapassado.
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.marker, { backgroundColor: colors.infoLight }]}>
            <Text style={[styles.markerText, { color: colors.info }]}>1–31</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>Dias do mês</Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              Os números abaixo do gráfico indicam quando cada gasto entrou no
              total acumulado.
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.marker, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.markerText, { color: colors.success }]}>R$</Text>
          </View>
          <View style={styles.rowBody}>
            <Text style={[styles.rowTitle, { color: colors.text }]}>
              Consulte um dia
            </Text>
            <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
              Toque ou deslize sobre a linha para ver o valor acumulado até aquele
              dia.
            </Text>
          </View>
        </View>

        <Button label="Entendi" onPress={onClose} style={styles.cta} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingTop: Spacing.xs,
    gap: Spacing.lg,
  },
  intro: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  marker: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidLine: {
    width: 22,
    height: 3,
    borderRadius: 2,
  },
  dashedLine: {
    width: 22,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  markerText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  rowDescription: {
    fontSize: FontSize.sm,
    lineHeight: 19,
  },
  cta: {
    marginTop: Spacing.sm,
  },
});
