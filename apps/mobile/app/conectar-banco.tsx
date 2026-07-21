import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PluggyConnect } from 'react-native-pluggy-connect';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useFinance } from '@/contexts/FinanceContext';
import {
  createPluggyConnectToken,
  registerPluggyItem,
} from '@/lib/pluggy-api';

type Phase = 'loading' | 'ready' | 'importing' | 'error';

// Tela do widget Pluggy Connect (Open Finance). Busca um connectToken curto na
// API, abre o widget e, no onSuccess, dispara o backfill sincrono para os dados
// caírem no domínio financeiro existente. App é dark-only (Liquid Glass).
export default function ConectarBancoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ itemId?: string }>();
  const itemId = typeof params.itemId === 'string' ? params.itemId : undefined;
  const { loadAccounts } = useFinance();

  const colors = Colors.dark;
  const [phase, setPhase] = useState<Phase>('loading');
  const [connectToken, setConnectToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const token = await createPluggyConnectToken(itemId);
        if (!active) return;
        setConnectToken(token);
        setPhase('ready');
      } catch (err) {
        if (!active) return;
        setErrorMessage(
          err instanceof Error ? err.message : 'Falha ao iniciar a conexao'
        );
        setPhase('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [itemId]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  // onSuccess é um acelerador de UX; a fonte da verdade real são os webhooks
  // (Fase 1). Aqui só disparamos o backfill e voltamos para as contas.
  const handleSuccess = useCallback(
    async (data: { item: { id: string } }) => {
      setPhase('importing');
      try {
        await registerPluggyItem(data.item.id);
        await loadAccounts();
        router.back();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Falha ao importar os dados';
        Alert.alert('Importacao', message, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    },
    [loadAccounts, router]
  );

  const handleError = useCallback(
    (error: { message: string }) => {
      Alert.alert(
        'Conexao',
        error?.message || 'Nao foi possivel conectar ao banco.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    },
    [router]
  );

  if (phase === 'ready' && connectToken) {
    return (
      <PluggyConnect
        connectToken={connectToken}
        includeSandbox={__DEV__}
        theme="dark"
        language="pt"
        updateItem={itemId}
        onSuccess={handleSuccess}
        onError={handleError}
        onClose={handleClose}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {phase === 'error' ? (
        <>
          <Text style={[styles.title, { color: colors.text }]}>
            Nao foi possivel abrir a conexao
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {errorMessage}
          </Text>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {phase === 'importing'
              ? 'Importando seus dados bancarios...'
              : 'Preparando a conexao segura...'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
    ...(Platform.OS === 'web' ? { minHeight: 400 } : null),
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
});
