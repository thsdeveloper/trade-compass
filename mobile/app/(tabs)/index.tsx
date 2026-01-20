import { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { formatCurrency } from '@/types/finance';

import { MonthNavigator } from '@/components/finance/MonthNavigator';
import { SummaryCard } from '@/components/finance/SummaryCard';
import { BudgetProgressCard } from '@/components/finance/BudgetProgressCard';
import { CategoryExpenseItem } from '@/components/finance/CategoryExpenseItem';
import { UpcomingPaymentItem } from '@/components/finance/UpcomingPaymentItem';
import { DashboardSection } from '@/components/finance/DashboardSection';

export default function DashboardScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const totalAccountsBalance = accounts.reduce(
    (sum, acc) => sum + acc.current_balance,
    0
  );

  const renderSkeleton = () => (
    <View style={styles.skeletonContainer}>
      <ActivityIndicator size="large" color={colors.tint} />
      <Text style={[styles.loadingText, { color: colors.icon }]}>
        Carregando dashboard...
      </Text>
    </View>
  );

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyText, { color: colors.icon }]}>{message}</Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorContainer}>
      <Text style={[styles.errorText, { color: isDark ? '#f87171' : '#dc2626' }]}>
        {dashboardError}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isDashboardLoading}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            {getGreeting()}!
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Aqui esta seu resumo financeiro
          </Text>
        </View>

        {/* Month Navigator */}
        <MonthNavigator
          date={selectedMonth}
          onPrevious={handlePreviousMonth}
          onNext={handleNextMonth}
        />

        {dashboardError && renderError()}

        {isDashboardLoading && !dashboardSummary ? (
          renderSkeleton()
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                <SummaryCard
                  title="Saldo Total"
                  value={dashboardSummary?.total_balance ?? 0}
                  iconName="wallet.pass.fill"
                  variant="default"
                />
                <SummaryCard
                  title="A Pagar"
                  value={dashboardSummary?.total_pending_expenses ?? 0}
                  iconName="arrow.down.circle.fill"
                  variant="danger"
                />
              </View>
              <View style={styles.summaryRow}>
                <SummaryCard
                  title="A Receber"
                  value={dashboardSummary?.total_pending_income ?? 0}
                  iconName="arrow.up.circle.fill"
                  variant="success"
                />
                <SummaryCard
                  title="Resultado"
                  value={dashboardSummary?.month_result ?? 0}
                  iconName={
                    (dashboardSummary?.month_result ?? 0) >= 0
                      ? 'chart.line.uptrend.xyaxis'
                      : 'chart.line.downtrend.xyaxis'
                  }
                  variant={
                    (dashboardSummary?.month_result ?? 0) >= 0
                      ? 'success'
                      : 'danger'
                  }
                />
              </View>
            </View>

            {/* Budget 50-30-20 */}
            {budgetSummary && budgetSummary.total_income > 0 && (
              <DashboardSection title="Orcamento 50-30-20">
                {budgetSummary.allocations.map((allocation) => (
                  <BudgetProgressCard
                    key={allocation.category}
                    allocation={allocation}
                    totalIncome={budgetSummary.total_income}
                  />
                ))}
              </DashboardSection>
            )}

            {/* Expenses by Category */}
            <DashboardSection
              title="Despesas por Categoria"
              onSeeAll={() => router.push('/transactions')}
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
            </DashboardSection>

            {/* Upcoming Payments */}
            <DashboardSection
              title="Proximos Vencimentos"
              onSeeAll={() => router.push('/transactions')}
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
            </DashboardSection>

            {/* Accounts Summary */}
            <DashboardSection title="Contas">
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
                                ? isDark
                                  ? '#10b981'
                                  : '#059669'
                                : isDark
                                  ? '#f87171'
                                  : '#dc2626',
                          },
                        ]}
                      >
                        {formatCurrency(account.current_balance)}
                      </Text>
                    </View>
                  ))}
                  <View
                    style={[
                      styles.totalRow,
                      { borderTopColor: isDark ? '#374151' : '#e5e7eb' },
                    ]}
                  >
                    <Text style={[styles.totalLabel, { color: colors.icon }]}>
                      Saldo Total
                    </Text>
                    <Text
                      style={[
                        styles.totalValue,
                        {
                          color:
                            totalAccountsBalance >= 0
                              ? isDark
                                ? '#10b981'
                                : '#059669'
                              : isDark
                                ? '#f87171'
                                : '#dc2626',
                        },
                      ]}
                    >
                      {formatCurrency(totalAccountsBalance)}
                    </Text>
                  </View>
                </>
              ) : (
                renderEmptyState('Nenhuma conta cadastrada')
              )}
            </DashboardSection>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 8,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  summaryGrid: {
    gap: 12,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  errorContainer: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  accountDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
