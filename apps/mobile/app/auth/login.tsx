import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassSurface } from '@/components/ui/GlassSurface';
import { Colors, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';

type LoginMode = 'password' | 'magic-link';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<LoginMode>('password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const { signIn, signInWithMagicLink } = useAuth();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const { height } = useWindowDimensions();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setMessage({ text: 'Por favor, insira seu email', type: 'error' });
      return;
    }

    if (!validateEmail(email)) {
      setMessage({ text: 'Por favor, insira um email válido', type: 'error' });
      return;
    }

    if (mode === 'password' && !password) {
      setMessage({ text: 'Por favor, insira sua senha', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    if (mode === 'password') {
      const result = await signIn(email.trim().toLowerCase(), password);
      setIsSubmitting(false);

      if (result.error) {
        setMessage({ text: result.error, type: 'error' });
      }
    } else {
      const result = await signInWithMagicLink(email.trim().toLowerCase());
      setIsSubmitting(false);

      if (result.error) {
        setMessage({ text: result.error, type: 'error' });
      } else {
        setMessage({
          text: 'Link de acesso enviado! Verifique seu email.',
          type: 'success',
        });
      }
    }
  };

  const screenBg = isDark ? colors.background : '#F6F7F9';
  const hairlineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: screenBg }]}
    >
      <StatusBar style="light" />

      {/* Gradiente ambiente hero, edge-to-edge (camada de conteudo) */}
      <LinearGradient
        colors={
          isDark
            ? ['#1D4ED8', '#16233F', colors.background]
            : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.55, 1]}
        style={[styles.ambientBackground, { height: height * 0.6 }]}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Trade Compass</Text>
          <Text style={styles.subtitle}>
            {mode === 'password'
              ? 'Entre com seu email e senha'
              : 'Entre com seu email para receber um link de acesso'}
          </Text>
        </View>

        {/* Cartao do formulario: material frosted (camada de conteudo) */}
        <GlassSurface
          variant="material"
          style={[styles.formCard, { borderColor: hairlineColor }]}
        >
          <View
            style={[
              styles.tabs,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(118,118,128,0.12)',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                mode === 'password' && [
                  styles.tabActive,
                  { backgroundColor: isDark ? colors.card : '#FFFFFF' },
                ],
              ]}
              onPress={() => {
                setMode('password');
                setMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: mode === 'password' ? colors.primary : colors.textSecondary },
                ]}
              >
                Senha
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                mode === 'magic-link' && [
                  styles.tabActive,
                  { backgroundColor: isDark ? colors.card : '#FFFFFF' },
                ],
              ]}
              onPress={() => {
                setMode('magic-link');
                setMessage(null);
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: mode === 'magic-link' ? colors.primary : colors.textSecondary },
                ]}
              >
                Magic Link
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: isDark ? colors.surface : '#FFFFFF',
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              placeholder="seu@email.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting}
            />

            {mode === 'password' && (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? colors.surface : '#FFFFFF',
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Senha"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isSubmitting}
              />
            )}

            {/* Botao primario: conteudo solido, nunca vidro */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                isSubmitting && styles.buttonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === 'password' ? 'Entrar' : 'Enviar link de acesso'}
                </Text>
              )}
            </TouchableOpacity>

            {message && (
              <View
                style={[
                  styles.messageContainer,
                  {
                    backgroundColor:
                      message.type === 'success'
                        ? colors.successLight
                        : colors.dangerLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    {
                      color:
                        message.type === 'success' ? colors.success : colors.danger,
                    },
                  ]}
                >
                  {message.text}
                </Text>
              </View>
            )}
          </View>
        </GlassSurface>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Ao continuar, você concorda com nossos Termos de Serviço e Política
            de Privacidade.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  formCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 24,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    padding: 16,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
