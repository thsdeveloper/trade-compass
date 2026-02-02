import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  formatCurrency,
  formatFullDate,
  getStatusColor,
  getStatusBackgroundColor,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  ACCOUNT_TYPE_LABELS,
  type TransactionWithDetails,
} from '@/types/finance';

interface TransactionDetailModalProps {
  transaction: TransactionWithDetails | null;
  visible: boolean;
  onClose: () => void;
}

// Map Lucide icon names to SF Symbols (copied from TransactionListItem.tsx)
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

export function TransactionDetailModal({
  transaction,
  visible,
  onClose,
}: TransactionDetailModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  if (!transaction) return null;

  const isIncome = transaction.type === 'RECEITA';
  const amountColor = isIncome ? colors.success : colors.text;
  const categoryIconName = getCategoryIcon(transaction.category.icon);
  const iconColor = isIncome ? colors.success : colors.textSecondary;
  const iconBgColor = isIncome
    ? (isDark ? colors.success + '20' : '#E6F7EF')
    : (isDark ? colors.textSecondary + '15' : '#F5F5F5');

  const statusColor = getStatusColor(transaction.status);
  const statusBgColor = getStatusBackgroundColor(transaction.status);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { backgroundColor: colors.background, paddingTop: insets.top },
        ]}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#374151' : '#e5e7eb' }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: iconBgColor }]}>
              <IconSymbol name={categoryIconName} size={24} color={iconColor} />
            </View>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {transaction.description}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol name="xmark" size={24} color={colors.icon} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Valor Section */}
          <View style={styles.amountSection}>
            <Text style={[styles.amountValue, { color: amountColor }]}>
              {isIncome ? '+ ' : ''}{formatCurrency(transaction.amount)}
            </Text>
            <View style={[styles.typeBadge, { backgroundColor: isIncome ? colors.successLight : colors.dangerLight }]}>
              <Text style={[styles.typeBadgeText, { color: isIncome ? colors.success : colors.danger }]}>
                {TRANSACTION_TYPE_LABELS[transaction.type]}
              </Text>
            </View>
          </View>

          {/* Status Section */}
          <View style={styles.statusSection}>
            <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {TRANSACTION_STATUS_LABELS[transaction.status]}
              </Text>
            </View>
          </View>

          {/* Detalhes Card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Detalhes</Text>

            {/* Categoria */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Categoria</Text>
              <View style={styles.detailValueRow}>
                <View style={[styles.colorDot, { backgroundColor: transaction.category.color }]} />
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {transaction.category.name}
                </Text>
              </View>
            </View>

            {/* Tipo */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Tipo</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {TRANSACTION_TYPE_LABELS[transaction.type]}
              </Text>
            </View>

            {/* Conta */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Conta</Text>
              {transaction.account ? (
                <View style={styles.detailValueRow}>
                  <View style={[styles.colorDot, { backgroundColor: transaction.account.color }]} />
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {transaction.account.name} ({ACCOUNT_TYPE_LABELS[transaction.account.type]})
                  </Text>
                </View>
              ) : (
                <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                  Sem conta vinculada
                </Text>
              )}
            </View>
          </View>

          {/* Datas Card */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Datas</Text>

            {/* Vencimento */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Vencimento</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formatFullDate(transaction.due_date)}
              </Text>
            </View>

            {/* Pagamento */}
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Pagamento</Text>
              <Text style={[styles.detailValue, { color: transaction.payment_date ? colors.text : colors.textSecondary }]}>
                {transaction.payment_date ? formatFullDate(transaction.payment_date) : 'Não pago'}
              </Text>
            </View>
          </View>

          {/* Parcelas Card (conditional) */}
          {transaction.installment_number && transaction.total_installments && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Parcelas</Text>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Parcela</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {transaction.installment_number} de {transaction.total_installments}
                </Text>
              </View>
            </View>
          )}

          {/* Observacoes Card (conditional) */}
          {transaction.notes && (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Observações</Text>
              <Text style={[styles.notesText, { color: colors.text }]}>
                {transaction.notes}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
    marginRight: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
  },
  typeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  statusBadgeText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: FontSize.sm,
  },
  detailValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexShrink: 1,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 1,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  notesText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
