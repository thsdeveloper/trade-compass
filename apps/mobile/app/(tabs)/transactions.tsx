import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  SectionList,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTransactionsFeed, type FeedTypeFilter } from '@/hooks/use-transactions-feed';
import { TransactionListItem } from '@/components/molecules/TransactionListItem';
import { TransactionDetailModal } from '@/components/organisms/TransactionDetailModal';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { ScrollEdgeEffect } from '@/components/atoms/ScrollEdgeEffect';
import { AskNorteBar } from '@/components/organisms/AskNorteBar';
import {
  groupTransactionsByDate,
  formatCurrency,
  type TransactionWithDetails,
} from '@/types/finance';

const BALANCE_VISIBILITY_KEY = '@balance_visibility';

interface SectionData {
  title: string;
  net: number;
  data: TransactionWithDetails[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

const SEGMENTS: { key: FeedTypeFilter; label: string }[] = [
  { key: 'ALL', label: 'Tudo' },
  { key: 'RECEITA', label: 'Receitas' },
  { key: 'DESPESA', label: 'Despesas' },
];

/** "Hoje", "Ontem", dia da semana (últimos/próximos 7 dias) ou "10 de julho" */
function formatSectionDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - date.getTime()) / DAY_MS);

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays === -1) return 'Amanhã';

  if (Math.abs(diffDays) < 7) {
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  const label = date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  const sameYear = date.getFullYear() === today.getFullYear();
  return sameYear ? label : `${label} de ${date.getFullYear()}`;
}

