import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import {
  OnboardingShell,
  Button,
} from '@/components/templates/OnboardingShell';
import { TextField } from '@/components/atoms/TextField';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { friendlyOtpError } from '@/lib/auth-errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login sem senha, no padrão do cadastro: email → código de 6 dígitos.
 * `shouldCreateUser: false` garante que email desconhecido não cria conta.
 */
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setPendingOnboarding } = useAuth();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isValid = EMAIL_REGEX.test(email.trim());

  const handleContinue = async () => {
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const normalized = email.trim().toLowerCase();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: false },
    });

    setIsSubmitting(false);

    if (otpError) {
      // shouldCreateUser: false responde com "signup desativado" para
      // emails sem conta — aqui isso significa "conta não encontrada".
      const noAccount =
        otpError.code === 'otp_disabled' ||
        otpError.message?.toLowerCase().includes('signups not allowed');
      setError(
        noAccount
          ? 'Não encontramos uma conta com este email. Confira o endereço ou crie uma conta.'
          : friendlyOtpError(otpError)
      );
      return;
    }

    setPendingOnboarding(false);
    router.push({
      pathname: '/auth/verify' as never,
      params: { email: normalized, mode: 'login' } as never,
    });
  };

  return (
    <OnboardingShell
      title="Que bom te ver de novo!"
      subtitle="Digite o email da sua conta. Vamos enviar um código de acesso para ele."
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
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError(null);
        }}
        error={!!error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        autoFocus
        editable={!isSubmitting}
        onSubmitEditing={handleContinue}
        returnKeyType="go"
      />

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <View style={styles.signupRow}>
        <Text style={styles.signupHint}>Não tem uma conta? </Text>
        <TouchableOpacity onPress={() => router.push('/auth/signup' as never)}>
          <Text style={styles.signupLink}>Criar conta</Text>
        </TouchableOpacity>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
  },
  signupRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
  signupHint: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.75)',
  },
  signupLink: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});
