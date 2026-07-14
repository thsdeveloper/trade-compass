import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useReducedMotion } from 'react-native-reanimated';

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { getCreditCards, payTransaction, updateTransaction } from '@/lib/finance-api';
import {
  formatCurrency,
  formatFullDate,
  getStatusColor,
  getStatusBackgroundColor,
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_STATUS_LABELS,
  ACCOUNT_TYPE_LABELS,
  type FinanceCategory,
  type FinanceCreditCard,
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

/**
 * Anima o valor de 0 até o alvo com desaceleração forte (a maior parte do
 * movimento acontece no primeiro segundo). Com reduce motion, vai direto.
 */
function useCountUp(target: number, animate: boolean, duration = 1000): number {
  const [value, setValue] = useState(animate ? 0 : target);

  useEffect(() => {
    if (!animate) {
      setValue(target);
      return;
    }
    let frame: number;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(target * eased);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate, duration]);

  return value;
}

interface BottomSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Painel que sobe do rodapé, com backdrop e alça de arrasto */
function BottomSheet({ visible, title, onClose, children }: BottomSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View
          style={[
            styles.sheetPanel,
            {
              backgroundColor: colors.background,
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
            },
          ]}
        >
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Fechar"
            >
              <IconSymbol name="xmark" size={20} color={colors.icon} />
            </TouchableOpacity>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

type PaymentSource =
  | { kind: 'account'; id: string }
  | { kind: 'card'; id: string };

export function TransactionDetailModal({
  transaction,
  visible,
  onClose,
}: TransactionDetailModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const reduceMotion = useReducedMotion();

  const { categories, accounts, loadTransactions } = useFinance();

  // Cópia local: edições refletem na hora, sem esperar o refetch da lista
  const [current, setCurrent] = useState<TransactionWithDetails | null>(transaction);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [dateDraft, setDateDraft] = useState(new Date());
  const [isPaying, setIsPaying] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCurrent(transaction);
    setNotesDraft(transaction?.notes ?? '');
    setError(null);
    setCategorySheetOpen(false);
    setAccountSheetOpen(false);
    setNotesSheetOpen(false);
    setDateSheetOpen(false);
  }, [transaction]);

  useEffect(() => {
    if (visible) {
      getCreditCards()
        .then(setCreditCards)
        .catch(() => setCreditCards([]));
    }
  }, [visible]);

  const animatedAmount = useCountUp(
    current?.amount ?? 0,
    visible && !reduceMotion && current !== null
  );

  const typeCategories = useMemo(() => {
    if (!current) return [];
    return categories.filter((c) => c.type === current.type);
  }, [categories, current]);

  const handleMarkPaid = useCallback(async () => {
    if (!current || isPaying) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setIsPaying(true);
    try {
      const updated = await payTransaction(current.id);
      setCurrent((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              payment_date: updated.payment_date,
              paid_amount: updated.paid_amount,
            }
          : prev
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar como paga');
    } finally {
      setIsPaying(false);
    }
  }, [current, isPaying, loadTransactions]);

  const handleSelectCategory = useCallback(
    async (category: FinanceCategory) => {
      setCategorySheetOpen(false);
      if (!current || category.id === current.category_id) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setError(null);
      const previous = current;
      // Otimista: aplica já e desfaz se a API falhar
      setCurrent({ ...current, category_id: category.id, category });
      try {
        await updateTransaction(current.id, { category_id: category.id });
        loadTransactions();
      } catch (err) {
        setCurrent(previous);
        setError(err instanceof Error ? err.message : 'Erro ao alterar categoria');
      }
    },
    [current, loadTransactions]
  );

  const handleSelectSource = useCallback(
    async (source: PaymentSource) => {
      setAccountSheetOpen(false);
      if (!current) return;
      const unchanged =
        source.kind === 'account'
          ? source.id === current.account_id
          : source.id === current.credit_card_id;
      if (unchanged) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setError(null);
      const previous = current;

      if (source.kind === 'account') {
        const account = accounts.find((a) => a.id === source.id);
        setCurrent({
          ...current,
          account_id: source.id,
          credit_card_id: null,
          account,
        });
      } else {
        setCurrent({
          ...current,
          account_id: null,
          credit_card_id: source.id,
          account: undefined,
        });
      }

      try {
        await updateTransaction(
          current.id,
          source.kind === 'account'
            ? { account_id: source.id, credit_card_id: null }
            : { credit_card_id: source.id, account_id: null }
        );
        loadTransactions();
      } catch (err) {
        setCurrent(previous);
        setError(err instanceof Error ? err.message : 'Erro ao alterar conta');
      }
    },
    [current, accounts, loadTransactions]
  );

  const handleSaveNotes = useCallback(async () => {
    if (!current || isSavingNotes) return;
    const trimmed = notesDraft.trim();
    if (trimmed === (current.notes ?? '')) {
      setNotesSheetOpen(false);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setIsSavingNotes(true);
    try {
      await updateTransaction(current.id, { notes: trimmed });
      setCurrent((prev) => (prev ? { ...prev, notes: trimmed || null } : prev));
      setNotesSheetOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar observações');
    } finally {
      setIsSavingNotes(false);
    }
  }, [current, isSavingNotes, notesDraft, loadTransactions]);

  const handleSaveDate = useCallback(
    async (date: Date) => {
      if (!current) return;
      const isoDate = date.toISOString().split('T')[0];
      if (isoDate === current.due_date) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setError(null);
      const previous = current;
      setCurrent({ ...current, due_date: isoDate });
      try {
        await updateTransaction(current.id, { due_date: isoDate });
        loadTransactions();
      } catch (err) {
        setCurrent(previous);
        setError(err instanceof Error ? err.message : 'Erro ao alterar data');
      }
    },
    [current, loadTransactions]
  );

  const openDateSheet = useCallback(() => {
    if (!current) return;
    // Meio-dia evita mudar de dia por fuso ao converter a data ISO
    setDateDraft(new Date(`${current.due_date}T12:00:00`));
    setDateSheetOpen(true);
  }, [current]);

  if (!current) return null;

  const isIncome = current.type === 'RECEITA';
  const isTransfer = current.type === 'TRANSFERENCIA';
  const isPaid = current.status === 'PAGO';
  const isPayable = !isTransfer && (current.status === 'PENDENTE' || current.status === 'VENCIDO');
  // Regra do backend: transação paga não altera valor, conta, tipo ou data
  const canEditMoneyFields = !isPaid && !isTransfer;

  const amountColor = isIncome ? colors.success : colors.text;
  const categoryIconName = getCategoryIcon(current.category.icon);
  const iconColor = isIncome ? colors.success : colors.textSecondary;
  const iconBgColor = isIncome
    ? (isDark ? colors.success + '20' : '#E6F7EF')
    : (isDark ? colors.textSecondary + '15' : '#F5F5F5');

  const statusColor = getStatusColor(current.status);
  const statusBgColor = getStatusBackgroundColor(current.status);
  const statusLabel =
    isPaid && current.payment_date
      ? `Pago em ${formatFullDate(current.payment_date)}`
      : TRANSACTION_STATUS_LABELS[current.status];

  const selectedCard = current.credit_card_id
    ? creditCards.find((c) => c.id === current.credit_card_id)
    : undefined;

  const separator = (
    <View style={[styles.rowSeparator, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
  );

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
          {
            backgroundColor: colors.background,
            // pageSheet no iOS já abre abaixo da status bar; só o Android
            // (fullscreen) precisa compensar o inset superior
            paddingTop: Platform.OS === 'ios' ? 0 : insets.top,
          },
        ]}
      >
        {/* Header compacto no topo do sheet */}
        <View style={[styles.modalHeader, { borderBottomColor: isDark ? '#374151' : '#e5e7eb' }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIcon, { backgroundColor: iconBgColor }]}>
              <IconSymbol name={categoryIconName} size={22} color={iconColor} />
            </View>
            <View style={styles.headerTextBlock}>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {current.description}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {TRANSACTION_TYPE_LABELS[current.type]}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Fechar detalhes"
            style={styles.closeButton}
          >
            <IconSymbol name="xmark" size={22} color={colors.icon} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Valor animado + status */}
          <View style={styles.amountSection}>
            <Text style={[styles.amountValue, { color: amountColor }]}>
              {isIncome ? '+ ' : ''}{formatCurrency(animatedAmount)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBgColor }]}>
              {isPaid && (
                <IconSymbol name="checkmark.circle.fill" size={14} color={statusColor} />
              )}
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Ação principal: pagar */}
          {isPayable && (
            <TouchableOpacity
              style={[styles.payButton, { backgroundColor: colors.primary }]}
              onPress={handleMarkPaid}
              disabled={isPaying}
              accessibilityLabel="Marcar como paga"
              activeOpacity={0.8}
            >
              {isPaying ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <>
                  <IconSymbol name="checkmark" size={18} color={colors.textOnPrimary} />
                  <Text style={[styles.payButtonText, { color: colors.textOnPrimary }]}>
                    Marcar como paga
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
              <IconSymbol name="exclamationmark.circle" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {/* Detalhes: lista agrupada única */}
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            {/* Categoria (editável, exceto em transferências) */}
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => setCategorySheetOpen(true)}
              disabled={typeCategories.length === 0}
              accessibilityLabel="Alterar categoria"
              activeOpacity={0.6}
            >
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Categoria
              </Text>
              <View style={styles.detailValueRow}>
                <View style={[styles.colorDot, { backgroundColor: current.category.color }]} />
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {current.category.name}
                </Text>
                {typeCategories.length > 0 && (
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                )}
              </View>
            </TouchableOpacity>

            {separator}

            {/* Conta / cartão (editável enquanto não paga) */}
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => setAccountSheetOpen(true)}
              disabled={!canEditMoneyFields}
              accessibilityLabel="Alterar conta ou cartão"
              activeOpacity={0.6}
            >
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Conta</Text>
              <View style={styles.detailValueRow}>
                {current.account ? (
                  <>
                    <View style={[styles.colorDot, { backgroundColor: current.account.color }]} />
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {current.account.name} ({ACCOUNT_TYPE_LABELS[current.account.type]})
                    </Text>
                  </>
                ) : selectedCard ? (
                  <>
                    <IconSymbol name="creditcard" size={14} color={colors.textSecondary} />
                    <Text style={[styles.detailValue, { color: colors.text }]}>
                      {selectedCard.name}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.detailValue, { color: colors.textSecondary }]}>
                    {canEditMoneyFields ? 'Escolher conta' : 'Sem conta vinculada'}
                  </Text>
                )}
                {canEditMoneyFields && (
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                )}
              </View>
            </TouchableOpacity>

            {separator}

            {/* Data da transação (editável enquanto não paga) */}
            <TouchableOpacity
              style={styles.detailRow}
              onPress={openDateSheet}
              disabled={!canEditMoneyFields}
              accessibilityLabel="Alterar data da transação"
              activeOpacity={0.6}
            >
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Data</Text>
              <View style={styles.detailValueRow}>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {formatFullDate(current.due_date)}
                </Text>
                {canEditMoneyFields && (
                  <IconSymbol name="chevron.right" size={16} color={colors.icon} />
                )}
              </View>
            </TouchableOpacity>

            {/* Parcela */}
            {current.installment_number && current.total_installments && (
              <>
                {separator}
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                    Parcela
                  </Text>
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {current.installment_number} de {current.total_installments}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Observações: toque abre o editor */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.card }]}
            onPress={() => {
              setNotesDraft(current.notes ?? '');
              setNotesSheetOpen(true);
            }}
            accessibilityLabel="Editar observações"
            activeOpacity={0.6}
          >
            <View style={styles.notesHeader}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Observações</Text>
              <IconSymbol name="pencil" size={16} color={colors.icon} />
            </View>
            <Text
              style={[
                styles.notesText,
                { color: current.notes ? colors.text : colors.textSecondary },
              ]}
            >
              {current.notes || 'Adicionar observações...'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sheet: categoria */}
        <BottomSheet
          visible={categorySheetOpen}
          title="Alterar categoria"
          onClose={() => setCategorySheetOpen(false)}
        >
          <FlatList
            data={typeCategories}
            keyExtractor={(item) => item.id}
            style={styles.sheetList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => handleSelectCategory(item)}
                activeOpacity={0.6}
              >
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                <Text style={[styles.sheetItemText, { color: colors.text }]}>{item.name}</Text>
                {item.id === current.category_id && (
                  <IconSymbol name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => separator}
          />
        </BottomSheet>

        {/* Sheet: conta / cartão */}
        <BottomSheet
          visible={accountSheetOpen}
          title={isIncome ? 'Recebido em qual conta?' : 'Pago com qual conta ou cartão?'}
          onClose={() => setAccountSheetOpen(false)}
        >
          <ScrollView style={styles.sheetList}>
            {accounts.map((account, index) => (
              <View key={account.id}>
                {index > 0 && separator}
                <TouchableOpacity
                  style={styles.sheetItem}
                  onPress={() => handleSelectSource({ kind: 'account', id: account.id })}
                  activeOpacity={0.6}
                >
                  <View style={[styles.colorDot, { backgroundColor: account.color }]} />
                  <Text style={[styles.sheetItemText, { color: colors.text }]}>
                    {account.name} ({ACCOUNT_TYPE_LABELS[account.type]})
                  </Text>
                  {account.id === current.account_id && (
                    <IconSymbol name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              </View>
            ))}
            {!isIncome &&
              creditCards.map((card) => (
                <View key={card.id}>
                  {separator}
                  <TouchableOpacity
                    style={styles.sheetItem}
                    onPress={() => handleSelectSource({ kind: 'card', id: card.id })}
                    activeOpacity={0.6}
                  >
                    <IconSymbol name="creditcard" size={16} color={colors.textSecondary} />
                    <Text style={[styles.sheetItemText, { color: colors.text }]}>
                      {card.name}
                    </Text>
                    {card.id === current.credit_card_id && (
                      <IconSymbol name="checkmark" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              ))}
          </ScrollView>
        </BottomSheet>

        {/* Sheet: observações */}
        <BottomSheet
          visible={notesSheetOpen}
          title="Observações"
          onClose={() => setNotesSheetOpen(false)}
        >
          <View style={styles.notesSheetBody}>
            <TextInput
              style={[
                styles.notesInput,
                { backgroundColor: colors.card, color: colors.text },
              ]}
              value={notesDraft}
              onChangeText={setNotesDraft}
              placeholder="Escreva uma observação sobre essa transação..."
              placeholderTextColor={colors.textSecondary}
              multiline
              autoFocus
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.sheetPrimaryButton, { backgroundColor: colors.primary }]}
              onPress={handleSaveNotes}
              disabled={isSavingNotes}
              accessibilityLabel="Atualizar observações"
              activeOpacity={0.8}
            >
              {isSavingNotes ? (
                <ActivityIndicator size="small" color={colors.textOnPrimary} />
              ) : (
                <Text style={[styles.sheetPrimaryButtonText, { color: colors.textOnPrimary }]}>
                  Atualizar
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </BottomSheet>

        {/* Data: sheet com spinner no iOS, diálogo nativo no Android */}
        {Platform.OS === 'ios' ? (
          <BottomSheet
            visible={dateSheetOpen}
            title="Data da transação"
            onClose={() => setDateSheetOpen(false)}
          >
            <View style={styles.notesSheetBody}>
              <DateTimePicker
                value={dateDraft}
                mode="date"
                display="spinner"
                locale="pt-BR"
                onChange={(_event, date) => {
                  if (date) setDateDraft(date);
                }}
              />
              <TouchableOpacity
                style={[styles.sheetPrimaryButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setDateSheetOpen(false);
                  handleSaveDate(dateDraft);
                }}
                accessibilityLabel="Confirmar data"
                activeOpacity={0.8}
              >
                <Text style={[styles.sheetPrimaryButtonText, { color: colors.textOnPrimary }]}>
                  Confirmar
                </Text>
              </TouchableOpacity>
            </View>
          </BottomSheet>
        ) : (
          dateSheetOpen && (
            <DateTimePicker
              value={dateDraft}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setDateSheetOpen(false);
                if (event.type === 'set' && date) {
                  handleSaveDate(date);
                }
              }}
            />
          )
        )}
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
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.md,
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
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
  },
  closeButton: {
    padding: Spacing.sm,
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
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  amountValue: {
    fontSize: 44,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  payButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 28,
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
    fontWeight: FontWeight.medium,
    textAlign: 'right',
    flexShrink: 1,
  },
  rowSeparator: {
    height: StyleSheet.hairlineWidth,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notesText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetPanel: {
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    paddingTop: Spacing.sm,
    maxHeight: '75%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  sheetList: {
    paddingHorizontal: Spacing.sm,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md + 2,
  },
  sheetItemText: {
    fontSize: FontSize.md,
    flex: 1,
  },
  notesSheetBody: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  notesInput: {
    minHeight: 120,
    maxHeight: 220,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  sheetPrimaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  sheetPrimaryButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
