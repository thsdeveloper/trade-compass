import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatCurrency, type ExpensesByCategory } from '@/types/finance';

interface CategoryExpenseItemProps {
  item: ExpensesByCategory;
}

export function CategoryExpenseItem({ item }: CategoryExpenseItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: item.category_color + '20' },
          ]}
        >
          <View
            style={[styles.colorDot, { backgroundColor: item.category_color }]}
          />
        </View>
        <View style={styles.textContent}>
          <Text
            style={[styles.categoryName, { color: colors.text }]}
            numberOfLines={1}
          >
            {item.category_name}
          </Text>
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBackground,
                { backgroundColor: isDark ? '#374151' : '#e5e7eb' },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: item.category_color,
                    width: `${Math.min(item.percentage, 100)}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
      <View style={styles.rightContent}>
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(item.total)}
        </Text>
        <Text style={[styles.percentage, { color: colors.icon }]}>
          {item.percentage.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  textContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  progressContainer: {
    width: '100%',
  },
  progressBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  rightContent: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  percentage: {
    fontSize: 12,
  },
});
