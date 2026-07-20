import { type ReactNode } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { useReduceTransparency } from '@/components/atoms/GlassSurface';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type FullScreenOverlayProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Ação opcional no canto superior direito (ex.: escanear nota). */
  headerRight?: ReactNode;
};

/**
 * Casca única dos modais de transação (nova transação e detalhes): overlay
 * de tela cheia estilo Revolut — o conteúdo atrás transparece desfocado
 * (blur) sob uma camada de opacidade escura, com fechar (X) à esquerda e
 * título centralizado. Requer apresentação transparente do modal/rota.
 * Acessibilidade / Android: fallback com fundo sólido (sem blur).
 */
export function FullScreenOverlay({
  title,
  onClose,
  children,
  headerRight,
}: FullScreenOverlayProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const reduceTransparency = useReduceTransparency();
  const solidBackdrop = reduceTransparency || Platform.OS === 'android';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Backdrop: blur do conteúdo de trás + scrim escuro */}
      {solidBackdrop ? (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
          pointerEvents="none"
        />
      ) : (
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,12,20,0.55)' }]}
        pointerEvents="none"
      />

      {/* Header: fechar (X) à esquerda, título centralizado, ação opcional à direita */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerSide}
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel="Fechar"
        >
          <IconSymbol name="xmark" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.headerSide, styles.headerRight]}>{headerRight}</View>
      </View>

      {children}
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerSide: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
});
