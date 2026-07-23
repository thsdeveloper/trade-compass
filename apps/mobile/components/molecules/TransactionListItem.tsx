import { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol, IconSymbolName } from '@/components/atoms/icon-symbol';
import { BankLogo } from '@/components/atoms/BankLogo';
import { MoneyText } from '@/components/atoms/MoneyText';
import { isTransactionOverdue, type TransactionWithDetails } from '@/types/finance';

interface TransactionListItemProps {
  transaction: TransactionWithDetails;
  onPress?: () => void;
  onLongPress?: () => void;
  showDivider?: boolean;
  hideAmount?: boolean;
  selectionMode?: boolean;
  selected?: boolean;
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

export function getCategoryIcon(iconName: string): IconSymbolName {
  return CATEGORY_ICON_MAP[iconName] || CATEGORY_ICON_MAP['default'];
}

function formatItemDate(dateString: string): string {
  const date = new Date(dateString.split('T')[0] + 'T12:00:00');
  return date
    .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
    .replace('.', '');
}

export const TransactionListItem = memo(function TransactionListItem({
  transaction,
  onPress,
  onLongPress,
  showDivider = true,
  hideAmount = false,
  selectionMode = false,
  selected = false,
}: TransactionListItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const categoryIconName = getCategoryIcon(transaction.category.icon);
  const categoryColor = transaction.category.color || colors.textSecondary;
  const iconBgColor = isDark ? colors.card : `${categoryColor}1A`;

  const account = transaction.account;
  const accountInitial = account?.name?.trim().charAt(0).toUpperCase();
  const creditCard = transaction.credit_card;
  const isCardTransaction = !!transaction.credit_card_id;
  // Em aberto e com vencimento passado: sinaliza "Vencida" (o status gravado
  // pode ainda ser PENDENTE — o sistema não reescreve por data). Cartão fora.
  const overdue = isTransactionOverdue(
    transaction.status,
    transaction.due_date,
    isCardTransaction
  );

  return (
    <TouchableOpacity
      style={[styles.container, selected && { backgroundColor: `${colors.primary}14` }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress && !onLongPress}
      accessibilityState={selectionMode ? { selected } : undefined}
    >
      <View style={styles.row}>
        {selectionMode && (
          <View style={styles.selectionIndicator}>
            {selected ? (
              <IconSymbol
                name="checkmark.circle.fill"
                size={24}
                color={colors.primary}
              />
            ) : (
              <View
                style={[styles.selectionCircle, { borderColor: colors.border }]}
              />
            )}
          </View>
        )}
        {/* Icon + badge da conta */}
        <View>
          <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
            <IconSymbol name={categoryIconName} size={22} color={categoryColor} />
          </View>
          {account ? (
            <View
              style={[
                styles.accountBadge,
                {
                  backgroundColor: account.color || colors.primary,
                  borderColor: colors.background,
                },
              ]}
            >
              <BankLogo
                bank={account.bank_id}
                name={account.name}
                size={16}
                formato="circulo"
                fallback={
                  accountInitial ? (
                    <Text style={styles.accountBadgeText}>{accountInitial}</Text>
                  ) : null
                }
              />
            </View>
          ) : isCardTransaction ? (
            // Compra de cartão: badge com um cartãozinho na cor do cartão
            <View
              style={[
                styles.accountBadge,
                {
                  backgroundColor: creditCard?.color || colors.warning,
                  borderColor: colors.background,
                },
              ]}
            >
              <IconSymbol name="creditcard.fill" size={11} color="#FFFFFF" />
            </View>
          ) : null}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.description, { color: colors.text }]}
            numberOfLines={1}
          >
            {transaction.description}
          </Text>
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {overdue && (
              <Text style={{ color: colors.danger, fontWeight: FontWeight.semibold }}>
                Vencida •{' '}
              </Text>
            )}
            {formatItemDate(transaction.due_date)} • {transaction.category.name}
          </Text>
          {account?.name ? (
            <Text
              style={[styles.accountName, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {account.name}
            </Text>
          ) : isCardTransaction ? (
            <View style={styles.cardRow}>
              <IconSymbol
                name="creditcard.fill"
                size={11}
                color={colors.textSecondary}
              />
              <Text
                style={[styles.accountName, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {creditCard?.name ?? 'Cartão de crédito'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Amount */}
        <MoneyText
          value={transaction.amount}
          type={transaction.type}
          hidden={hideAmount}
          style={styles.amount}
        />
      </View>

      {showDivider && (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
  },
  selectionIndicator: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
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
  accountBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  description: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.sm,
  },
  accountName: {
    fontSize: FontSize.sm,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48 + Spacing.md + Spacing.lg,
  },
});
