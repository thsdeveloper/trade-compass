import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { useReduceTransparency } from '@/components/atoms/GlassSurface';
import { FontSize, FontWeight, Spacing } from '@/constants/theme';

// Paleta "IA": cyan → azul → violeta. Feixe de scan e halos usam esta gama.
const AI_CYAN = '#22D3EE';
const AI_BLUE = '#3B82F6';
const AI_VIOLET = '#8B5CF6';

const RECEIPT_W = 128;
const RECEIPT_H = 156;
const BEAM_H = 40;

// Mensagens que trocam como se a IA estivesse "pensando".
const MESSAGES = [
  'Lendo sua nota…',
  'Identificando os itens…',
  'Organizando os dados…',
  'Quase lá…',
];

// Larguras das "linhas" fantasma da nota (aparência de recibo).
const FAKE_LINES = [0.85, 0.62, 0.72, 0.5, 0.68, 0.44];

type ReceiptScanningLoaderProps = {
  visible: boolean;
};

/**
 * Loader premium da leitura de nota por IA: uma nota fiscal estilizada
 * varrida por um feixe de luz (gradiente cyan→violeta), sparkles pulsando e
 * mensagens que trocam como um raciocínio de IA. Overlay auto-contido.
 */
export function ReceiptScanningLoader({ visible }: ReceiptScanningLoaderProps) {
  const beam = useRef(new Animated.Value(0)).current;
  const sparkleA = useRef(new Animated.Value(0)).current;
  const sparkleB = useRef(new Animated.Value(0)).current;
  const sparkleC = useRef(new Animated.Value(0)).current;
  const haloPulse = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(1)).current;
  const [msgIndex, setMsgIndex] = useState(0);

  const reduceTransparency = useReduceTransparency();
  const solidBackdrop = reduceTransparency || Platform.OS === 'android';

  // Loops de animação (feixe, sparkles, halo)
  useEffect(() => {
    if (!visible) return;

    const beamLoop = Animated.loop(
      Animated.timing(beam, {
        toValue: 1,
        duration: 1900,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );

    const pulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 650,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      );

    const halo = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloPulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const animations = [
      beamLoop,
      pulse(sparkleA, 0),
      pulse(sparkleB, 300),
      pulse(sparkleC, 550),
      halo,
    ];
    animations.forEach((a) => a.start());

    return () => {
      animations.forEach((a) => a.stop());
      beam.setValue(0);
      haloPulse.setValue(0);
    };
  }, [visible, beam, sparkleA, sparkleB, sparkleC, haloPulse]);

  // Troca das mensagens com fade
  useEffect(() => {
    if (!visible) return;
    setMsgIndex(0);
    const id = setInterval(() => {
      Animated.sequence([
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 1600);
    return () => clearInterval(id);
  }, [visible, textOpacity]);

  if (!visible) return null;

  // Feixe desce e sobe numa passada (aparência de varredura)
  const beamTranslate = beam.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, RECEIPT_H - BEAM_H, 0],
  });
  const beamOpacity = beam.interpolate({
    inputRange: [0, 0.08, 0.5, 0.92, 1],
    outputRange: [0, 1, 1, 1, 0],
  });

  const sparkleStyle = (value: Animated.Value) => ({
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
    transform: [
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) },
    ],
  });

  const haloStyle = {
    opacity: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] }),
    transform: [
      { scale: haloPulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) },
    ],
  };

  return (
    <View style={styles.overlay} pointerEvents="auto">
      {solidBackdrop ? (
        <View style={[StyleSheet.absoluteFill, styles.solidBackdrop]} pointerEvents="none" />
      ) : (
        <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      )}
      <View style={[StyleSheet.absoluteFill, styles.scrim]} pointerEvents="none" />

      <View style={styles.stage}>
        {/* Halo colorido pulsando atrás da nota (aura de IA) */}
        <Animated.View style={[styles.halo, haloStyle]} pointerEvents="none">
          <LinearGradient
            colors={[`${AI_VIOLET}00`, `${AI_BLUE}55`, `${AI_CYAN}00`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        {/* Nota fiscal estilizada */}
        <View style={styles.receipt}>
          {FAKE_LINES.map((w, i) => (
            <View
              key={i}
              style={[styles.fakeLine, { width: `${Math.round(w * 100)}%` }]}
            />
          ))}

          {/* Feixe de varredura */}
          <Animated.View
            style={[
              styles.beam,
              { opacity: beamOpacity, transform: [{ translateY: beamTranslate }] },
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={[`${AI_CYAN}00`, `${AI_CYAN}40`, AI_CYAN, `${AI_CYAN}40`, `${AI_CYAN}00`]}
              locations={[0, 0.35, 0.5, 0.65, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.beamLine} />
          </Animated.View>
        </View>

        {/* Sparkles: identidade de IA */}
        <Animated.View style={[styles.sparkle, styles.sparkleTop, sparkleStyle(sparkleA)]}>
          <Ionicons name="sparkles" size={22} color={AI_CYAN} />
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkleRight, sparkleStyle(sparkleB)]}>
          <Ionicons name="sparkles" size={15} color={AI_VIOLET} />
        </Animated.View>
        <Animated.View style={[styles.sparkle, styles.sparkleBottom, sparkleStyle(sparkleC)]}>
          <Ionicons name="sparkles" size={18} color={AI_BLUE} />
        </Animated.View>
      </View>

      {/* Rótulo IA + mensagem que troca */}
      <View style={styles.badgeRow}>
        <Ionicons name="sparkles" size={13} color={AI_CYAN} />
        <Text style={styles.badgeText}>Norte IA</Text>
      </View>
      <Animated.Text style={[styles.message, { opacity: textOpacity }]}>
        {MESSAGES[msgIndex]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidBackdrop: {
    backgroundColor: '#0A0C14',
  },
  scrim: {
    backgroundColor: 'rgba(8,10,18,0.72)',
  },
  stage: {
    width: RECEIPT_W + 72,
    height: RECEIPT_H + 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: RECEIPT_W + 64,
    height: RECEIPT_H + 64,
    borderRadius: 999,
    overflow: 'hidden',
  },
  receipt: {
    width: RECEIPT_W,
    height: RECEIPT_H,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 16,
    paddingTop: 22,
    gap: 12,
    overflow: 'hidden',
    // Glow suave
    shadowColor: AI_CYAN,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  fakeLine: {
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(17,20,32,0.14)',
  },
  beam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: BEAM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beamLine: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: 2,
    borderRadius: 2,
    backgroundColor: AI_CYAN,
    shadowColor: AI_CYAN,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  sparkle: {
    position: 'absolute',
  },
  sparkleTop: {
    top: 6,
    left: 14,
  },
  sparkleRight: {
    top: 40,
    right: 18,
  },
  sparkleBottom: {
    bottom: 14,
    left: 24,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  badgeText: {
    color: '#E6E9F2',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  message: {
    marginTop: Spacing.md,
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
