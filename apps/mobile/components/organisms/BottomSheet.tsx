import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.8;

/**
 * Painel que sobe do rodapé (estilo Revolut): backdrop com fade, painel em
 * spring, alça de arrasto funcional (arrastar para baixo fecha) e respiro
 * generoso. Único bottom sheet do app — qualquer conteúdo em sheet deve
 * usar este organism.
 */
export function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // O Modal permanece montado durante a animação de saída
  const [shown, setShown] = useState(visible);
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  // onClose atual para o PanResponder (criado uma única vez)
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const animateIn = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 240,
        mass: 0.9,
      }),
    ]).start();
  }, [backdrop, translateY]);

  const animateOut = useCallback(
    (after?: () => void) => {
      Animated.parallel([
        Animated.timing(backdrop, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: screenHeight,
          duration: 230,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) after?.();
      });
    },
    [backdrop, translateY, screenHeight]
  );

  useEffect(() => {
    if (visible) {
      setShown(true);
      translateY.setValue(screenHeight);
      backdrop.setValue(0);
      requestAnimationFrame(animateIn);
    } else {
      animateOut(() => setShown(false));
    }
  }, [visible, animateIn, animateOut, translateY, backdrop, screenHeight]);

  // Arrastar para baixo na área da alça/cabeçalho fecha o sheet
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) =>
        gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
          // O pai zera `visible`; a saída anima a partir da posição atual
          onCloseRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 260,
          }).start();
        }
      },
    })
  ).current;

  if (!shown) return null;

  return (
    <Modal
      visible={shown}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.sheetBackdrop, { opacity: backdrop }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        {/* Painel em Liquid Glass (camada funcional flutuante); o conteúdo
            interno permanece plano — nunca vidro dentro de vidro */}
        <Animated.View style={{ transform: [{ translateY }] }}>
          <GlassSurface
            variant="glass"
            style={[
              styles.sheetPanel,
              { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.sm },
            ]}
          >
            <View {...panResponder.panHandlers}>
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
                <TouchableOpacity
                  style={[
                    styles.closeChip,
                    {
                      backgroundColor: isDark
                        ? 'rgba(255,255,255,0.10)'
                        : 'rgba(0,0,0,0.06)',
                    },
                  ]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Fechar"
                >
                  <IconSymbol name="xmark" size={15} color={colors.icon} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.sheetBody}>{children}</View>
          </GlassSurface>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetPanel: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing.md,
    maxHeight: '80%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: Spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  sheetTitle: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.md,
  },
  closeChip: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    paddingHorizontal: Spacing.xl,
  },
});
