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
 * Passo 1 do cadastro: coleta o email e dispara o código de verificação
 * (OTP por email via Supabase — equivalente ao SMS de apps bancários).
 */
export default function SignupScreen() {
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
      options: { shouldCreateUser: true },
    });

    setIsSubmitting(false);

    if (otpError) {
      setError(friendlyOtpError(otpError));
      return;
    }

    setPendingOnboarding(true);
    router.push({
      pathname: '/auth/verify' as never,
      params: { email: normalized } as never,
    });
  };

  return (
    <OnboardingShell
      title="Vamos começar!"
      subtitle="Digite seu email. Vamos enviar um código de confirmação para ele."
      footer={
        <Button
          label="Criar conta"
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

      <View style={styles.loginRow}>
        <Text style={styles.loginHint}>Já tem uma conta? </Text>
        <TouchableOpacity onPress={() => router.push('/auth/login' as never)}>
          <Text style={[styles.loginLink, { color: '#FFFFFF' }]}>Entrar</Text>
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
  loginRow: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
  loginHint: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.75)',
  },
  loginLink: {
    fontSize: FontSize.md,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