export default function TransactionsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const screenBg = isDark ? colors.background : '#F6F7F9';
  const sectionHeaderBg = isDark
    ? 'rgba(18, 18, 18, 0.92)'
    : 'rgba(246, 247, 249, 0.92)';

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const scrollY = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(colorScheme === 'dark' ? 'light' : 'dark');
    }, [colorScheme])
  );

  const {
    items,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    typeFilter,
    search,
    loadMore,
    refresh,
    setTypeFilter,
    setSearch,
  } = useTransactionsFeed();

  useEffect(() => {
    AsyncStorage.getItem(BALANCE_VISIBILITY_KEY)
      .then((stored) => {
        if (stored !== null) setIsBalanceVisible(stored === 'true');
      })
      .catch(() => {});
  }, []);

  const toggleBalanceVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBalanceVisible((prev) => {
      AsyncStorage.setItem(BALANCE_VISIBILITY_KEY, String(!prev)).catch(() => {});
      return !prev;
    });
  }, []);

  const handleTransactionPress = useCallback((transaction: TransactionWithDetails) => {
    setSelectedTransaction(transaction);
    setIsDetailModalVisible(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setIsDetailModalVisible(false);
    setSelectedTransaction(null);
  }, []);

  const selectSegment = useCallback(
    (filter: FeedTypeFilter) => {
      if (filter === typeFilter) return;
      Haptics.selectionAsync();
      setTypeFilter(filter);
    },
    [typeFilter, setTypeFilter]
  );

  const sections: SectionData[] = useMemo(() => {
    const grouped = groupTransactionsByDate(items);
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, data]) => ({
        title: formatSectionDate(date),
        net: data.reduce(
          (sum, t) => sum + (t.type === 'RECEITA' ? t.amount : -t.amount),
          0
        ),
        data,
      }));
  }, [items]);

  const formatNet = useCallback(
    (net: number) => {
      if (!isBalanceVisible) return '•••';
      const sign = net >= 0 ? '+' : '-';
      return `${sign}${formatCurrency(Math.abs(net))}`;
    },
    [isBalanceVisible]
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={[styles.bigTitle, { color: colors.text }]}>Transações</Text>

      {/* Busca (server-side, com debounce) */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#EFEFF2' },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Segmented: Tudo / Receitas / Despesas */}
      <View
        style={[
          styles.segmented,
          { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(118,118,128,0.12)' },
        ]}
      >
        {SEGMENTS.map((segment) => {
          const active = typeFilter === segment.key;
          return (
            <TouchableOpacity
              key={segment.key}
              style={[
                styles.segment,
                active && { backgroundColor: isDark ? colors.card : '#FFFFFF' },
              ]}
              onPress={() => selectSegment(segment.key)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: active ? colors.text : colors.textSecondary },
                ]}
              >
                {segment.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error && (
        <View style={[styles.errorContainer, { backgroundColor: colors.dangerLight }]}>
          <IconSymbol name="exclamationmark.triangle" size={16} color={colors.danger} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}
    </View>
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={[styles.sectionHeader, { backgroundColor: sectionHeaderBg }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {section.title}
        </Text>
        <Text
          style={[
            styles.sectionNet,
            { color: section.net >= 0 ? colors.success : colors.textSecondary },
          ]}
        >
          {formatNet(section.net)}
        </Text>
      </View>
    ),
    [colors, sectionHeaderBg, formatNet]
  );

  const renderItem = useCallback(
    ({ item, index, section }: { item: TransactionWithDetails; index: number; section: SectionData }) => (
      <TransactionListItem
        transaction={item}
        onPress={() => handleTransactionPress(item)}
        showDivider={index < section.data.length - 1}
        hideAmount={!isBalanceVisible}
      />
    ),
    [handleTransactionPress, isBalanceVisible]
  );

  const keyExtractor = useCallback((item: TransactionWithDetails) => item.id, []);

  const ListFooterComponent = useCallback(
    () =>
      isLoadingMore ? (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      ) : null,
    [isLoadingMore, colors]
  );

  const ListEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
          <IconSymbol name="doc.text" size={48} color={colors.textSecondary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {isLoading ? 'Carregando...' : 'Nenhuma transação'}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          {isLoading
            ? 'Aguarde enquanto buscamos suas transações'
            : search
              ? 'Nada encontrado para essa busca'
              : typeFilter === 'ALL'
                ? 'Você ainda não tem transações'
                : `Você não tem ${typeFilter === 'RECEITA' ? 'receitas' : 'despesas'}`}
        </Text>
      </View>
    ),
    [isLoading, colors, typeFilter, search]
  );

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
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

      {/* Barra superior fixa (ações em Liquid Glass) */}
      <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
        <ScrollEdgeEffect scrollY={scrollY} />
        <Pressable
          onPress={toggleBalanceVisibility}
          accessibilityRole="button"
          accessibilityLabel={isBalanceVisible ? 'Ocultar valores' : 'Mostrar valores'}
        >
          {({ pressed }) => (
            <View style={pressed && styles.buttonPressed}>
              <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                <IconSymbol
                  name={isBalanceVisible ? 'eye' : 'eye.slash'}
                  size={20}
                  color={colors.text}
                />
              </GlassSurface>
            </View>
          )}
        </Pressable>

        <View style={styles.topBarActions}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/nota-chat');
            }}
            accessibilityRole="button"
            accessibilityLabel="Lançar por nota fiscal"
          >
            {({ pressed }) => (
              <View style={pressed && styles.buttonPressed}>
                <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                  <IconSymbol name="qrcode.viewfinder" size={20} color={colors.text} />
                </GlassSurface>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/new-transaction');
            }}
            accessibilityRole="button"
            accessibilityLabel="Nova transação"
          >
            {({ pressed }) => (
              <View style={pressed && styles.buttonPressed}>
                <GlassSurface variant="glass" isInteractive style={styles.topBarButton}>
                  <IconSymbol name="plus" size={22} color={colors.primary} />
                </GlassSurface>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        onRefresh={refresh}
        refreshing={isRefreshing}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        maxToRenderPerBatch={16}
        windowSize={7}
        removeClippedSubviews
      />

      <AskNorteBar />

      <TransactionDetailModal
        transaction={selectedTransaction}
        visible={isDetailModalVisible}
        onClose={handleCloseDetailModal}
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
    height: 300,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    zIndex: 10,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    transform: [{ scale: 0.92 }],
  },
  headerContainer: {
    paddingHorizontal: Spacing.lg,
  },
  bigTitle: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    paddingVertical: 0,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: Spacing.sm,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  listContent: {
    paddingBottom: 160,
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  sectionNet: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  footerLoading: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing['2xl'],
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
});
