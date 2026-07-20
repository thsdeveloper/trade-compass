import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  OnboardingShell,
  Button,
} from '@/components/templates/OnboardingShell';
import { TextField } from '@/components/atoms/TextField';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const MIN_LENGTH = 8;

/** Passo 4: define a senha da conta (a sessão já existe via OTP). */
export default function PasswordScreen() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isValid = password.length >= MIN_LENGTH;

  const handleContinue = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setIsSubmitting(false);

    if (updateError) {
      setError('Não foi possível salvar a senha. Tente novamente.');
      return;
    }

    router.push('/onboarding/goals' as never);
  };

  return (
    <OnboardingShell
      title="Crie sua senha"
      subtitle={`Você vai usá-la para entrar na sua conta. Mínimo de ${MIN_LENGTH} caracteres.`}
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
        label="Senha"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(null);
        }}
        error={!!error}
        secureTextEntry={!showPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        autoFocus
        editable={!isSubmitting}
        onSubmitEditing={handleContinue}
        returnKeyType="next"
        rightElement={
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={12}
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color="rgba(255,255,255,0.55)"
            />
          </TouchableOpacity>
        }
      />

      <Text
        style={[
          styles.hint,
          {
            color: isValid ? colors.success : 'rgba(255,255,255,0.75)',
          },
        ]}
      >
        {isValid ? '✓ Senha válida' : `Pelo menos ${MIN_LENGTH} caracteres`}
      </Text>

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  hint: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
  },
  error: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
  },
});
