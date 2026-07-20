import { type PropsWithChildren, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Reexporta o botão do design system; as telas de onboarding o importam daqui.
export { Button } from '@/components/atoms/Button';

type OnboardingShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Conteúdo fixado acima do teclado (normalmente o botão primário) */
  footer?: ReactNode;
  showBack?: boolean;
  /** Ação no canto superior direito, ex.: "Pular" */
  headerRight?: ReactNode;
}>;

/**
 * Casca padrão das telas de onboarding: gradiente hero edge-to-edge,
 * chevron de voltar, título grande à esquerda e rodapé fixo — mesma
 * anatomia de tela do restante do app (camada de conteúdo sob controles).
 */
export function OnboardingShell({
  title,
  subtitle,
  footer,
  showBack = true,
  headerRight,
  children,
}: OnboardingShellProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const { height } = useWindowDimensions();

  const screenBg = isDark ? colors.background : '#F6F7F9';

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={
          isDark
            ? ['#1D4ED8', '#16233F', colors.background]
            : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.55, 1]}
        style={[styles.ambientBackground, { height: height * 0.6 }]}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          {showBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              hitSlop={12}
              accessibilityLabel="Voltar"
            >
              <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          {headerRight}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.content}>{children}</View>
        </View>

        {footer ? (
          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
            ]}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.md,
  },
  title: {
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.md,
    lineHeight: 22,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: Spacing['2xl'],
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.md,
  },
});
