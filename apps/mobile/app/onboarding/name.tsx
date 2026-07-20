import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';

import {
  OnboardingShell,
  Button,
} from '@/components/templates/OnboardingShell';
import { TextField } from '@/components/atoms/TextField';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/profile-api';

/** Passo 3: nome do usuário, salvo no perfil. */
export default function NameScreen() {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isValid = name.trim().length >= 2;

  const handleContinue = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const result = await updateProfile({ full_name: name.trim() });
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    refreshProfile();
    router.push('/onboarding/password' as never);
  };

  return (
    <OnboardingShell
      title="Como podemos te chamar?"
      subtitle="Seu nome aparece no app e nos relatórios que preparamos para você."
      showBack={false}
      footer={
        <Button
          label="Continuar"
          onPress={handleContinue}
          disabled={!isValid}
          loading={isSubmitting}
        />
      }
    >
      <TextField
        label="Nome completo"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError(null);
        }}
        error={!!error}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        autoFocus
        editable={!isSubmitting}
        onSubmitEditing={handleContinue}
        returnKeyType="next"
      />

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
  },
});
