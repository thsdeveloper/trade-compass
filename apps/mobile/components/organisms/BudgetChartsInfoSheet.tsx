import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type BudgetChartInfoKind = 'distribution' | 'comparison';

type BudgetChartsInfoSheetProps = {
  visible: boolean;
  kind: BudgetChartInfoKind;
  onClose: () => void;
};

type InfoItem = {
  marker: string;
  title: string;
  description: string;
  color: string;
  backgroundColor: string;
};

export function BudgetChartsInfoSheet({
  visible,
  kind,
  onClose,
}: BudgetChartsInfoSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isDistribution = kind === 'distribution';
  const title = isDistribution
    ? 'Como ler a distribuição'
    : 'Como comparar ideal e atual';
  const intro = isDistribution
    ? 'Veja quais categorias têm mais peso no total gasto durante o mês.'
    : 'Compare o valor recomendado pela regra 50-30-20 com o que foi gasto em cada categoria.';

  const items: InfoItem[] = isDistribution
    ? [
        {
          marker: '●',
          title: 'Categorias 50-30-20',
          description:
            'As fatias azul, verde e amarela representam as categorias do orçamento. Quanto maior a fatia, maior a participação nos gastos.',
          color: colors.primary,
          backgroundColor: colors.primaryLight,
        },
        {
          marker: '?',
          title: 'Fatia cinza',
          description:
            'Reúne despesas que ainda não foram associadas a uma categoria do orçamento 50-30-20.',
          color: colors.textSecondary,
          backgroundColor: colors.border,
        },
        {
          marker: 'R$',
          title: 'Valor no centro',
          description:
            'Mostra a soma de todos os gastos distribuídos entre as categorias no mês.',
          color: colors.success,
          backgroundColor: colors.successLight,
        },
        {
          marker: '%',
          title: 'Valores da legenda',
          description:
            'Ao lado de cada categoria aparecem o valor gasto e sua porcentagem no total.',
          color: colors.warning,
          backgroundColor: colors.warningLight,
        },
        {
          marker: '↗',
          title: 'Destaque uma categoria',
          description:
            'Toque em uma fatia para destacá-la e comparar seu tamanho com as demais.',
          color: colors.info,
          backgroundColor: colors.infoLight,
        },
      ]
    : [
        {
          marker: 'IDEAL',
          title: 'Barra cinza',
          description:
            'É o valor recomendado para a categoria: 50% para essenciais, 30% para estilo de vida e 20% para investimentos.',
          color: colors.textSecondary,
          backgroundColor: colors.border,
        },
        {
          marker: 'ATUAL',
          title: 'Barra colorida',
          description:
            'Mostra quanto foi registrado naquela categoria durante o mês selecionado.',
          color: colors.primary,
          backgroundColor: colors.primaryLight,
        },
        {
          marker: '%',
          title: 'Porcentagem no topo',
          description:
            'Indica quanto da sua renda-base já foi usado pela categoria.',
          color: colors.warning,
          backgroundColor: colors.warningLight,
        },
        {
          marker: '↑↓',
          title: 'Compare as alturas',
          description:
            'Se a barra colorida passar da cinza, a categoria ultrapassou a parcela recomendada.',
          color: colors.info,
          backgroundColor: colors.infoLight,
        },
      ];

  return (
    <BottomSheet visible={visible} title={title} onClose={onClose}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>{intro}</Text>

        {items.map((item) => (
          <View key={item.title} style={styles.row}>
            <View style={[styles.marker, { backgroundColor: item.backgroundColor }]}>
              <Text
                style={[styles.markerText, { color: item.color }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.marker}
              </Text>
            </View>
            <View style={styles.rowBody}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
            </View>
          </View>
        ))}

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
    width: 46,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
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
