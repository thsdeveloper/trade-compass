import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { OnboardingShell } from '@/components/templates/OnboardingShell';
import { Button } from '@/components/atoms/Button';
import { CodeInput } from '@/components/molecules/CodeInput';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { friendlyOtpError } from '@/lib/auth-errors';

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}•••@${domain}`;
}

/**
 * Código de 6 dígitos enviado por email — usado por cadastro e login.
 * Ao validar, o AuthContext detecta a sessão e roteia: onboarding para
 * cadastro recém-criado, tabs para login (`mode: 'login'`).
 */
export default function VerifyScreen() {
  const { email, mode } = useLocalSearchParams<{
    email: string;
    mode?: string;
  }>();
  const isLogin = mode === 'login';
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (code.length !== CODE_LENGTH || isVerifying || !email) return;

    const verify = async () => {
      setIsVerifying(true);
      setError(null);

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email',
      });

      if (verifyError) {
        setError('Código incorreto. Confira o código e tente de novo.');
        setCode('');
        setIsVerifying(false);
      }
      // Sucesso: a sessão dispara o redirect do AuthContext para o onboarding.
    };

    verify();
  }, [code, email, isVerifying]);

  const handleResend = async () => {
    if (secondsLeft > 0 || !email) return;
    setError(null);
    setCode('');
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: !isLogin },
    });
    if (otpError) {
      setError(friendlyOtpError(otpError));
      return;
    }
    setSecondsLeft(RESEND_SECONDS);
  };

  const resendLabel =
    secondsLeft > 0
      ? `Reenviar código em 00:${String(secondsLeft).padStart(2, '0')}`
      : 'Reenviar código';

  return (
    <OnboardingShell
      title="Código de 6 dígitos"
      subtitle={`Enviamos um código para ${email ? maskEmail(email) : 'seu email'}.`}
    >
      <CodeInput
        value={code}
        onChange={(next) => {
          setCode(next);
          setError(null);
        }}
        length={CODE_LENGTH}
        error={!!error}
        disabled={isVerifying}
      />

      {error ? (
        <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
      ) : null}

      <Button
        label={resendLabel}
        onPress={handleResend}
        disabled={secondsLeft > 0}
        variant="tertiary"
        size="md"
        fullWidth={false}
        style={styles.resend}
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: Spacing.lg,
    fontSize: FontSize.sm,
  },
  resend: {
    marginTop: Spacing.xl,
  },
});
