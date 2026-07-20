import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { TextField } from '@/components/atoms/TextField';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { TransactionTypeToggle } from '@/components/molecules/TransactionTypeToggle';
import { CategoryPicker } from '@/components/organisms/CategoryPicker';
import { AccountPicker } from '@/components/organisms/AccountPicker';
import { BankLogo } from '@/components/atoms/BankLogo';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { QrScannerModal } from '@/components/organisms/QrScannerModal';
import { ReceiptScanningLoader } from '@/components/organisms/ReceiptScanningLoader';
import { useReceiptScanner } from '@/hooks/use-receipt-scanner';
import { getCategoryIcon } from '@/lib/category-icons';
import { formatCurrency } from '@/types/finance';
import type { TransactionType, TransactionFormData } from '@/types/finance';
import type { TransactionDraft } from '@/types/agent';

const MAX_CENTS = 9_999_999_999; // R$ 99.999.999,99

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

export default function NewTransactionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const { categories, accounts, loadCategories, loadAccounts, createTransaction } =
    useFinance();

  const [type, setType] = useState<TransactionType>('DESPESA');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [cents, setCents] = useState(0);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftDate, setDraftDate] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    loadCategories();
    loadAccounts();
  }, [loadCategories, loadAccounts]);

  // Pré-preenche o formulário a partir do rascunho lido de uma nota fiscal.
  const applyDraft = useCallback(
    (draft: TransactionDraft) => {
      Keyboard.dismiss();
      setType(draft.type);
      if (draft.description) setDescription(draft.description);
      if (typeof draft.amount === 'number' && draft.amount > 0) {
        setCents(Math.min(Math.round(draft.amount * 100), MAX_CENTS));
      }
      if (draft.due_date) {
        const [y, m, d] = draft.due_date.split('-').map(Number);
        if (y && m && d) setDueDate(new Date(y, m - 1, d));
      }
      // Só aplica a categoria se ela existir e for do tipo do rascunho
      if (draft.category_id) {
        const match = categories.find(
          (c) => c.id === draft.category_id && c.type === draft.type,
        );
        if (match) setCategoryId(match.id);
      }
    },
    [categories],
  );

  const { isScanning, scanFromCamera, scanFromGallery, scanFromQr } =
    useReceiptScanner({ onDraft: applyDraft });

  const openScanOptions = useCallback(() => {
    Keyboard.dismiss();
    Alert.alert('Escanear nota', 'Como você quer ler a nota fiscal?', [
      { text: 'Tirar foto', onPress: scanFromCamera },
      { text: 'Escolher da galeria', onPress: scanFromGallery },
      { text: 'Ler QR code (NFC-e)', onPress: () => setScannerVisible(true) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [scanFromCamera, scanFromGallery]);

  const amountColor = type === 'RECEITA' ? colors.success : colors.text;
  const canSave = cents > 0 && !!categoryId && !!accountId && description.trim().length > 0;

  // Entrada em centavos via teclado do dispositivo: descarta não-dígitos
  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    setCents(digits ? Math.min(parseInt(digits, 10), MAX_CENTS) : 0);
  };

  const openDatePicker = () => {
    Keyboard.dismiss();
    setDraftDate(dueDate);
    setShowDatePicker(true);
  };

  const formatDateChip = (date: Date) => {
    if (isSameDay(date, new Date())) return 'Hoje';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert('Faltam dados', 'Informe valor, categoria, conta e descrição.');
      return;
    }
    setIsSaving(true);
    try {
      const data: TransactionFormData = {
        type,
        category_id: categoryId!,
        account_id: accountId!,
        description: description.trim(),
        amount: cents / 100,
        due_date: dueDate.toISOString().split('T')[0],
      };
      await createTransaction(data);
      router.back();
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof Error ? error.message : 'Erro ao criar transação'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const chipBg = 'rgba(255,255,255,0.10)';
  const chipBorder = 'rgba(255,255,255,0.16)';

  return (
    <FullScreenOverlay
      title="Nova transação"
      onClose={() => router.back()}
      headerRight={
        <TouchableOpacity
          onPress={openScanOptions}
          hitSlop={12}
          disabled={isScanning}
          accessibilityLabel="Escanear nota fiscal"
        >
          <Ionicons name="scan-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      }
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Tipo */}
        <TransactionTypeToggle
          value={type}
          onChange={(next) => {
            setType(next);
            setCategoryId(null); // categoria é específica do tipo
          }}
        />

        {/* Valor (herói) — teclado do próprio dispositivo */}
        <TextInput
          style={[styles.amount, { color: amountColor }]}
          value={cents > 0 ? formatCurrency(cents / 100) : ''}
          onChangeText={handleAmountChange}
          placeholder={formatCurrency(0)}
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          textAlign="center"
          autoFocus
        />

        {/* Descrição */}
        <TextField
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          returnKeyType="done"
        />

        {/* Chips: categoria, conta, data */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          <CategoryPicker
            categories={categories.filter((c) => c.type === type)}
            selectedId={categoryId}
            onSelect={(cat) => setCategoryId(cat.id)}
            renderTrigger={({ open, selected }) => (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
                onPress={() => {
                  Keyboard.dismiss();
                  open();
                }}
              >
                {selected ? (
                  <IconSymbol
                    name={getCategoryIcon(selected.icon)}
                    size={16}
                    color={selected.color}
                  />
                ) : (
                  <Ionicons name="pricetag-outline" size={15} color={colors.textSecondary} />
                )}
                <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                  {selected ? selected.name : 'Categoria'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />

          <AccountPicker
            accounts={accounts}
            selectedId={accountId}
            onSelect={(acc) => setAccountId(acc.id)}
            renderTrigger={({ open, selected }) => (
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
                onPress={() => {
                  Keyboard.dismiss();
                  open();
                }}
              >
                {selected ? (
                  <BankLogo
                    bank={selected.bank_id}
                    name={selected.name}
                    size={16}
                    formato="circulo"
                    fallback={
                      <IconSymbol
                        name={getCategoryIcon(selected.icon)}
                        size={16}
                        color={selected.color}
                      />
                    }
                  />
                ) : (
                  <Ionicons name="wallet-outline" size={15} color={colors.textSecondary} />
                )}
                <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                  {selected ? selected.name : 'Conta'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={[styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }]}
            onPress={openDatePicker}
          >
            <Ionicons name="calendar-outline" size={15} color={colors.textSecondary} />
            <Text style={[styles.chipText, { color: colors.text }]}>
              {formatDateChip(dueDate)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </ScrollView>
      </ScrollView>

        {/* CTA */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
          <Button
            label="Salvar"
            onPress={handleSave}
            loading={isSaving}
            disabled={!canSave}
            style={styles.saveButton}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Seletor de data */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.dateBackdrop}>
          <View style={[styles.dateSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.dateSheetHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.dateCancel, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <Text style={[styles.dateTitle, { color: colors.text }]}>Data</Text>
              <TouchableOpacity
                onPress={() => {
                  setDueDate(draftDate);
                  setShowDatePicker(false);
                }}
              >
                <Text style={[styles.dateDone, { color: colors.primary }]}>Concluir</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={draftDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                if (date) setDraftDate(date);
                if (Platform.OS !== 'ios') {
                  setDueDate(date ?? draftDate);
                  setShowDatePicker(false);
                }
              }}
              themeVariant="dark"
              locale="pt-BR"
              style={styles.datePicker}
            />
          </View>
        </View>
      </Modal>

      {/* Scanner de QR code de NFC-e */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={(data) => {
          setScannerVisible(false);
          scanFromQr(data);
        }}
      />

      {/* Overlay premium enquanto o agente lê a nota */}
      <ReceiptScanningLoader visible={isScanning} />
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  amount: {
    fontSize: 44,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 200,
  },
  chipDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    flexShrink: 1,
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  saveButton: {
    marginBottom: Spacing.md,
  },
  datePicker: {
    alignSelf: 'center',
  },
  dateBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dateSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Spacing['3xl'],
  },
  dateSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  dateTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  dateCancel: {
    fontSize: FontSize.md,
  },
  dateDone: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
