import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { formatCurrency } from '@/types/finance';

import {
  NubankHeader,
  BalanceSection,
  QuickActions,
  ContentSection,
} from '@/components/nubank';
import { MonthNavigator } from '@/components/finance/MonthNavigator';
import { BudgetProgressCard } from '@/components/finance/BudgetProgressCard';
import { CategoryExpenseItem } from '@/components/finance/CategoryExpenseItem';
import { UpcomingPaymentItem } from '@/components/finance/UpcomingPaymentItem';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';

const BALANCE_VISIBILITY_KEY = '@balance_visibility';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

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
    budgetSummary,
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

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: colors.icon }]}>{message}</Text>
    </View>
  );

  const renderError = () => (
    <View style={[styles.errorContainer, { backgroundColor: colors.dangerLight }]}>
      <Text style={[styles.errorText, { color: colors.danger }]}>
        {dashboardError}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Nubank-style Header */}
      <NubankHeader
        userName="Usuario"
        isBalanceVisible={isBalanceVisible}
        onToggleBalance={handleToggleBalance}
        onProfilePress={() => router.push('/more' as Href)}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isDashboardLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            progressBackgroundColor={colors.background}
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
            {/* Summary Cards - Nubank style */}
            <ContentSection
              title="Resumo do Mes"
              subtitle={`${new Date(selectedMonth).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}`}
              showChevron={false}
            >
              <View style={styles.summaryCards}>
                <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Receitas
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {isBalanceVisible
                      ? formatCurrency(dashboardSummary?.total_pending_income ?? 0)
                      : '***'}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Despesas
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.danger }]}>
                    {isBalanceVisible
                      ? formatCurrency(dashboardSummary?.total_pending_expenses ?? 0)
                      : '***'}
                  </Text>
                </View>
                <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
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
                      : '***'}
                  </Text>
                </View>
              </View>
            </ContentSection>

            {/* Budget 50-30-20 */}
            {budgetSummary && budgetSummary.total_income > 0 && (
              <ContentSection
                title="Orcamento 50-30-20"
                showChevron={false}
              >
                {budgetSummary.allocations.map((allocation) => (
                  <BudgetProgressCard
                    key={allocation.category}
                    allocation={allocation}
                    totalIncome={budgetSummary.total_income}
                  />
                ))}
              </ContentSection>
            )}

            {/* Expenses by Category */}
            <ContentSection
              title="Despesas por Categoria"
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
                renderEmptyState('Nenhuma despesa neste mes')
              )}
            </ContentSection>

            {/* Upcoming Payments */}
            <ContentSection
              title="Proximos Vencimentos"
              onPress={() => router.push('/transactions')}
              alertText={
                upcomingPayments.length > 0
                  ? `${upcomingPayments.length} pagamento(s) nos proximos dias`
                  : undefined
              }
              alertVariant="warning"
            >
              {upcomingPayments.length > 0 ? (
                upcomingPayments
                  .slice(0, 5)
                  .map((payment) => (
                    <UpcomingPaymentItem key={payment.id} payment={payment} />
                  ))
              ) : (
                renderEmptyState('Nenhum vencimento proximo')
              )}
            </ContentSection>

            {/* Accounts Summary */}
            <ContentSection
              title="Minhas Contas"
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
                renderEmptyState('Nenhuma conta cadastrada')
              )}
            </ContentSection>
          </>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FloatingActionButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  summaryCards: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
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
  },
  emptyText: {
    fontSize: FontSize.sm,
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
