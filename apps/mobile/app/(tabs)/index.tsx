import { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { IconSymbol, IconSymbolName } from '@/components/atoms/icon-symbol';
import { BankLogo } from '@/components/atoms/BankLogo';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { formatCurrency } from '@/types/finance';

import { NubankHeader, HEADER_BAR_HEIGHT } from '@/components/organisms/NubankHeader';
import { QuickActions } from '@/components/organisms/QuickActions';
import { BalanceSection } from '@/components/molecules/BalanceSection';
import { ContentSection } from '@/components/molecules/ContentSection';
import { ScrollEdgeEffect } from '@/components/atoms/ScrollEdgeEffect';
import { SkeletonProvider } from '@/components/atoms/Skeleton';
import { BudgetCard } from '@/components/organisms/BudgetCard';
import { TransactionListItem } from '@/components/molecules/TransactionListItem';
import { CategoryExpenseItem } from '@/components/molecules/CategoryExpenseItem';
import { UpcomingPaymentItem } from '@/components/molecules/UpcomingPaymentItem';
import {
  BalanceSkeleton,
  TransactionRowsSkeleton,
  IconRowsSkeleton,
  SummarySkeleton,
  BudgetSkeleton,
} from '@/components/organisms/DashboardSkeletons';
import { AgentFab } from '@/components/organisms/AgentFab';

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
    accounts,
    loadAccounts,
    accountsLoaded,
    transactions,
    loadTransactions,
    transactionsLoaded,
    dashboardSummary,
    expensesByCategory,
    upcomingPayments,
    isDashboardLoading,
    dashboardLoaded,
    dashboardError,
    loadDashboard,
  } = useFinance();

  // Dashboard "pendente": ainda sem primeira carga e sem erro → mostra skeleton
  const dashboardPending = !dashboardLoaded && !dashboardError;
  // Enquanto qualquer seção estiver em skeleton, mantém o pulso ativo
  const anyPending = !accountsLoaded || !transactionsLoaded || dashboardPending;

  // Sem movimentação no mês (pago ou pendente) → estado vazio, em vez de zeros
  const monthIncome = dashboardSummary?.month_income ?? 0;
  const monthExpenses = dashboardSummary?.month_expenses ?? 0;
  const monthResult = dashboardSummary?.month_result ?? 0;
  const summaryIsEmpty = monthIncome === 0 && monthExpenses === 0;
  // Fração da renda já consumida pelas despesas (barra de proporção)
  const spentShare = monthIncome > 0 ? Math.round((monthExpenses / monthIncome) * 100) : null;
  const spentFraction = monthIncome > 0 ? Math.min(monthExpenses / monthIncome, 1) : 0;

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
    loadTransactions();
  }, [loadDashboard, loadAccounts, loadTransactions]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadDashboard(), loadAccounts(), loadTransactions()]);
  }, [loadDashboard, loadAccounts, loadTransactions]);

  const totalAccountsBalance = accounts.reduce(
    (sum, acc) => sum + acc.current_balance,
    0
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

      <SkeletonProvider active={anyPending}>
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
            refreshing={dashboardLoaded && isDashboardLoading}
            onRefresh={handleRefresh}
            tintColor={isDark ? colors.primary : '#FFFFFF'}
            progressViewOffset={contentTopPadding}
          />
        }
      >
        {/* Saldo hero centralizado sobre o gradiente */}
        {accountsLoaded ? (
          <BalanceSection
            title="Saldo total"
            balance={totalAccountsBalance}
            isVisible={isBalanceVisible}
            onPress={() => router.push('/contas' as Href)}
          />
        ) : (
          <BalanceSkeleton />
        )}

        {/* Quick Actions */}
        <QuickActions />

        {/* Últimos lançamentos, logo abaixo das ações */}
        <ContentSection
          title="Últimos lançamentos"
          onPress={() => router.push('/transactions')}
          actionButton={
            transactionsLoaded && transactions.length > 3
              ? {
                  label: 'Ver todos',
                  onPress: () => router.push('/transactions'),
                }
              : undefined
          }
        >
          {!transactionsLoaded ? (
            <TransactionRowsSkeleton />
          ) : transactions.length > 0 ? (
            transactions
              .slice(0, 3)
              .map((transaction, index, list) => (
                <TransactionListItem
                  key={transaction.id}
                  transaction={transaction}
                  onPress={() => router.push('/transactions')}
                  showDivider={index < list.length - 1}
                  hideAmount={!isBalanceVisible}
                />
              ))
          ) : (
            renderEmptyState(
              'list.bullet',
              'Nenhum lançamento ainda',
              'Adicione sua primeira transação pelo +'
            )
          )}
        </ContentSection>

        {dashboardError && renderError()}

        <>
            {/* Resumo do mês: um cartão, três colunas */}
            <ContentSection title="Resumo do mês" showChevron={false}>
              {dashboardPending ? (
                <SummarySkeleton />
              ) : summaryIsEmpty ? (
                renderEmptyState(
                  'chart.line.uptrend.xyaxis',
                  'Sem movimentação neste mês',
                  'Suas receitas e despesas do mês aparecem aqui'
                )
              ) : (
              <View style={styles.summaryLedger}>
                {/* Receitas */}
                <View style={styles.ledgerRow}>
                  <View style={styles.ledgerLeft}>
                    <View style={[styles.ledgerBadge, { backgroundColor: colors.success + '22' }]}>
                      <IconSymbol name="arrow.up" size={14} color={colors.success} />
                    </View>
                    <Text style={[styles.ledgerLabel, { color: colors.textSecondary }]}>
                      Receitas
                    </Text>
                  </View>
                  <Text style={[styles.ledgerValue, { color: colors.text }]}>
                    {isBalanceVisible ? formatCurrency(monthIncome) : '•••'}
                  </Text>
                </View>

                {/* Despesas */}
                <View style={styles.ledgerRow}>
                  <View style={styles.ledgerLeft}>
                    <View style={[styles.ledgerBadge, { backgroundColor: colors.danger + '22' }]}>
                      <IconSymbol name="arrow.down" size={14} color={colors.danger} />
                    </View>
                    <Text style={[styles.ledgerLabel, { color: colors.textSecondary }]}>
                      Despesas
                    </Text>
                  </View>
                  <Text style={[styles.ledgerValue, { color: colors.text }]}>
                    {isBalanceVisible ? formatCurrency(monthExpenses) : '•••'}
                  </Text>
                </View>

                {/* Barra de proporção: quanto das receitas já virou despesa */}
                {monthIncome > 0 && (
                  <View style={styles.spentBarWrap}>
                    <View style={[styles.spentTrack, { backgroundColor: colors.success + '2E' }]}>
                      <View
                        style={[
                          styles.spentFill,
                          { width: `${spentFraction * 100}%`, backgroundColor: colors.danger },
                        ]}
                      />
                    </View>
                    {spentShare !== null && (
                      <Text style={[styles.spentCaption, { color: colors.textSecondary }]}>
                        Você gastou {spentShare}% do que recebeu
                      </Text>
                    )}
                  </View>
                )}

                {/* Resultado */}
                <View style={[styles.resultRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.resultLabel, { color: colors.text }]}>Resultado</Text>
                  <Text
                    style={[
                      styles.resultValue,
                      { color: monthResult >= 0 ? colors.success : colors.danger },
                    ]}
                  >
                    {isBalanceVisible
                      ? `${monthResult >= 0 ? '+' : '-'}${formatCurrency(Math.abs(monthResult))}`
                      : '•••'}
                  </Text>
                </View>
              </View>
              )}
            </ContentSection>

            {/* Orçamento: card-resumo com curva de gastos; toque abre /orcamento */}
            {dashboardPending ? (
              <BudgetSkeleton />
            ) : (
              <BudgetCard isBalanceVisible={isBalanceVisible} />
            )}

            {/* Expenses by Category */}
            <ContentSection
              title="Despesas por categoria"
              onPress={() => router.push('/transactions')}
              actionButton={
                !dashboardPending && expensesByCategory.length > 5
                  ? {
                      label: 'Ver todas',
                      onPress: () => router.push('/transactions'),
                    }
                  : undefined
              }
            >
              {dashboardPending ? (
                <IconRowsSkeleton rows={4} />
              ) : expensesByCategory.length > 0 ? (
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
              {dashboardPending ? (
                <IconRowsSkeleton rows={3} />
              ) : upcomingPayments.length > 0 ? (
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
              {!accountsLoaded ? (
                <IconRowsSkeleton rows={3} />
              ) : accounts.length > 0 ? (
                <>
                  {accounts.slice(0, 3).map((account) => (
                    <View key={account.id} style={styles.accountItem}>
                      <View style={styles.accountLeft}>
                        <View style={styles.accountLogo}>
                          <BankLogo
                            bank={account.bank_id}
                            name={account.name}
                            size={36}
                            formato="quadrado"
                            fallback={
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
                            }
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

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
      </SkeletonProvider>

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
  summaryLedger: {
    paddingTop: Spacing.xs,
    gap: Spacing.md,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ledgerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  ledgerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  ledgerValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  spentBarWrap: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  spentTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  spentFill: {
    height: '100%',
    borderRadius: 4,
  },
  spentCaption: {
    fontSize: FontSize.xs,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    marginTop: Spacing.xs,
  },
  resultLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  resultValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
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
  accountLogo: {
    marginRight: Spacing.md,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
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
