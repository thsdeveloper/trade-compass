import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { formatCurrency } from '@/types/finance';

import {
  NubankHeader,
  BalanceSection,
  QuickActions,
  ContentSection,
} from '@/components/nubank';
import { HEADER_BAR_HEIGHT } from '@/components/nubank/NubankHeader';
import { ScrollEdgeEffect } from '@/components/ui/ScrollEdgeEffect';
import { MonthNavigator } from '@/components/finance/MonthNavigator';
import { BudgetCard } from '@/components/finance/BudgetCard';
import { CategoryExpenseItem } from '@/components/finance/CategoryExpenseItem';
import { UpcomingPaymentItem } from '@/components/finance/UpcomingPaymentItem';
import { AgentFab } from '@/components/agent/AgentFab';

const BALANCE_VISIBILITY_KEY = '@balance_visibility';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { profile } = useAuth();

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);

  // Set status bar style when screen gains focus
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
    }, [])
  );

  const {
    selectedMonth,
    setSelectedMonth,
    accounts,
    loadAccounts,
    dashboardSummary,
    expensesByCategory,
    upcomingPayments,
    isDashboardLoading,
    dashboardError,
    loadDashboard,
  } = useFinance();

  // Load balance visibility preference
  useEffect(() => {
    const loadBalanceVisibility = async () => {
      try {
        const stored = await AsyncStorage.getItem(BALANCE_VISIBILITY_KEY);
        if (stored !== null) {
          setIsBalanceVisible(stored === 'true');
        }
      } catch (error) {
        console.error('Failed to load balance visibility:', error);
      }
    };
    loadBalanceVisibility();
  }, []);

  // Toggle balance visibility
  const handleToggleBalance = useCallback(async () => {
    const newValue = !isBalanceVisible;
    setIsBalanceVisible(newValue);
    try {
      await AsyncStorage.setItem(BALANCE_VISIBILITY_KEY, String(newValue));
    } catch (error) {
      console.error('Failed to save balance visibility:', error);
    }
  }, [isBalanceVisible]);

  useEffect(() => {
    loadDashboard();
    loadAccounts();
  }, [loadDashboard, loadAccounts]);

  const handlePreviousMonth = useCallback(() => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedMonth(newDate);
  }, [selectedMonth, setSelectedMonth]);

  const handleNextMonth = useCallback(() => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedMonth(newDate);
  }, [selectedMonth, setSelectedMonth]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadDashboard(), loadAccounts()]);
  }, [loadDashboard, loadAccounts]);

  // Reload dashboard when month changes
  useEffect(() => {
    loadDashboard();
  }, [selectedMonth, loadDashboard]);

  const totalAccountsBalance = accounts.reduce(
    (sum, acc) => sum + acc.current_balance,
    0
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.icon }]}>
        Carregando...
      </Text>
    </View>
  );

  const renderEmptyState = (icon: IconSymbolName, message: string, hint?: string) => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
        <IconSymbol name={icon} size={22} color={colors.icon} />
      </View>
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{message}</Text>
      {hint && (
        <Text style={[styles.emptyHint, { color: colors.icon }]}>{hint}</Text>
      )}
    </View>
  );

  const renderError = () => (
    <View style={[styles.errorContainer, { backgroundColor: colors.dangerLight }]}>
      <Text style={[styles.errorText, { color: colors.danger }]}>
        {dashboardError}
      </Text>
    </View>
  );

  const screenBg = isDark ? colors.background : '#F6F7F9';
  // Espaço para o conteúdo começar abaixo da cápsula do header (estado de
  // repouso limpo: a interseção com o vidro só acontece durante o scroll)
  const contentTopPadding = insets.top + Spacing.sm + HEADER_BAR_HEIGHT + Spacing.md;

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      {/* Camada de conteúdo: a cor de marca vive no fundo, edge-to-edge,
          dando ao vidro algo para refratar */}
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
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: contentTopPadding }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isDashboardLoading}
            onRefresh={handleRefresh}
            tintColor={isDark ? colors.primary : '#FFFFFF'}
            progressViewOffset={contentTopPadding}
          />
        }
      >
        {/* Balance Section */}
        <BalanceSection
          title="Saldo em conta"
          balance={totalAccountsBalance}
          isVisible={isBalanceVisible}
          onPress={() => router.push('/contas' as Href)}
        />

        {/* Quick Actions */}
        <QuickActions />

        {/* Month Navigator */}
        <View style={styles.monthNavigatorContainer}>
          <MonthNavigator
            date={selectedMonth}
            onPrevious={handlePreviousMonth}
            onNext={handleNextMonth}
          />
        </View>

        {dashboardError && renderError()}

        {isDashboardLoading && !dashboardSummary ? (
          renderSkeleton()
        ) : (
          <>
            {/* Resumo do mês: um cartão, três colunas */}
            <ContentSection title="Resumo do mês" showChevron={false}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryColumn}>
                  <View style={styles.summaryLabelRow}>
                    <IconSymbol name="arrow.up" size={12} color={colors.success} />
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      Receitas
                    </Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {isBalanceVisible
                      ? formatCurrency(dashboardSummary?.total_pending_income ?? 0)
                      : '•••'}
                  </Text>
                </View>

                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

                <View style={styles.summaryColumn}>
                  <View style={styles.summaryLabelRow}>
                    <IconSymbol name="arrow.down" size={12} color={colors.danger} />
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                      Despesas
                    </Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    {isBalanceVisible
                      ? formatCurrency(dashboardSummary?.total_pending_expenses ?? 0)
                      : '•••'}
                  </Text>
                </View>

                <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

                <View style={styles.summaryColumn}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Resultado
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          (dashboardSummary?.month_result ?? 0) >= 0
                            ? colors.success
                            : colors.danger,
                      },
                    ]}
                  >
                    {isBalanceVisible
                      ? formatCurrency(dashboardSummary?.month_result ?? 0)
                      : '•••'}
                  </Text>
                </View>
              </View>
            </ContentSection>

            {/* Orçamento: card-resumo com curva de gastos; toque abre /orcamento */}
            <BudgetCard isBalanceVisible={isBalanceVisible} />

            {/* Expenses by Category */}
            <ContentSection
              title="Despesas por categoria"
              onPress={() => router.push('/transactions')}
              actionButton={
                expensesByCategory.length > 5
                  ? {
                      label: 'Ver todas',
                      onPress: () => router.push('/transactions'),
                    }
                  : undefined
              }
            >
              {expensesByCategory.length > 0 ? (
                expensesByCategory
                  .slice(0, 5)
                  .map((item) => (
                    <CategoryExpenseItem key={item.category_id} item={item} />
                  ))
              ) : (
                renderEmptyState(
                  'chart.bar',
                  'Nenhuma despesa neste mês',
                  'Lance uma compra pelo + ou escaneando a nota fiscal'
                )
              )}
            </ContentSection>

            {/* Upcoming Payments */}
            <ContentSection
              title="Próximos vencimentos"
              onPress={() => router.push('/transactions')}
            >
              {upcomingPayments.length > 0 ? (
                upcomingPayments
                  .slice(0, 5)
                  .map((payment) => (
                    <UpcomingPaymentItem key={payment.id} payment={payment} />
                  ))
              ) : (
                renderEmptyState(
                  'checkmark.circle',
                  'Nada a pagar nos próximos dias',
                  'Suas contas estão em dia'
                )
              )}
            </ContentSection>

            {/* Accounts Summary */}
            <ContentSection
              title="Minhas contas"
              onPress={() => router.push('/contas' as Href)}
              actionButton={{
                label: 'Ver todas as contas',
                onPress: () => router.push('/contas' as Href),
              }}
            >
              {accounts.length > 0 ? (
                <>
                  {accounts.slice(0, 3).map((account) => (
                    <View key={account.id} style={styles.accountItem}>
                      <View style={styles.accountLeft}>
                        <View
                          style={[
                            styles.accountIcon,
                            { backgroundColor: account.color + '20' },
                          ]}
                        >
                          <View
                            style={[
                              styles.accountDot,
                              { backgroundColor: account.color },
                            ]}
                          />
                        </View>
                        <Text
                          style={[styles.accountName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {account.name}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.accountBalance,
                          {
                            color:
                              account.current_balance >= 0
                                ? colors.success
                                : colors.danger,
                          },
                        ]}
                      >
                        {isBalanceVisible
                          ? formatCurrency(account.current_balance)
                          : '***'}
                      </Text>
                    </View>
                  ))}
                </>
              ) : (
                renderEmptyState(
                  'wallet.pass',
                  'Nenhuma conta cadastrada',
                  'Cadastre sua primeira conta em "Contas"'
                )
              )}
            </ContentSection>
          </>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Scroll edge effect: material que aparece atrás do header ao rolar */}
      <View
        style={[
          styles.edgeBar,
          { height: insets.top + Spacing.sm + HEADER_BAR_HEIGHT + Spacing.sm },
        ]}
        pointerEvents="none"
      >
        <ScrollEdgeEffect scrollY={scrollY} />
      </View>

      {/* Camada funcional (Liquid Glass): renderizada depois do scroll para
          o material capturar o conteúdo passando por baixo */}
      <NubankHeader
        userName={profile?.full_name || 'Usuario'}
        userPhoto={profile?.avatar_url}
        isBalanceVisible={isBalanceVisible}
        onToggleBalance={handleToggleBalance}
        onProfilePress={() => router.push('/more' as Href)}
      />

      <AgentFab />
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
    height: 480,
  },
  edgeBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing['3xl'],
  },
  monthNavigatorContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  summaryColumn: {
    flex: 1,
    gap: Spacing.xs,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
  },
  summaryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  skeletonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
  },
  emptyState: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  emptyHint: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorContainer: {
    marginHorizontal: Spacing.xl,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  accountDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  accountName: {
    fontSize: FontSize.md,
    fontWeight: '500',
    flex: 1,
  },
  accountBalance: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: Spacing['3xl'],
  },
});
