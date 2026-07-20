import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  OnboardingShell,
  Button,
} from '@/components/templates/OnboardingShell';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/profile-api';

/** Formata centavos como BRL enquanto o usuário digita. */
function formatCents(cents: number): string {
  const reais = Math.floor(cents / 100);
  const decimals = String(cents % 100).padStart(2, '0');
  const thousands = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${thousands},${decimals}`;
}

/**
 * Passo 6: renda mensal — guardada no perfil (banco) e usada em seguida
 * para apresentar o orçamento 50/30/20 e, futuramente, outros recursos.
 */
export default function SalaryScreen() {
  const [cents, setCents] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const handleContinue = async () => {
    if (cents <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const income = cents / 100;
    const result = await updateProfile({ monthly_income: income });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    refreshProfile();
    router.push({
      pathname: '/onboarding/budget' as never,
      params: { cents: String(cents) } as never,
    });
  };

  return (
    <OnboardingShell
      title="Qual é a sua renda mensal?"
      subtitle="Vamos usá-la para montar seu orçamento ideal. Você pode ajustar esse valor depois, no perfil."
      headerRight={
        <TouchableOpacity
          onPress={() => router.push('/onboarding/done' as never)}
          hitSlop={12}
        >
          <Text style={styles.skip}>Agora não</Text>
        </TouchableOpacity>
      }
      footer={
        <Button
          label="Continuar"
          onPress={handleContinue}
          disabled={cents <= 0}
          loading={isSubmitting}
        />
      }
    >
      <TextInput
        style={[styles.input, { color: '#FFFFFF' }]}
        value={cents > 0 ? formatCents(cents) : ''}
        onChangeText={(text) => {
          const digits = text.replace(/\D/g, '').slice(0, 12);
          setCents(digits ? parseInt(digits, 10) : 0);
          setError(null);
        }}
        placeholder="R$ 0,00"
        placeholderTextColor={
          isDark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)'
        }
        keyboardType="number-pad"
        autoFocus
        editable={!isSubmitting}
        onSubmitEditing={handleContinue}
        returnKeyType="next"
        caretHidden
      />
      <Text style={styles.hint}>
        Considere salário líquido e outras rendas recorrentes.
      </Text>

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  skip: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  input: {
    fontSize: 40,
    fontWeight: FontWeight.bold,
    paddingVertical: Spacing.md,
  },
  hint: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing.sm,
  },
  error: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
  },
});
