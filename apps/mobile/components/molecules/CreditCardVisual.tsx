import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { MoneyText } from '@/components/atoms/MoneyText';
import { CardBrandLogo } from '@/components/atoms/CardBrandLogo';
import { BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { contrastingTextColor } from '@/lib/color-contrast';
import type { CreditCardBrand } from '@/types/finance';

/** Proporção do cartão físico (ISO/IEC 7810 ID-1: 85,60 × 53,98 mm). */
export const CARD_ASPECT_RATIO = 85.6 / 53.98;

/** Escurece um hex (#rrggbb) para o gradiente do cartão ter profundidade. */
function shade(hex: string, factor: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const channel = (offset: number) =>
    Math.round(((value >> offset) & 0xff) * factor);
  return `#${[16, 8, 0]
    .map((offset) => channel(offset).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Chip EMV dourado, para o cartão parecer um cartão de verdade. */
function EmvChip() {
  return (
    <LinearGradient
      colors={['#EBCB7B', '#C9992F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.chip}
    >
      <View style={styles.chipLine} />
      <View style={styles.chipLine} />
    </LinearGradient>
  );
}

interface CreditCardVisualProps {
  name: string;
  brand: CreditCardBrand;
  color: string;
  totalLimit: number;
  availableLimit: number;
  /** Dias de fechamento/vencimento; omitidos no preview enquanto inválidos. */
  closingDay?: number;
  dueDay?: number;
  /** Oculta os valores monetários (modo privacidade). */
  hideValues?: boolean;
}

/**
 * Representação visual de um cartão de crédito (molécula) no formato de um
 * cartão físico de verdade: proporção ISO ID-1, chip EMV, gradiente na cor
 * escolhida e logo da bandeira. A mesma peça serve ao carrossel da tela de
 * cartões e ao preview do formulário.
 */
export function CreditCardVisual({
  name,
  brand,
  color,
  totalLimit,
  availableLimit,
  closingDay,
  dueDay,
  hideValues = false,
}: CreditCardVisualProps) {
  const textColor = contrastingTextColor(color);
  const mutedColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.55)';
  const trackColor = textColor === '#FFFFFF' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)';

  const used = Math.max(0, totalLimit - availableLimit);
  const usedPercent = totalLimit > 0 ? Math.min(100, (used / totalLimit) * 100) : 0;

  return (
    <LinearGradient
      colors={[color, shade(color, 0.72)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      {/* Topo: nome do cartão + chip EMV */}
      <View style={styles.topRow}>
        <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
          {name || 'Meu cartão'}
        </Text>
        <EmvChip />
      </View>

      {/* Base: limite, barra de uso, dados da fatura e bandeira */}
      <View style={styles.bottomBlock}>
        <Text style={[styles.limitLabel, { color: mutedColor }]}>
          Limite disponível
        </Text>
        <MoneyText
          value={availableLimit}
          hidden={hideValues}
          style={[styles.limitValue, { color: textColor }]}
        />

        <View style={[styles.usageTrack, { backgroundColor: trackColor }]}>
          <View
            style={[
              styles.usageFill,
              { backgroundColor: textColor, width: `${usedPercent}%` },
            ]}
          />
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerInfo}>
            <Text style={[styles.footerText, { color: mutedColor }]} numberOfLines={1}>
              {hideValues
                ? `${usedPercent.toFixed(0)}% do limite usado`
                : `Usado ${formatShort(used)} de ${formatShort(totalLimit)}`}
            </Text>
            {closingDay && dueDay ? (
              <Text style={[styles.footerText, { color: mutedColor }]} numberOfLines={1}>
                Fecha dia {closingDay} · Vence dia {dueDay}
              </Text>
            ) : null}
          </View>
          <CardBrandLogo brand={brand} size={28} />
        </View>
      </View>
    </LinearGradient>
  );
}

/** R$ compacto para as linhas de apoio (a hierarquia fica no limite). */
function formatShort(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  name: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  chip: {
    width: 38,
    height: 28,
    borderRadius: 6,
    justifyContent: 'space-evenly',
    paddingHorizontal: 5,
  },
  chipLine: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: 1,
  },
  bottomBlock: {
    gap: Spacing.sm,
  },
  limitLabel: {
    fontSize: FontSize.sm,
    marginBottom: -Spacing.sm + 2,
  },
  limitValue: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  usageTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  footerInfo: {
    flex: 1,
    gap: 2,
  },
  footerText: {
    fontSize: FontSize.xs,
  },
});
