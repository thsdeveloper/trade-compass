import { useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  OnboardingShell,
  Button,
} from '@/components/templates/OnboardingShell';
import { SelectableChip } from '@/components/molecules/SelectableChip';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';
import { updateProfile } from '@/lib/profile-api';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

type GoalGroup = {
  title: string;
  goals: { id: string; label: string; icon: IoniconName }[];
};

const GOAL_GROUPS: GoalGroup[] = [
  {
    title: 'Dia a dia',
    goals: [
      { id: 'spending', label: 'Controle de gastos', icon: 'cash-outline' },
      { id: 'budget', label: 'Orçamento mensal', icon: 'pie-chart-outline' },
      { id: 'accounts', label: 'Contas em um só lugar', icon: 'wallet-outline' },
      { id: 'recurring', label: 'Pagamentos recorrentes', icon: 'calendar-outline' },
    ],
  },
  {
    title: 'Investimentos',
    goals: [
      { id: 'stocks', label: 'Ações e ETFs', icon: 'trending-up-outline' },
      { id: 'fixed-income', label: 'Renda fixa', icon: 'shield-checkmark-outline' },
      { id: 'crypto', label: 'Cripto', icon: 'logo-bitcoin' },
      { id: 'reits', label: 'Fundos imobiliários', icon: 'business-outline' },
    ],
  },
  {
    title: 'Planejamento',
    goals: [
      { id: 'savings-goals', label: 'Metas de economia', icon: 'flag-outline' },
      { id: 'reports', label: 'Relatórios inteligentes', icon: 'document-text-outline' },
      { id: 'mortgage', label: 'Financiamento imobiliário', icon: 'home-outline' },
      { id: 'assistant', label: 'Assistente Norte', icon: 'sparkles-outline' },
    ],
  },
];

/**
 * Passo 5: personalização — o que o usuário quer fazer no app.
 * As escolhas são salvas no perfil (banco) para adaptar a experiência.
 */
export default function GoalsScreen() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const finish = async (goals: string[]) => {
    setIsSubmitting(true);
    // Melhor esforço: falha aqui não deve travar a entrada no app.
    await updateProfile({ onboarding_goals: goals }).catch(() => undefined);
    setIsSubmitting(false);
    router.push('/onboarding/salary' as never);
  };

  return (
    <OnboardingShell
      title="O que você quer fazer por aqui?"
      subtitle="Escolha quantos quiser. Vamos adaptar o app para o que importa para você."
      headerRight={
        <TouchableOpacity onPress={() => finish([])} hitSlop={12}>
          <Text style={styles.skip}>Agora não</Text>
        </TouchableOpacity>
      }
      footer={
        <Button
          label="Continuar"
          onPress={() => finish(Array.from(selected))}
          disabled={selected.size === 0}
          loading={isSubmitting}
        />
      }
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {GOAL_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <View style={styles.chips}>
              {group.goals.map((goal) => (
                <SelectableChip
                  key={goal.id}
                  label={goal.label}
                  icon={goal.icon}
                  selected={selected.has(goal.id)}
                  onToggle={() => toggle(goal.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  skip: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  scrollContent: {
    paddingBottom: Spacing['2xl'],
  },
  group: {
    marginBottom: Spacing['2xl'],
  },
  groupTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
