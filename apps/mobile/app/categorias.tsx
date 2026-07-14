import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getCategoryIcon } from '@/components/finance/TransactionListItem';
import { getGlobalCategories } from '@/lib/finance-api';
import type {
  GlobalCategory,
  GlobalCategoryType,
  GlobalCategoryWithChildren,
} from '@/types/finance';

interface SectionData {
  parent: GlobalCategoryWithChildren;
  title: string;
  data: GlobalCategory[];
}

export default function CategoriasScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [categories, setCategories] = useState<GlobalCategoryWithChildren[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<GlobalCategoryType>('DESPESA');

  const loadCategories = useCallback(async () => {
    try {
      setError(null);
      const data = await getGlobalCategories();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar categorias');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const sections: SectionData[] = useMemo(
    () =>
      categories
        .filter((c) => c.type === activeType)
        .map((parent) => ({
          parent,
          title: parent.name,
          data: parent.children,
        })),
    [categories, activeType]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
        <View
          style={[styles.parentIcon, { backgroundColor: `${section.parent.color}22` }]}
        >
          <IconSymbol
            name={getCategoryIcon(section.parent.icon)}
            size={18}
            color={section.parent.color}
          />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {section.title}
        </Text>
      </View>
    ),
    [colors]
  );

  const renderItem = useCallback(
    ({ item }: { item: GlobalCategory }) => (
      <View style={styles.childRow}>
        <View style={[styles.childIcon, { backgroundColor: `${item.color}15` }]}>
          <IconSymbol name={getCategoryIcon(item.icon)} size={16} color={item.color} />
        </View>
        <Text style={[styles.childName, { color: colors.text }]}>{item.name}</Text>
      </View>
    ),
    [colors]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
        >
          <IconSymbol name="chevron.left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Categorias</Text>
        <View style={styles.headerButton} />
      </View>

      {/* Toggle Despesas / Receitas */}
      <View style={[styles.typeToggle, { backgroundColor: colors.card }]}>
        {(['DESPESA', 'RECEITA'] as const).map((type) => {
          const isActive = activeType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.typeTab, isActive && { backgroundColor: colors.primary }]}
              onPress={() => setActiveType(type)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.typeTabText,
                  { color: isActive ? colors.textOnPrimary : colors.textSecondary },
                ]}
              >
                {type === 'DESPESA' ? 'Despesas' : 'Receitas'}
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

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  typeToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  typeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  typeTabText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  parentIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginLeft: Spacing['2xl'],
  },
  childIcon: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: FontSize.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
});
