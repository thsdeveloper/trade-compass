import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface MonthSliderProps {
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
}

interface MonthItem {
  date: Date;
  label: string;
  isSelected: boolean;
  isCurrent: boolean;
}

const ITEM_WIDTH = 100;
const ITEM_MARGIN = 4;
const SLOT_WIDTH = ITEM_WIDTH + ITEM_MARGIN * 2;

function getMonthLabel(date: Date): string {
  const month = date.toLocaleDateString('pt-BR', { month: 'long' });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

function generateMonths(selectedDate: Date): MonthItem[] {
  const months: MonthItem[] = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Generate 12 months: 6 before and 5 after current month
  for (let i = -6; i <= 5; i++) {
    const date = new Date(currentYear, currentMonth + i, 1);
    const isSelected =
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
    const isCurrent =
      date.getMonth() === currentMonth &&
      date.getFullYear() === currentYear;

    months.push({
      date,
      label: getMonthLabel(date),
      isSelected,
      isCurrent,
    });
  }

  return months;
}

/**
 * Seletor de mês em pills (padrão Revolut): sem setas — o usuário toca no
 * mês e ele desliza animado para o centro. O padding lateral dinâmico
 * garante que até o primeiro/último mês da janela centralize.
 */
export function MonthSlider({ selectedDate, onMonthChange }: MonthSliderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scrollViewRef = useRef<ScrollView>(null);
  const hasCenteredRef = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const months = generateMonths(selectedDate);
  const selectedIndex = months.findIndex((m) => m.isSelected);

  // Padding lateral que permite centralizar os itens das extremidades
  const sidePadding = Math.max(0, (containerWidth - SLOT_WIDTH) / 2);

  // Mantém o mês selecionado no centro: sem animação na montagem,
  // com deslize suave a cada troca.
  useEffect(() => {
    if (!scrollViewRef.current || selectedIndex < 0 || containerWidth === 0) {
      return;
    }
    const x = selectedIndex * SLOT_WIDTH;
    const animated = hasCenteredRef.current;
    // No primeiro layout o scrollTo imediato pode disputar com a medição;
    // o microdelay garante o posicionamento correto.
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollTo({ x, animated });
      hasCenteredRef.current = true;
    }, animated ? 0 : 50);
    return () => clearTimeout(timer);
  }, [selectedIndex, containerWidth]);

  const handleMonthPress = useCallback(
    (item: MonthItem) => {
      if (item.isSelected) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onMonthChange(item.date);
    },
    [onMonthChange]
  );

  return (
    <View style={styles.container}>
      {/* Track em Liquid Glass (camada de controles); pills planas dentro —
          nunca vidro dentro de vidro */}
      <GlassSurface variant="glass" style={styles.track}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: sidePadding }}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
          snapToInterval={SLOT_WIDTH}
          decelerationRate="fast"
        >
        {months.map((item) => {
          const backgroundColor = item.isSelected
            ? colors.primary
            : 'transparent';
          const textColor = item.isSelected
            ? colors.textOnPrimary
            : item.isCurrent
              ? colors.primary
              : colors.textSecondary;
          const fontWeight = item.isSelected || item.isCurrent ? '600' : '400';

          return (
            <TouchableOpacity
              key={`${item.date.getFullYear()}-${item.date.getMonth()}`}
              style={[styles.monthItem, { backgroundColor }]}
              onPress={() => handleMonthPress(item)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: item.isSelected }}
              accessibilityLabel={`${item.label} de ${item.date.getFullYear()}`}
            >
              <Text
                style={[
                  styles.monthText,
                  { color: textColor, fontWeight: fontWeight as '400' | '600' },
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
              {item.isCurrent && !item.isSelected && (
                <View style={[styles.currentDot, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
        </ScrollView>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  track: {
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.xs,
  },
  monthItem: {
    width: ITEM_WIDTH,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: ITEM_MARGIN,
  },
  monthText: {
    fontSize: FontSize.sm,
  },
  currentDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
