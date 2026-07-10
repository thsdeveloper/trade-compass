import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import type { TransactionWithDetails } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

interface TransactionListItemProps {
  transaction: TransactionWithDetails;
  onPress?: () => void;
  showDivider?: boolean;
}

// Map Lucide icon names to SF Symbols (matching frontend CategoryIcon)
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
  'Coins': 'dollarsign.circle.fill',
  'HandCoins': 'dollarsign.circle.fill',
  // Casa & Moradia
  'Home': 'house.fill',
  'Building': 'building.columns.fill',
  'Building2': 'building.columns.fill',
  'Key': 'key.fill',
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
  'Cake': 'fork.knife',
  'UtensilsCrossed': 'fork.knife',
  // Transporte
  'Car': 'car.fill',
  'CarFront': 'car.fill',
  'Bus': 'bus',
  'Train': 'tram.fill',
  'Plane': 'airplane',
  'Bike': 'bicycle',
  'Fuel': 'fuelpump.fill',
  'MapPin': 'mappin.and.ellipse',
  'Navigation': 'location.fill',
  'Truck': 'truck.box.fill',
  // Saude
  'Heart': 'heart.fill',
  'HeartPulse': 'heart.fill',
  'Pill': 'pills.fill',
  'Stethoscope': 'stethoscope',
  'Activity': 'heart.fill',
  'Hospital': 'cross.fill',
  'Cross': 'cross.fill',
  'Dumbbell': 'dumbbell.fill',
  'PersonStanding': 'figure.stand',
  // Entretenimento & Lazer
  'Gamepad2': 'gamecontroller.fill',
  'Music': 'music.note',
  'Music2': 'music.note',
  'Headphones': 'headphones',
  'Tv': 'tv.fill',
  'Film': 'film',
  'Camera': 'camera.fill',
  'Gift': 'gift.fill',
  'PartyPopper': 'sparkles',
  'Sparkles': 'sparkles',
  // Educacao
  'GraduationCap': 'graduationcap.fill',
  'BookOpen': 'book.fill',
  'Book': 'book.fill',
  'Library': 'books.vertical.fill',
  'Notebook': 'book.fill',
  'FileText': 'doc.text.fill',
  'Award': 'star.fill',
  'Medal': 'star.fill',
  'Brain': 'brain.head.profile',
  // Vestuario & Compras
  'Shirt': 'tshirt.fill',
  'ShoppingBag': 'bag.fill',
  'Store': 'storefront.fill',
  'Package': 'shippingbox.fill',
  'Tag': 'tag.fill',
  'Tags': 'tag.fill',
  'Gem': 'star.fill',
  'Watch': 'clock.fill',
  'Glasses': 'eyeglasses',
  'Umbrella': 'umbrella.fill',
  // Trabalho & Negocios
  'Briefcase': 'briefcase.fill',
  'Users': 'person.2.fill',
  'UserCircle': 'person.circle.fill',
  'Monitor': 'desktopcomputer',
  'Laptop': 'laptopcomputer',
  'Printer': 'printer.fill',
  'Phone': 'phone.fill',
  'Mail': 'envelope.fill',
  'Send': 'paperplane.fill',
  'Calendar': 'calendar',
  'Clock': 'clock.fill',
  'Timer': 'timer',
  // Tecnologia
  'Code': 'chevron.left.forwardslash.chevron.right',
  'Wifi': 'wifi',
  'Smartphone': 'iphone',
  'Tablet': 'ipad',
  'Globe': 'globe',
  'Cloud': 'cloud.fill',
  'Zap': 'bolt.fill',
  // Servicos & Utilidades
  'Wrench': 'wrench.and.screwdriver.fill',
  'Settings': 'gearshape.fill',
  'Hammer': 'hammer.fill',
  'Scissors': 'scissors',
  'Shield': 'shield.fill',
  'Lock': 'lock.fill',
  'Bell': 'bell.fill',
  // Viagem
  'Hotel': 'bed.double.fill',
  'Map': 'map.fill',
  'Compass': 'safari.fill',
  'Mountain': 'mountain.2.fill',
  'Tent': 'tent.fill',
  'Luggage': 'suitcase.fill',
  'Sun': 'sun.max.fill',
  'Moon': 'moon.fill',
  // Pets & Natureza
  'Dog': 'pawprint.fill',
  'Cat': 'pawprint.fill',
  'Bird': 'bird.fill',
  'Fish': 'fish.fill',
  'Leaf': 'leaf.fill',
  'Flower': 'camera.macro',
  // Comunicacao
  'MessageCircle': 'message.fill',
  'MessageSquare': 'message.fill',
  'AtSign': 'at',
  'Link': 'link',
  // Status
  'AlertCircle': 'exclamationmark.circle.fill',
  'AlertTriangle': 'exclamationmark.triangle.fill',
  'CheckCircle': 'checkmark.circle.fill',
  'Star': 'star.fill',
  'Bookmark': 'bookmark.fill',
  'Flag': 'flag.fill',
  'Target': 'target',
  // Outros
  'MoreHorizontal': 'ellipsis',
  'Box': 'shippingbox.fill',
  'Archive': 'archivebox.fill',
  'Folder': 'folder.fill',
  'Trash2': 'trash.fill',
  'Recycle': 'arrow.triangle.2.circlepath',
  'RefreshCw': 'arrow.clockwise',
  // Default
  'default': 'tag.fill',
};

function getCategoryIcon(iconName: string): IconSymbolName {
  return CATEGORY_ICON_MAP[iconName] || CATEGORY_ICON_MAP['default'];
}

export function TransactionListItem({ transaction, onPress, showDivider = true }: TransactionListItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const isIncome = transaction.type === 'RECEITA';
  const amountColor = isIncome ? colors.success : colors.text;
  const amountPrefix = isIncome ? '+ ' : '';

  const categoryIconName = getCategoryIcon(transaction.category.icon);
  const iconColor = isIncome ? colors.success : colors.textSecondary;
  const iconBgColor = isIncome
    ? (isDark ? colors.success + '20' : '#E6F7EF')
    : (isDark ? colors.textSecondary + '15' : '#F5F5F5');

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress}
    >
      <View style={styles.row}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <IconSymbol
            name={categoryIconName}
            size={22}
            color={iconColor}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.description, { color: colors.text }]}
            numberOfLines={1}
          >
            {transaction.description}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {transaction.category.name}
          </Text>
        </View>

        {/* Amount */}
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountPrefix}{formatCurrency(transaction.amount)}
        </Text>
      </View>

      {showDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: FontSize.sm,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48 + Spacing.md + Spacing.lg,
  },
});
