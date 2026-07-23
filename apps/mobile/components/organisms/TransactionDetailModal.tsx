import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useReducedMotion } from 'react-native-reanimated';

import { IconSymbol, IconSymbolName } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { Button } from '@/components/atoms/Button';
import { BankLogo } from '@/components/atoms/BankLogo';
import { MoneyText } from '@/components/atoms/MoneyText';
import { AmountInput, type AmountInputHandle } from '@/components/molecules/AmountInput';
import { resolveBankKey } from '@/lib/bancos-brasil';
import { PickerModal, type PickerOption } from '@/components/organisms/PickerModal';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { ConfirmDialog } from '@/components/organisms/ConfirmDialog';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import {
  deleteTransaction,
  getCreditCards,
  payTransaction,
  unpayTransaction,
  updateTransaction,
} from '@/lib/finance-api';
import {
  effectiveTransactionStatus,
  formatFullDate,
  getStatusColor,
  invoiceMonthLabel,
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

  const { categories, accounts, loadTransactions, loadAccounts, loadCreditCards } =
    useFinance();

  // Cópia local: edições refletem na hora, sem esperar o refetch da lista
  const [current, setCurrent] = useState<TransactionWithDetails | null>(transaction);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [notesSheetOpen, setNotesSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [amountSheetOpen, setAmountSheetOpen] = useState(false);
  const [descSheetOpen, setDescSheetOpen] = useState(false);
  const [confirmDeleteVisible, setConfirmDeleteVisible] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [dateDraft, setDateDraft] = useState(new Date());
  const [isTogglingPaid, setIsTogglingPaid] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isSavingAmount, setIsSavingAmount] = useState(false);
  const [isSavingDesc, setIsSavingDesc] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<AmountInputHandle>(null);

  useEffect(() => {
    setCurrent(transaction);
    setNotesDraft(transaction?.notes ?? '');
    setDescDraft(transaction?.description ?? '');
    setError(null);
    setCategorySheetOpen(false);
    setAccountSheetOpen(false);
    setNotesSheetOpen(false);
    setDateSheetOpen(false);
    setAmountSheetOpen(false);
    setDescSheetOpen(false);
    setConfirmDeleteVisible(false);
  }, [transaction]);

  // Preenche o editor de valor quando o sheet abre (o AmountInput só monta então)
  useEffect(() => {
    if (amountSheetOpen && current) {
      const timer = setTimeout(
        () => amountRef.current?.setCents(Math.round(current.amount * 100)),
        50
      );
      return () => clearTimeout(timer);
    }
  }, [amountSheetOpen, current]);

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

  // Opções hierárquicas (mãe → filhos) para o modal padrão de categorias
  const categoryOptions = useMemo<PickerOption[]>(() => {
    const toOption = (c: FinanceCategory): PickerOption => ({
      id: c.id,
      label: c.name,
      color: c.color,
      iconName: getCategoryIcon(c.icon),
    });
    const byParent = new Map<string, FinanceCategory[]>();
    for (const c of typeCategories) {
      if (c.parent_id) {
        const arr = byParent.get(c.parent_id) ?? [];
        arr.push(c);
        byParent.set(c.parent_id, arr);
      }
    }
    return typeCategories
      .filter((c) => !c.parent_id)
      .map((parent) => ({
        ...toOption(parent),
        children: (byParent.get(parent.id) ?? []).map(toOption),
      }));
  }, [typeCategories]);

  // Opções de origem (contas + cartões) para o mesmo modal padrão.
  // Ids prefixados distinguem conta de cartão ao selecionar.
  const sourceOptions = useMemo<PickerOption[]>(() => {
    const income = current?.type === 'RECEITA';
    const opts: PickerOption[] = accounts.map((a) => ({
      id: `account:${a.id}`,
      label: a.name,
      color: a.color,
      iconName: getCategoryIcon(a.icon),
      bankKey: resolveBankKey(a.bank_id, a.name),
      subtitle: ACCOUNT_TYPE_LABELS[a.type],
    }));
    if (!income) {
      for (const card of creditCards) {
        opts.push({
          id: `card:${card.id}`,
          label: card.name,
          iconName: 'creditcard.fill',
          subtitle: 'Cartão de crédito',
        });
      }
    }
    return opts;
  }, [accounts, creditCards, current]);

  // Alterna pago/não pago. Pagar aplica o efeito no saldo; desfazer o estorna.
  const handleTogglePaid = useCallback(
    async (next: boolean) => {
      if (!current || isTogglingPaid) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setError(null);
      setIsTogglingPaid(true);
      try {
        const updated = next
          ? await payTransaction(current.id)
          : await unpayTransaction(current.id);
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
        // Pagar/estornar altera o saldo da conta: recarrega para refletir
        loadAccounts();
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : next
              ? 'Erro ao marcar como paga'
              : 'Erro ao desfazer pagamento'
        );
      } finally {
        setIsTogglingPaid(false);
      }
    },
    [current, isTogglingPaid, loadTransactions, loadAccounts]
  );

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
          credit_card: null,
          account,
        });
      } else {
        setCurrent({
          ...current,
          account_id: null,
          credit_card_id: source.id,
          credit_card: creditCards.find((c) => c.id === source.id) ?? null,
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
    [current, accounts, creditCards, loadTransactions]
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

  const handleSaveAmount = useCallback(async () => {
    if (!current || isSavingAmount) return;
    const newAmount = (amountRef.current?.getCents() ?? 0) / 100;
    if (newAmount <= 0) {
      setError('Informe um valor maior que zero');
      return;
    }
    if (newAmount === current.amount) {
      setAmountSheetOpen(false);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setIsSavingAmount(true);
    const previous = current;
    // Numa transação paga, o valor efetivado (paid_amount) acompanha o novo valor
    const isPaidTx = current.status === 'PAGO';
    setCurrent({
      ...current,
      amount: newAmount,
      paid_amount: isPaidTx ? newAmount : current.paid_amount,
    });
    try {
      await updateTransaction(current.id, { amount: newAmount });
      setAmountSheetOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTransactions();
      // Valor de transação paga ou de cartão altera saldo/limite: recarrega ambos
      loadAccounts();
      loadCreditCards();
    } catch (err) {
      setCurrent(previous);
      setError(err instanceof Error ? err.message : 'Erro ao alterar valor');
    } finally {
      setIsSavingAmount(false);
    }
  }, [current, isSavingAmount, loadTransactions, loadAccounts, loadCreditCards]);

  const handleSaveDescription = useCallback(async () => {
    if (!current || isSavingDesc) return;
    const trimmed = descDraft.trim();
    if (!trimmed) {
      setError('A descrição não pode ficar vazia');
      return;
    }
    if (trimmed === current.description) {
      setDescSheetOpen(false);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setError(null);
    setIsSavingDesc(true);
    const previous = current;
    setCurrent({ ...current, description: trimmed });
    try {
      await updateTransaction(current.id, { description: trimmed });
      setDescSheetOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadTransactions();
    } catch (err) {
      setCurrent(previous);
      setError(err instanceof Error ? err.message : 'Erro ao alterar descrição');
    } finally {
      setIsSavingDesc(false);
    }
  }, [current, isSavingDesc, descDraft, loadTransactions]);

  const handleDelete = useCallback(async () => {
    if (!current || isDeleting) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDeleting(true);
    try {
      await deleteTransaction(current.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setConfirmDeleteVisible(false);
      // Exclusão de transação paga estorna o saldo; de cartão devolve o limite
      loadTransactions();
      loadAccounts();
      loadCreditCards();
      onClose();
    } catch (err) {
      setConfirmDeleteVisible(false);
      setError(err instanceof Error ? err.message : 'Erro ao excluir transação');
    } finally {
      setIsDeleting(false);
    }
  }, [current, isDeleting, loadTransactions, loadAccounts, loadCreditCards, onClose]);

  if (!current) return null;

  const isIncome = current.type === 'RECEITA';
  const isTransfer = current.type === 'TRANSFERENCIA';
  const isCardTransaction = !!current.credit_card_id;
  const isPaid = current.status === 'PAGO';
  const isOpen = current.status === 'PENDENTE' || current.status === 'VENCIDO';
  // Compra de cartão liquida pela fatura; transferência é sempre efetuada.
  // Nas demais, o usuário alterna pago/não pago (com efeito no saldo).
  const canTogglePaid = !isTransfer && !isCardTransaction;
  // Valor, conta e data são editáveis mesmo em transação paga: o backend
  // reconcilia saldo/limite. Só transferências ficam de fora (fluxo próprio).
  const canEditMoneyFields = !isTransfer;
  // Transferência é excluída pelo seu próprio fluxo (par de lançamentos)
  const canDelete = !isTransfer;

  // Relação embutida no GET; o fallback cobre respostas antigas em cache
  const selectedCard =
    current.credit_card ??
    (current.credit_card_id
      ? creditCards.find((c) => c.id === current.credit_card_id)
      : undefined);

  // Status para exibição: uma conta em aberto e vencida vira "Vencido" mesmo
  // gravada como PENDENTE (o sistema não reescreve por data). Cartão fica fora.
  const displayStatus = effectiveTransactionStatus(
    current.status,
    current.due_date,
    isCardTransaction
  );
  const statusColor = getStatusColor(displayStatus);
  const statusLabel =
    isPaid && current.payment_date
      ? `Pago em ${formatFullDate(current.payment_date)}`
      : isCardTransaction && isOpen && selectedCard
        ? `Lançamento para a fatura de ${invoiceMonthLabel(
            selectedCard,
            new Date(current.due_date.split('T')[0] + 'T12:00:00')
          )}`
        : TRANSACTION_STATUS_LABELS[displayStatus];

  const separator = (
    <View style={[styles.rowSeparator, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <FullScreenOverlay title={current.description} onClose={onClose}>
        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) + Spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Valor animado + status. Toque abre o editor de valor. */}
          <View style={styles.amountSection}>
            <Pressable
              onPress={() => setAmountSheetOpen(true)}
              disabled={!canEditMoneyFields}
              accessibilityRole="button"
              accessibilityLabel="Alterar valor"
              style={({ pressed }) => [styles.amountPress, pressed && styles.cardPressed]}
            >
              <MoneyText
                value={animatedAmount}
                type={current.type === 'RECEITA' ? 'RECEITA' : null}
                style={styles.amountValue}
              />
              {canEditMoneyFields && (
                <View style={styles.amountPencil}>
                  <IconSymbol name="pencil" size={16} color={colors.icon} />
                </View>
              )}
            </Pressable>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              ]}
            >
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Pago/não pago: alternar aplica ou estorna o efeito no saldo */}
          {canTogglePaid && (
            <GlassSurface
              variant="material"
              style={[
                styles.card,
                styles.paidCard,
                {
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
                },
              ]}
            >
              <View style={styles.paidText}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>
                  {isIncome ? 'Recebido' : 'Pago'}
                </Text>
                <Text style={[styles.paidHint, { color: colors.textSecondary }]}>
                  {isPaid
                    ? isIncome
                      ? 'Entrou no saldo da conta'
                      : 'Saiu do saldo da conta'
                    : isIncome
                      ? 'Ainda não recebido — não afeta o saldo'
                      : 'Ainda não pago — não afeta o saldo'}
                </Text>
              </View>
              {isTogglingPaid ? (
                <ActivityIndicator color={colors.success} />
              ) : (
                <Switch
                  value={isPaid}
                  onValueChange={handleTogglePaid}
                  trackColor={{ true: colors.success }}
                  accessibilityLabel={isIncome ? 'Recebido' : 'Pago'}
                />
              )}
            </GlassSurface>
          )}

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
              <IconSymbol name="exclamationmark.circle" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {/* Detalhes: lista agrupada única — cartão de conteúdo (material) */}
          <GlassSurface
            variant="material"
            style={[
              styles.card,
              {
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
              },
            ]}
          >
            {/* Descrição (editável) */}
            <TouchableOpacity
              style={styles.detailRow}
              onPress={() => {
                setDescDraft(current.description);
                setDescSheetOpen(true);
              }}
              accessibilityLabel="Alterar descrição"
              activeOpacity={0.6}
            >
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                Descrição
              </Text>
              <View style={styles.detailValueRow}>
                <Text
                  style={[styles.detailValue, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {current.description}
                </Text>
                <IconSymbol name="chevron.right" size={16} color={colors.icon} />
              </View>
            </TouchableOpacity>

            {separator}

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
                <IconSymbol
                  name={getCategoryIcon(current.category.icon)}
                  size={18}
                  color={current.category.color}
                />
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
                    <BankLogo
                      bank={current.account.bank_id}
                      name={current.account.name}
                      size={18}
                      formato="circulo"
                      fallback={
                        <View style={[styles.colorDot, { backgroundColor: current.account.color }]} />
                      }
                    />
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
          </GlassSurface>

          {/* Observações: toque abre o editor — feedback por escala, nunca
              opacidade sobre ancestral de GlassSurface */}
          <Pressable
            onPress={() => {
              setNotesDraft(current.notes ?? '');
              setNotesSheetOpen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Editar observações"
            style={({ pressed }) => pressed && styles.cardPressed}
          >
            <GlassSurface
              variant="material"
              style={[
                styles.card,
                {
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)',
                },
              ]}
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
            </GlassSurface>
          </Pressable>

          {/* Excluir: se a transação já foi efetuada, o valor volta para a conta */}
          {canDelete && (
            <Button
              label="Excluir transação"
              variant="destructive"
              icon="trash-outline"
              onPress={() => setConfirmDeleteVisible(true)}
              accessibilityLabel="Excluir transação"
              style={styles.deleteButton}
            />
          )}
        </ScrollView>

        {/* Modal padrão: alterar categoria (busca, ícones coloridos, mãe → filhos) */}
        <PickerModal
          visible={categorySheetOpen}
          onClose={() => setCategorySheetOpen(false)}
          title="Alterar categoria"
          searchPlaceholder="Buscar categoria..."
          options={categoryOptions}
          selectedId={current.category_id}
          onSelect={(id) => {
            const category = categories.find((c) => c.id === id);
            if (category) handleSelectCategory(category);
          }}
        />

        {/* Origem: mesmo modal padrão (busca + ícones) para conta/cartão */}
        <PickerModal
          visible={accountSheetOpen}
          onClose={() => setAccountSheetOpen(false)}
          title={isIncome ? 'Recebido em qual conta?' : 'Pago com qual conta ou cartão?'}
          searchPlaceholder="Buscar conta ou cartão..."
          options={sourceOptions}
          selectedId={
            current.credit_card_id
              ? `card:${current.credit_card_id}`
              : current.account_id
                ? `account:${current.account_id}`
                : null
          }
          onSelect={(id) => {
            const [kind, realId] = id.split(':');
            handleSelectSource({ kind: kind as 'account' | 'card', id: realId });
          }}
        />

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
            <Button
              label="Atualizar"
              onPress={handleSaveNotes}
              loading={isSavingNotes}
              accessibilityLabel="Atualizar observações"
            />
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
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={(_event, date) => {
                  if (date) setDateDraft(date);
                }}
              />
              <Button
                label="Confirmar"
                onPress={() => {
                  setDateSheetOpen(false);
                  handleSaveDate(dateDraft);
                }}
                accessibilityLabel="Confirmar data"
              />
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

        {/* Sheet: valor (mesmo editor da tela de nova transação) */}
        <BottomSheet
          visible={amountSheetOpen}
          title="Valor"
          onClose={() => setAmountSheetOpen(false)}
        >
          <View style={styles.notesSheetBody}>
            <AmountInput
              ref={amountRef}
              color={current.type === 'RECEITA' ? colors.success : colors.text}
              autoFocus
            />
            <Button
              label="Atualizar"
              onPress={handleSaveAmount}
              loading={isSavingAmount}
              accessibilityLabel="Atualizar valor"
            />
          </View>
        </BottomSheet>

        {/* Sheet: descrição */}
        <BottomSheet
          visible={descSheetOpen}
          title="Descrição"
          onClose={() => setDescSheetOpen(false)}
        >
          <View style={styles.notesSheetBody}>
            <TextInput
              style={[styles.descInput, { backgroundColor: colors.card, color: colors.text }]}
              value={descDraft}
              onChangeText={setDescDraft}
              placeholder="Descrição da transação"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveDescription}
            />
            <Button
              label="Atualizar"
              onPress={handleSaveDescription}
              loading={isSavingDesc}
              accessibilityLabel="Atualizar descrição"
            />
          </View>
        </BottomSheet>

        {/* Excluir: destrutivo e irreversível — sempre confirma */}
        <ConfirmDialog
          visible={confirmDeleteVisible}
          title="Excluir transação?"
          message={
            current.status === 'PAGO' && current.account_id
              ? 'A transação será removida e o valor voltará para o saldo da conta.'
              : 'A transação será removida. Essa ação não pode ser desfeita.'
          }
          confirmLabel="Excluir"
          icon="trash"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDeleteVisible(false)}
        />
      </FullScreenOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  ambientGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
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
  amountPress: {
    // O valor fica centralizado; o lápis flutua à direita sem deslocá-lo
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountPencil: {
    position: 'absolute',
    right: 0,
  },
  deleteButton: {
    marginTop: Spacing.sm,
  },
  descInput: {
    minHeight: 52,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
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
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  paidCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paidText: {
    flex: 1,
    gap: 2,
  },
  paidHint: {
    fontSize: FontSize.sm,
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
  sheetList: {
    paddingHorizontal: 0,
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
});
