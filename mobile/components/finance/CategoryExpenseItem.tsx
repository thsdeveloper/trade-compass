import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { formatCurrency, type ExpensesByCategory } from '@/types/finance';

interface CategoryExpenseItemProps {
  item: ExpensesByCategory;
}

// Map Lucide icon names to SF Symbols
const CATEGORY_ICON_MAP: Record<string, IconSymbolName> = {
  // Financas
  'Wallet': 'wallet.pass.fill',
  'CreditCard': 'creditcard.fill',
  'Banknote': 'banknote.fill',
  'DollarSign': 'dollarsign.circle.fill',
  'PiggyBank': 'banknote.fill',
  'TrendingUp': 'chart.line.uptrend.xyaxis',
  'TrendingDown': 'chart.line.downtrend.xyaxis',
  'Receipt': 'doc.text.fill',
  'Landmark': 'building.columns.fill',
  // Casa
  'Home': 'house.fill',
  'Building': 'building.columns.fill',
  'Lightbulb': 'bolt.fill',
  'Plug': 'bolt.fill',
  'Flame': 'bolt.fill',
  'Droplets': 'drop.fill',
  // Alimentacao
  'ShoppingCart': 'cart.fill',
  'Utensils': 'fork.knife',
  'Coffee': 'cup.and.saucer.fill',
  'Pizza': 'fork.knife',
  'Apple': 'fork.knife',
  // Transporte
  'Car': 'car.fill',
  'CarFront': 'car.fill',
  'Bus': 'bus',
  'Train': 'tram.fill',
  'Plane': 'airplane',
  'Bike': 'bicycle',
  'Fuel': 'fuelpump.fill',
  // Saude
  'Heart': 'heart.fill',
  'HeartPulse': 'heart.fill',
  'Pill': 'pills.fill',
  'Stethoscope': 'stethoscope',
  'Dumbbell': 'dumbbell.fill',
  'Hospital': 'cross.fill',
  // Entretenimento
  'Gamepad2': 'gamecontroller.fill',
  'Music': 'music.note',
  'Tv': 'tv.fill',
  'Film': 'film',
  'Camera': 'camera.fill',
  'Gift': 'gift.fill',
  // Educacao
  'GraduationCap': 'graduationcap.fill',
  'BookOpen': 'book.fill',
  'Book': 'book.fill',
  // Compras
  'Shirt': 'tshirt.fill',
  'ShoppingBag': 'bag.fill',
  'Store': 'storefront.fill',
  'Tag': 'tag.fill',
  // Trabalho
  'Briefcase': 'briefcase.fill',
  'Users': 'person.2.fill',
  'Monitor': 'desktopcomputer',
  'Laptop': 'laptopcomputer',
  'Phone': 'phone.fill',
  'Mail': 'envelope.fill',
  'Calendar': 'calendar',
  // Tecnologia
  'Wifi': 'wifi',
  'Smartphone': 'iphone',
  'Globe': 'globe',
  'Zap': 'bolt.fill',
  // Servicos
  'Wrench': 'wrench.and.screwdriver.fill',
  'Settings': 'gearshape.fill',
  'Scissors': 'scissors',
  'Bell': 'bell.fill',
  // Viagem
  'Hotel': 'bed.double.fill',
  'Map': 'map.fill',
  'Luggage': 'suitcase.fill',
  // Pets
  'Dog': 'pawprint.fill',
  'Cat': 'pawprint.fill',
  'Leaf': 'leaf.fill',
  // Default
  'default': 'circle.fill',
};

function getCategoryIcon(iconName: string): IconSymbolName {
  return CATEGORY_ICON_MAP[iconName] || CATEGORY_ICON_MAP['default'];
}

export function CategoryExpenseItem({ item }: CategoryExpenseItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const categoryIconName = getCategoryIcon(item.category_icon);
  const categoryBgColor = item.category_color + (isDark ? '30' : '15');

  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: categoryBgColor },
          ]}
        >
          <IconSymbol
            name={categoryIconName}
            size={18}
            color={item.category_color}
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
                { backgroundColor: colors.border },
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
        <Text style={[styles.percentage, { color: colors.textSecondary }]}>
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
    paddingVertical: Spacing.md,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    marginBottom: Spacing.xs,
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
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  percentage: {
    fontSize: FontSize.xs,
  },
});
