import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/templates/OnboardingShell';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Slide = {
  id: string;
  headline: string;
  tagline: string;
  /** Foto de fundo do slide; o tint do gradiente é aplicado por cima */
  image: number;
  gradientDark: [string, string];
  gradientLight: [string, string];
};

const HERO_IMAGE = require('@/assets/images/onboarding/welcome-hero.jpg');
const SPENDING_IMAGE = require('@/assets/images/onboarding/welcome-spending.jpg');
const INVEST_IMAGE = require('@/assets/images/onboarding/welcome-invest.jpg');
const NORTE_IMAGE = require('@/assets/images/onboarding/welcome-norte.jpg');

const SLIDES: Slide[] = [
  {
    id: 'brand',
    image: HERO_IMAGE,
    headline: 'Seu dinheiro,\ncom direção.',
    tagline:
      'Contas, orçamento e investimentos em um só lugar — com um assistente que trabalha por você.',
    gradientDark: ['#1D4ED8', '#16233F'],
    gradientLight: ['#0066FF', '#7FB0FF'],
  },
  {
    id: 'spending',
    image: SPENDING_IMAGE,
    headline: 'Gastos sob controle,\nsem esforço.',
    tagline:
      'Registre transações em segundos e acompanhe seu orçamento mês a mês, categoria por categoria.',
    gradientDark: ['#047857', '#12362B'],
    gradientLight: ['#00A651', '#6FCF9C'],
  },
  {
    id: 'invest',
    image: INVEST_IMAGE,
    headline: 'Seus investimentos,\nde perto.',
    tagline:
      'Ações, renda fixa e cripto acompanhados com sinais e análises no seu bolso.',
    gradientDark: ['#6D28D9', '#2A1B4F'],
    gradientLight: ['#7C3AED', '#B39DF0'],
  },
  {
    id: 'norte',
    image: NORTE_IMAGE,
    headline: 'Norte, seu copiloto\nfinanceiro.',
    tagline:
      'Fotografe uma nota, faça uma pergunta, peça um relatório. O Norte cuida do resto.',
    gradientDark: ['#C2410C', '#3F2214'],
    gradientLight: ['#F97316', '#F9B278'],
  },
];

const SLIDE_DURATION_MS = 5000;
const CROSSFADE_MS = 450;

/**
 * Porta de entrada do app: hero estilo stories — slides com avanço
 * automático e por toque (direita avança, esquerda volta), trocando
 * headline, ícone e gradiente de fundo em conjunto.
 */
export default function WelcomeScreen() {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];
  const { width, height } = useWindowDimensions();

  const progress = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const bgOpacities = useRef(
    SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
  ).current;

  const screenBg = isDark ? colors.background : '#F6F7F9';
  const slide = SLIDES[index];

  useEffect(() => {
    // Crossfade dos fundos e fade-in do conteúdo do slide atual
    Animated.parallel(
      bgOpacities.map((opacity, i) =>
        Animated.timing(opacity, {
          toValue: i === index ? 1 : 0,
          duration: CROSSFADE_MS,
          useNativeDriver: true,
        })
      )
    ).start();

    contentOpacity.setValue(0);
    Animated.timing(contentOpacity, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Barra de progresso do slide atual; ao completar, avança sozinho
    progress.setValue(0);
    const timer = Animated.timing(progress, {
      toValue: 1,
      duration: SLIDE_DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    timer.start(({ finished }) => {
      if (finished) {
        setIndex((current) => (current + 1) % SLIDES.length);
      }
    });

    return () => timer.stop();
  }, [index, bgOpacities, contentOpacity, progress]);

  const handleTap = (event: GestureResponderEvent) => {
    const tappedLeftThird = event.nativeEvent.locationX < width * 0.3;
    setIndex((current) =>
      tappedLeftThird
        ? (current - 1 + SLIDES.length) % SLIDES.length
        : (current + 1) % SLIDES.length
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      <StatusBar style="light" />

      {SLIDES.map((s, i) => (
        <Animated.View
          key={s.id}
          style={[
            styles.ambientBackground,
            { height: height * 0.75, opacity: bgOpacities[i] },
          ]}
          pointerEvents="none"
        >
          <Image
            source={s.image}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
          />
          {/* Tint do slide sobre a foto; base fecha opaca no bg da tela */}
          <LinearGradient
            colors={
              isDark
                ? [`${s.gradientDark[0]}B3`, `${s.gradientDark[1]}D9`, screenBg]
                : [`${s.gradientLight[0]}A6`, `${s.gradientLight[1]}BF`, screenBg]
            }
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ))}

      <Pressable style={styles.hero} onPress={handleTap}>
        <View style={[styles.progressRow, { marginTop: insets.top + Spacing.sm }]}>
          {SLIDES.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < index
                        ? '100%'
                        : i > index
                          ? '0%'
                          : progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <Animated.View style={[styles.slideContent, { opacity: contentOpacity }]}>
          <Text style={styles.headline}>{slide.headline}</Text>
          <Text style={styles.tagline}>{slide.tagline}</Text>
        </Animated.View>
      </Pressable>

      <View
        style={[
          styles.actions,
          { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
        ]}
      >
        <Button
          label="Criar conta"
          onPress={() => router.push('/auth/signup' as never)}
        />
        <Button
          variant="secondary"
          label="Já tenho conta"
          onPress={() => router.push('/auth/login' as never)}
        />
      </View>
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
  },
  hero: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
  },
  progressRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing['4xl'],
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  slideContent: {
    flex: 1,
  },
  headline: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    marginBottom: Spacing.lg,
  },
  tagline: {
    fontSize: FontSize.lg,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.85)',
  },
  actions: {
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.sm,
  },
});
