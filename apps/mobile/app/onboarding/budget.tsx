import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  OnboardingShell,
  Button,
} from '@/components/templates/OnboardingShell';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { formatCurrency } from '@/types/finance';

const SPLIT = [
  {
    key: 'needs',
    percent: 50,
    label: 'Necessidades',
    description: 'Moradia, mercado, contas e transporte',
    icon: 'home' as const,
    color: '#60A5FA',
  },
  {
    key: 'wants',
    percent: 30,
    label: 'Estilo de vida',
    description: 'Lazer, restaurantes e assinaturas',
    icon: 'cafe' as const,
    color: '#FBBF24',
  },
  {
    key: 'savings',
    percent: 20,
    label: 'Futuro',
    description: 'Poupança, investimentos e metas',
    icon: 'trending-up' as const,
    color: '#34D399',
  },
];

/**
 * Passo 7: mostra a renda informada distribuída na regra 50/30/20,
 * dando ao usuário uma visão imediata do próprio orçamento.
 */
export default function BudgetScreen() {
  const { cents } = useLocalSearchParams<{ cents: string }>();
  const router = useRouter();

  const income = (parseInt(cents ?? '0', 10) || 0) / 100;

  return (
    <OnboardingShell
      title="Seu orçamento 50/30/20"
      subtitle={`Com uma renda de ${formatCurrency(income)}, a regra 50/30/20 sugere esta divisão para o seu mês:`}
      footer={
        <Button
          label="Continuar"
          onPress={() => router.push('/onboarding/done' as never)}
        />
      }
    >
      {/* Barra empilhada com as três fatias */}
      <View style={styles.bar}>
        {SPLIT.map((slice) => (
          <View
            key={slice.key}
            style={[
              styles.barSegment,
              { flex: slice.percent, backgroundColor: slice.color },
            ]}
          />
        ))}
      </View>

      <View style={styles.cards}>
        {SPLIT.map((slice) => (
          <GlassSurface key={slice.key} variant="material" style={styles.card}>
            <View style={[styles.iconBadge, { backgroundColor: slice.color }]}>
              <Ionicons name={slice.icon} size={18} color="#1A1A1A" />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardLabel}>
                {slice.label}{' '}
                <Text style={styles.cardPercent}>{slice.percent}%</Text>
              </Text>
              <Text style={styles.cardDescription}>{slice.description}</Text>
            </View>
            <Text style={styles.cardValue}>
              {formatCurrency(income * (slice.percent / 100))}
            </Text>
          </GlassSurface>
        ))}
      </View>

      <Text style={styles.note}>
        É um ponto de partida, não uma regra rígida — você poderá ajustar cada
        fatia na aba de orçamento.
      </Text>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    gap: 2,
    marginBottom: Spacing['2xl'],
  },
  barSegment: {
    height: '100%',
  },
  cards: {
    gap: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: 16,
    padding: Spacing.lg,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
  },
  cardLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
  },
  cardPercent: {
    fontWeight: FontWeight.normal,
    color: 'rgba(255,255,255,0.65)',
  },
  cardDescription: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  cardValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  note: {
    fontSize: FontSize.xs,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.65)',
    marginTop: Spacing.xl,
  },
});
