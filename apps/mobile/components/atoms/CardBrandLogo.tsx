import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CreditCardBrand } from '@/types/finance';

// Cores oficiais das marcas
const VISA_BLUE = '#1A1F71';
const MC_RED = '#EB001B';
const MC_ORANGE = '#F79E1B';
const AMEX_BLUE = '#016FD0';
const HIPERCARD_RED = '#B3131B';

interface CardBrandLogoProps {
  brand: CreditCardBrand;
  /** Altura do badge; a largura segue proporcional. */
  size?: number;
}

/**
 * Logo da bandeira do cartão (Atomic Design · átomo), desenhado nativamente
 * com Views/Text nas cores oficiais — sem depender de fonte de ícones nem de
 * assets externos. Cada bandeira vira um badge como o impresso nos cartões:
 * Mastercard com os círculos sobrepostos, Visa/Hipercard como wordmark em
 * badge branco, Amex em bloco azul e Elo em badge preto.
 */
export function CardBrandLogo({ brand, size = 24 }: CardBrandLogoProps) {
  const badge = {
    height: size,
    width: size * 1.8,
    borderRadius: size * 0.2,
  };

  switch (brand) {
    case 'VISA':
      return (
        <View style={[styles.badge, styles.badgeLight, badge]}>
          <Text
            style={[styles.wordmark, styles.italic, { color: VISA_BLUE, fontSize: size * 0.42 }]}
            allowFontScaling={false}
          >
            VISA
          </Text>
        </View>
      );

    case 'MASTERCARD': {
      const circle = size * 0.62;
      return (
        <View style={[styles.badge, styles.badgeLight, badge]}>
          <View style={styles.circlesRow}>
            <View
              style={{
                width: circle,
                height: circle,
                borderRadius: circle / 2,
                backgroundColor: MC_RED,
              }}
            />
            <View
              style={{
                width: circle,
                height: circle,
                borderRadius: circle / 2,
                backgroundColor: MC_ORANGE,
                marginLeft: -circle * 0.38,
                opacity: 0.92,
              }}
            />
          </View>
        </View>
      );
    }

    case 'ELO':
      return (
        <View style={[styles.badge, badge, { backgroundColor: '#000000' }]}>
          <Text
            style={[styles.wordmark, { color: '#FFFFFF', fontSize: size * 0.48 }]}
            allowFontScaling={false}
          >
            elo
          </Text>
        </View>
      );

    case 'AMEX':
      return (
        <View style={[styles.badge, badge, { backgroundColor: AMEX_BLUE }]}>
          <Text
            style={[styles.wordmark, { color: '#FFFFFF', fontSize: size * 0.34, letterSpacing: 1 }]}
            allowFontScaling={false}
          >
            AMEX
          </Text>
        </View>
      );

    case 'HIPERCARD':
      return (
        <View style={[styles.badge, badge, { backgroundColor: HIPERCARD_RED }]}>
          <Text
            style={[styles.wordmark, styles.italic, { color: '#FFFFFF', fontSize: size * 0.3 }]}
            allowFontScaling={false}
          >
            Hipercard
          </Text>
        </View>
      );

    case 'OUTROS':
    default:
      return (
        <View style={[styles.badge, badge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Ionicons name="card" size={size * 0.58} color="#FFFFFF" />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeLight: {
    backgroundColor: '#FFFFFF',
  },
  circlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmark: {
    fontWeight: '800',
  },
  italic: {
    fontStyle: 'italic',
  },
});
