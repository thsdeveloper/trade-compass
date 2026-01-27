import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { IconSymbol } from '@/components/ui/icon-symbol';
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

export function MonthSlider({ selectedDate, onMonthChange }: MonthSliderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scrollViewRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);

  const months = generateMonths(selectedDate);
  const selectedIndex = months.findIndex((m) => m.isSelected);

  // Scroll to selected month only on initial mount
  useEffect(() => {
    if (scrollViewRef.current && selectedIndex >= 0 && !hasScrolledRef.current) {
      hasScrolledRef.current = true;
      const scrollPosition = selectedIndex * (ITEM_WIDTH + ITEM_MARGIN * 2) - 50;
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: Math.max(0, scrollPosition),
          animated: false,
        });
      }, 50);
    }
  }, []);

  const handleMonthPress = useCallback(
    (item: MonthItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onMonthChange(item.date);
    },
    [onMonthChange]
  );

  const handlePrevious = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  }, [selectedDate, onMonthChange]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  }, [selectedDate, onMonthChange]);

  return (
    <View style={styles.container}>
      {/* Left Arrow */}
      <TouchableOpacity
        style={[styles.arrowButton, { backgroundColor: colors.card }]}
        onPress={handlePrevious}
        activeOpacity={0.7}
      >
        <IconSymbol name="chevron.left" size={18} color={colors.text} />
      </TouchableOpacity>

      {/* Month List */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        style={styles.scrollView}
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

      {/* Right Arrow */}
      <TouchableOpacity
        style={[styles.arrowButton, { backgroundColor: colors.card }]}
        onPress={handleNext}
        activeOpacity={0.7}
      >
        <IconSymbol name="chevron.right" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.xs,
  },
  monthItem: {
    minWidth: ITEM_WIDTH,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: ITEM_MARGIN,
    paddingHorizontal: Spacing.md,
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
