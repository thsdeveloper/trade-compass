import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { getTransactions } from '@/lib/finance-api';
import { Button } from '@/components/atoms/Button';
import { BankLogo } from '@/components/atoms/BankLogo';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { ScrollEdgeEffect } from '@/components/atoms/ScrollEdgeEffect';
import { TransactionListItem } from '@/components/molecules/TransactionListItem';
import { TransactionDetailModal } from '@/components/organisms/TransactionDetailModal';
import {
  formatCurrency,
  type FinanceAccount,
  type TransactionWithDetails,
} from '@/types/finance';

const BALANCE_VISIBILITY_KEY = '@balance_visibility';
const RECENT_LIMIT = 10;

interface AccountShare {
  account: FinanceAccount;
  /** Participação no total, em % (0–100), pela magnitude do saldo */
  share: number;
}

function GlassCircleButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {({ pressed }) => (
        <View style={pressed && styles.pressedScale}>
          <GlassSurface variant="glass" isInteractive style={styles.circleButton}>
            <IconSymbol name={icon} size={20} color={colors.text} />
          </GlassSurface>
        </View>
      )}
    </Pressable>
  );
}

export default function ContasScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { accounts, isLoading, loadAccounts } = useFinance();

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithDetails[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionWithDetails | null>(null);
  const scrollY = useSharedValue(0);

  const screenBg = isDark ? colors.background : '#F6F7F9';
  // Altura da barra fixa: inset + respiro + botão de 44
  const headerHeight = insets.top + Spacing.sm + 44;

  const loadRecent = useCallback(async () => {
    try {
      const transactions = await getTransactions({ limit: RECENT_LIMIT });
      setRecentTransactions(transactions);
    } catch {
      // Lançamentos recentes são secundários nesta tela; falha fica silenciosa
      setRecentTransactions([]);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
    loadRecent();
    AsyncStorage.getItem(BALANCE_VISIBILITY_KEY)
      .then((stored) => {
        if (stored !== null) setIsBalanceVisible(stored === 'true');
      })
      .catch(() => {});
  }, [loadAccounts, loadRecent]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadAccounts(), loadRecent()]);
    setIsRefreshing(false);
  }, [loadAccounts, loadRecent]);

  const toggleBalanceVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBalanceVisible((prev) => {
      AsyncStorage.setItem(BALANCE_VISIBILITY_KEY, String(!prev)).catch(() => {});
      return !prev;
    });
  }, []);

  const handleAddAccount = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Em breve',
      'O cadastro de contas pelo app chega em breve. Por enquanto, cadastre suas contas pela versão web.'
    );
  }, []);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, account) => sum + account.current_balance, 0),
    [accounts]
  );

  // Participação de cada conta pela magnitude do saldo (como no app de
  // referência: contas negativas também ocupam espaço na barra)
  const shares: AccountShare[] = useMemo(() => {
    const totalAbs = accounts.reduce(
      (sum, account) => sum + Math.abs(account.current_balance),
      0
    );
    return accounts.map((account) => ({
      account,
      share:
        totalAbs > 0
          ? (Math.abs(account.current_balance) / totalAbs) * 100
          : accounts.length > 0
            ? 100 / accounts.length
            : 0,
    }));
  }, [accounts]);

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      {/* Camada de conteúdo: gradiente de marca para o vidro refratar */}
      <LinearGradient
        colors={
          isDark
            ? ['#1D4ED8', '#16233F', colors.background]
            : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.55, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing['3xl'],
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing || isLoading}
            onRefresh={handleRefresh}
            tintColor={isDark ? colors.primary : '#FFFFFF'}
          />
        }
      >
        {/* Saldo consolidado */}
        <Text style={styles.balanceLabel}>
          Saldo em {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}
        </Text>
        <Text style={styles.balanceValue}>
          {isBalanceVisible ? formatCurrency(totalBalance) : 'R$ ••••••'}
        </Text>

        {/* Barra de distribuição por conta */}
        {shares.length > 0 && (
          <View style={styles.distributionBar}>
            {shares.map(({ account, share }) => (
              <View
                key={account.id}
                style={[
                  styles.distributionSegment,
                  { backgroundColor: account.color, flex: Math.max(share, 4) },
                ]}
              />
            ))}
          </View>
        )}

        {/* Lista de contas (conteúdo → material) */}
        <GlassSurface
          variant="material"
          style={[
            styles.card,
            {
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
            },
          ]}
        >
          {shares.map(({ account, share }, index) => (
            <View key={account.id}>
              {index > 0 && (
                <View
                  style={[
                    styles.rowSeparator,
                    { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
                  ]}
                />
              )}
              <View style={styles.accountRow}>
                <BankLogo
                  bank={account.bank_id}
                  name={account.name}
                  size={44}
                  formato="circulo"
                  fallback={
                    <View style={[styles.accountBadge, { backgroundColor: account.color }]}>
                      <Text style={styles.accountBadgeText}>
                        {account.name.trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  }
                />
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text style={[styles.accountShare, { color: colors.textSecondary }]}>
                    {share.toFixed(0)}%
                  </Text>
                </View>
                <Text
                  style={[
                    styles.accountBalance,
                    {
                      color:
                        account.current_balance < 0 ? colors.danger : colors.text,
                    },
                  ]}
                >
                  {isBalanceVisible ? formatCurrency(account.current_balance) : 'R$ ••••'}
                </Text>
              </View>
            </View>
          ))}

          {accounts.length === 0 && !isLoading && (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nenhuma conta cadastrada
              </Text>
            </View>
          )}
        </GlassSurface>

        {/* Ação: adicionar conta (CTA primário do design system) */}
        <Button
          label="Adicionar conta"
          onPress={handleAddAccount}
          style={styles.addButton}
        />

        {/* Últimos lançamentos */}
        {recentTransactions.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Últimos lançamentos
            </Text>
            <GlassSurface
              variant="material"
              style={[
                styles.card,
                {
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
                },
              ]}
            >
              {recentTransactions.map((transaction, index) => (
                <TransactionListItem
                  key={transaction.id}
                  transaction={transaction}
                  showDivider={index > 0}
                  hideAmount={!isBalanceVisible}
                  onPress={() => setSelectedTransaction(transaction)}
                />
              ))}
            </GlassSurface>
          </>
        )}
      </ScrollView>

      {/* Camada funcional fixa: voltar + olho em vidro, com scroll edge
          effect materializando o fundo quando o conteúdo rola por baixo */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <ScrollEdgeEffect scrollY={scrollY} />
        <View style={styles.topBarRow}>
          <GlassCircleButton
            icon="arrow.left"
            onPress={() => router.back()}
            accessibilityLabel="Voltar"
          />
          <GlassCircleButton
            icon={isBalanceVisible ? 'eye.fill' : 'eye.slash.fill'}
            onPress={toggleBalanceVisibility}
            accessibilityLabel={isBalanceVisible ? 'Ocultar valores' : 'Mostrar valores'}
          />
        </View>
      </View>

      <TransactionDetailModal
        transaction={selectedTransaction}
        visible={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
      />
    </View>
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
    height: 460,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedScale: {
    transform: [{ scale: 0.94 }],
  },
  balanceLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
    marginBottom: Spacing.lg,
  },
  distributionBar: {
    flexDirection: 'row',
    gap: Spacing.xs,
    height: 10,
    marginBottom: Spacing.xl,
  },
  distributionSegment: {
    borderRadius: 5,
  },
  card: {
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  accountBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBadgeText: {
    color: '#FFFFFF',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  accountShare: {
    fontSize: FontSize.sm,
  },
  accountBalance: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
  },
  addButton: {
    marginBottom: Spacing['2xl'],
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
});
