import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { useFinance } from '@/contexts/FinanceContext';
import {
  disconnectPluggyItem,
  listPluggyConnections,
  type PluggyConnection,
} from '@/lib/pluggy-api';

const colors = Colors.dark;

// Status da conexão -> rótulo PT + cor + se precisa reconectar.
function statusInfo(status: string | null): {
  label: string;
  color: string;
  needsReconnect: boolean;
} {
  switch (status) {
    case 'UPDATED':
      return { label: 'Atualizado', color: '#22C55E', needsReconnect: false };
    case 'UPDATING':
    case 'MERGING':
      return { label: 'Sincronizando', color: '#3B82F6', needsReconnect: false };
    case 'WAITING_USER_INPUT':
    case 'WAITING_USER_ACTION':
      return { label: 'Ação necessária', color: '#F59E0B', needsReconnect: true };
    case 'LOGIN_ERROR':
    case 'OUTDATED':
      return { label: 'Reconexão necessária', color: '#EF4444', needsReconnect: true };
    default:
      return { label: status ?? '—', color: colors.textSecondary, needsReconnect: false };
  }
}

export default function BancosConectadosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { loadAccounts } = useFinance();

  const [connections, setConnections] = useState<PluggyConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await listPluggyConnections();
      setConnections(list);
    } catch {
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Recarrega ao focar (ex: voltando do widget após conectar/reconectar).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleConnectNew = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/conectar-banco');
  }, [router]);

  const handleReconnect = useCallback(
    (conn: PluggyConnection) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/conectar-banco',
        params: { itemId: conn.pluggy_item_id },
      });
    },
    [router]
  );

  const handleDisconnect = useCallback(
    (conn: PluggyConnection) => {
      Alert.alert(
        'Desconectar banco',
        `Desconectar ${conn.connector_name ?? 'este banco'}? O consentimento é revogado na instituição, mas as transações já importadas continuam no app.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desconectar',
            style: 'destructive',
            onPress: async () => {
              setBusyId(conn.id);
              try {
                await disconnectPluggyItem(conn.id);
                await Promise.all([load(), loadAccounts()]);
              } catch (err) {
                Alert.alert(
                  'Erro',
                  err instanceof Error ? err.message : 'Falha ao desconectar'
                );
              } finally {
                setBusyId(null);
              }
            },
          },
        ]
      );
    },
    [load, loadAccounts]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          style={styles.backButton}
        >
          <IconSymbol name="arrow.left" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Bancos conectados</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing['3xl'] },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={load}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading && connections.length === 0 ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        ) : connections.length === 0 ? (
          <Text style={styles.empty}>
            Nenhum banco conectado ainda. Conecte via Open Finance para importar
            contas e transações automaticamente.
          </Text>
        ) : (
          connections.map((conn) => {
            const info = statusInfo(conn.status);
            return (
              <View key={conn.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  {conn.connector_image_url ? (
                    <Image
                      source={{ uri: conn.connector_image_url }}
                      style={styles.logo}
                      contentFit="contain"
                    />
                  ) : (
                    <View style={[styles.logo, styles.logoFallback]}>
                      <Text style={styles.logoFallbackText}>
                        {(conn.connector_name ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.cardInfo}>
                    <Text style={styles.bankName} numberOfLines={1}>
                      {conn.connector_name ?? 'Banco'}
                    </Text>
                    <Text style={styles.accountsCount}>
                      {conn.accounts_count}{' '}
                      {conn.accounts_count === 1 ? 'conta' : 'contas'}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: info.color + '22' }]}>
                    <Text style={[styles.badgeText, { color: info.color }]}>
                      {info.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  {info.needsReconnect && (
                    <Button
                      label="Reconectar"
                      variant="secondary"
                      onPress={() => handleReconnect(conn)}
                      style={styles.actionButton}
                    />
                  )}
                  <Button
                    label={busyId === conn.id ? 'Desconectando…' : 'Desconectar'}
                    variant="tertiary"
                    onPress={() => handleDisconnect(conn)}
                    disabled={busyId === conn.id}
                    style={styles.actionButton}
                  />
                </View>
              </View>
            );
          })
        )}

        <Button
          label="Conectar novo banco"
          onPress={handleConnectNew}
          style={styles.connectButton}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: colors.text },
  content: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  loader: { marginTop: Spacing['3xl'] },
  empty: {
    color: colors.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
    lineHeight: 22,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  logo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF' },
  logoFallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: { color: '#FFFFFF', fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  cardInfo: { flex: 1, gap: 2 },
  bankName: { color: colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  accountsCount: { color: colors.textSecondary, fontSize: FontSize.sm },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.md },
  badgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  cardActions: { flexDirection: 'row', gap: Spacing.sm },
  actionButton: { flex: 1 },
  connectButton: { marginTop: Spacing.lg },
});
