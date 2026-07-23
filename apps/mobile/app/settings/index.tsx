import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { IconSymbol, type IconSymbolName } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from '@/components/molecules/ScreenHeader';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SettingRow {
  id: string;
  label: string;
  description: string;
  icon: IconSymbolName;
  route: Href;
}

const SETTING_ROWS: SettingRow[] = [
  {
    id: 'notifications',
    label: 'Notificacoes',
    description: 'E-mail diario de vencimentos',
    icon: 'bell',
    route: '/settings/notifications',
  },
];

/**
 * Hub de configurações. Lista agrupada em GlassSurface (mesmo padrão da aba
 * "Mais"), extensível para novas seções de configuração.
 */
export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const screenBg = isDark ? colors.background : '#F6F7F9';
  const hairlineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const headerOffset = insets.top + SCREEN_HEADER_HEIGHT + Spacing.md;

  const handlePress = (row: SettingRow) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(row.route);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]} edges={['bottom']}>
      <LinearGradient
        colors={
          isDark ? ['#1D4ED8', '#16233F', colors.background] : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.55, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: headerOffset }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <GlassSurface variant="material" style={[styles.card, { borderColor: hairlineColor }]}>
          {SETTING_ROWS.map((row, index) => (
            <TouchableOpacity
              key={row.id}
              style={[
                styles.row,
                index < SETTING_ROWS.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
              ]}
              onPress={() => handlePress(row)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={row.label}
            >
              <View style={styles.rowLeft}>
                <IconSymbol name={row.icon} size={22} color={colors.text} />
                <View style={styles.rowTexts}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>{row.label}</Text>
                  <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                    {row.description}
                  </Text>
                </View>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.icon} />
            </TouchableOpacity>
          ))}
        </GlassSurface>
      </ScrollView>

      <ScreenHeader title="Configuracoes" scrollY={scrollY} onBack={() => router.back()} />
    </SafeAreaView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  rowDescription: {
    fontSize: FontSize.xs,
  },
});
