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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Trade Compass</Text>
          <Text style={styles.subtitle}>
            {mode === 'password'
              ? 'Entre com seu email e senha'
              : 'Entre com seu email para receber um link de acesso'}
          </Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'password' && styles.tabActive]}
            onPress={() => {
              setMode('password');
              setMessage(null);
            }}
          >
            <Text
              style={[
                styles.tabText,
                mode === 'password' && styles.tabTextActive,
              ]}
            >
              Senha
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'magic-link' && styles.tabActive]}
            onPress={() => {
              setMode('magic-link');
              setMessage(null);
            }}
          >
            <Text
              style={[
                styles.tabText,
                mode === 'magic-link' && styles.tabTextActive,
              ]}
            >
              Magic Link
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isSubmitting}
          />

          {mode === 'password' && (
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isSubmitting}
            />
          )}

          <TouchableOpacity
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
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
                message.type === 'success'
                  ? styles.successMessage
                  : styles.errorMessage,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  message.type === 'success'
                    ? styles.successText
                    : styles.errorText,
                ]}
              >
                {message.text}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
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
    backgroundColor: '#fff',
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
  },
  form: {
    gap: 16,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    color: '#1a1a1a',
  },
  button: {
    height: 56,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#99c9ff',
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
  successMessage: {
    backgroundColor: '#d4edda',
  },
  errorMessage: {
    backgroundColor: '#f8d7da',
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
  },
  successText: {
    color: '#155724',
  },
  errorText: {
    color: '#721c24',
  },
  footer: {
    marginTop: 40,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
