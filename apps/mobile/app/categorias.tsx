import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { GlassSurface } from '@/components/ui/GlassSurface';
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
  const isDark = colorScheme === 'dark';
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

  const hairlineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)';
  const screenBg = isDark ? colors.background : '#F6F7F9';

  // Cada grupo de categorias vira um cartao "material" (camada de conteudo);
  // itens internos sao planos, conforme a HIG.
  const renderSection = useCallback(
    ({ item }: { item: SectionData }) => (
      <GlassSurface
        variant="material"
        style={[styles.sectionCard, { borderColor: hairlineColor }]}
      >
        <View style={styles.sectionHeader}>
          <View
            style={[styles.parentIcon, { backgroundColor: `${item.parent.color}22` }]}
          >
            <IconSymbol
              name={getCategoryIcon(item.parent.icon)}
              size={18}
              color={item.parent.color}
            />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {item.title}
          </Text>
        </View>
        {item.data.map((child) => (
          <View key={child.id} style={styles.childRow}>
            <View style={[styles.childIcon, { backgroundColor: `${child.color}15` }]}>
              <IconSymbol name={getCategoryIcon(child.icon)} size={16} color={child.color} />
            </View>
            <Text style={[styles.childName, { color: colors.text }]}>{child.name}</Text>
          </View>
        ))}
      </GlassSurface>
    ),
    [colors, hairlineColor]
  );

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      {/* Gradiente ambiente edge-to-edge (camada de conteudo) */}
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

      {/* Header: controles flutuantes em Liquid Glass */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          style={({ pressed }) => pressed && styles.pressedControl}
        >
          <GlassSurface variant="glass" isInteractive style={styles.headerButton}>
            <IconSymbol name="chevron.left" size={20} color={colors.text} />
          </GlassSurface>
        </Pressable>
        <Text
          style={[styles.headerTitle, { color: isDark ? colors.text : '#FFFFFF' }]}
        >
          Categorias
        </Text>
        <View style={styles.headerButton} />
      </View>

      {/* Toggle Despesas / Receitas: capsula de vidro na camada funcional */}
      <GlassSurface variant="glass" style={styles.typeToggle}>
        {(['DESPESA', 'RECEITA'] as const).map((type) => {
          const isActive = activeType === type;
          return (
            <Pressable
              key={type}
              style={({ pressed }) => [
                styles.typeTab,
                isActive && { backgroundColor: colors.primary },
                pressed && styles.pressedTab,
              ]}
              onPress={() => setActiveType(type)}
            >
              <Text
                style={[
                  styles.typeTabText,
                  { color: isActive ? colors.textOnPrimary : colors.text },
                ]}
              >
                {type === 'DESPESA' ? 'Despesas' : 'Receitas'}
              </Text>
            </Pressable>
          );
        })}
      </GlassSurface>

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
        <FlatList
          data={sections}
          keyExtractor={(item) => item.parent.id}
          renderItem={renderSection}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
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
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedControl: {
    transform: [{ scale: 0.92 }],
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  typeToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: BorderRadius.full,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  typeTab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  pressedTab: {
    transform: [{ scale: 0.97 }],
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
    paddingTop: Spacing.sm,
  },
  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
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
    marginLeft: Spacing.xl,
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
