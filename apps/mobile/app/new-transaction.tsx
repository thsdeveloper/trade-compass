import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { TextField } from '@/components/atoms/TextField';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { AmountInput, type AmountInputHandle } from '@/components/molecules/AmountInput';
import {
  TransactionTypeToggle,
  type TransactionMode,
} from '@/components/molecules/TransactionTypeToggle';
import { CategoryPicker } from '@/components/organisms/CategoryPicker';
import { AccountPicker } from '@/components/organisms/AccountPicker';
import {
  PaymentSourcePicker,
  type PaymentSourceRef,
} from '@/components/organisms/PaymentSourcePicker';
import { TagPicker } from '@/components/organisms/TagPicker';
import {
  RecurrenceSheet,
  type RecurrenceConfig,
} from '@/components/organisms/RecurrenceSheet';
import { BankLogo } from '@/components/atoms/BankLogo';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { QrScannerModal } from '@/components/organisms/QrScannerModal';
import { ReceiptScanningLoader } from '@/components/organisms/ReceiptScanningLoader';
import { useReceiptScanner } from '@/hooks/use-receipt-scanner';
import { getCategoryIcon } from '@/lib/category-icons';
import { RECURRENCE_FREQUENCY_LABELS, invoiceMonthLabel } from '@/types/finance';
import type { TransactionType } from '@/types/finance';
import type { TransactionDraft } from '@/types/agent';

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}

/** Data local em YYYY-MM-DD (toISOString viraria o dia anterior à noite no BRT) */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function NewTransactionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  // Rascunho vindo da Nota (chat): abre o formulário já preenchido para revisão
  const { draft: draftParam } = useLocalSearchParams<{ draft?: string }>();

  const {
    categories,
    accounts,
    creditCards,
    loadCategories,
    loadAccounts,
    loadCreditCards,
    loadTags,
    createTransaction,
    createTransfer,
    createRecurrence,
  } = useFinance();

  const [mode, setMode] = useState<TransactionMode>('DESPESA');
  // Compra no cartão é uma DESPESA com credit_card_id para a API
  const type: TransactionType = mode === 'CARTAO' ? 'DESPESA' : mode;
  const isCardMode = mode === 'CARTAO';
  const [categoryId, setCategoryId] = useState<string | null>(null);
  // Origem do pagamento (conta ou cartão) — Despesa e Receita
  const [source, setSource] = useState<PaymentSourceRef | null>(null);
  // Contas da transferência
  const [fromAccountId, setFromAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [hasAmount, setHasAmount] = useState(false);
  const amountRef = useRef<AmountInputHandle>(null);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftDate, setDraftDate] = useState(new Date());
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrenceConfig | null>(null);
  const [showRecurrenceSheet, setShowRecurrenceSheet] = useState(false);
  const [notes, setNotes] = useState('');
  const [noteSheetVisible, setNoteSheetVisible] = useState(false);
  const [draftNote, setDraftNote] = useState('');
  // Transação já efetuada (PAGO, saldo ajustado na hora) ou agendada (PENDENTE)
  const [isPaid, setIsPaid] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanSheetVisible, setScanSheetVisible] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Com o teclado aberto o KAV já encosta a barra no teclado — o inset da
  // safe area vira um vão desnecessário sob o botão Salvar
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    loadCategories();
    loadAccounts();
    loadCreditCards();
    loadTags();
  }, [loadCategories, loadAccounts, loadCreditCards, loadTags]);

  // Com um único cartão cadastrado, o modo Cartão já entra com ele selecionado
  useEffect(() => {
    if (isCardMode && !source && creditCards.length === 1) {
      setSource({ kind: 'card', id: creditCards[0].id });
    }
  }, [isCardMode, source, creditCards]);

  const handleModeChange = (next: TransactionMode) => {
    const nextType: TransactionType = next === 'CARTAO' ? 'DESPESA' : next;
    // Despesa e Cartão compartilham as categorias de DESPESA
    if (nextType !== type) setCategoryId(null);
    // Cada modo tem sua origem: cartão no modo Cartão, conta nos demais
    setSource((prev) =>
      prev && (prev.kind === 'card') !== (next === 'CARTAO') ? null : prev
    );
    setMode(next);
  };

  // Pré-preenche o formulário a partir do rascunho lido de uma nota fiscal.
  const applyDraft = useCallback(
    (draft: TransactionDraft) => {
      Keyboard.dismiss();
      // Nota escaneada no modo Cartão continua nele (o tipo real já é DESPESA)
      setMode((prev) =>
        prev === 'CARTAO' && draft.type === 'DESPESA' ? prev : draft.type
      );
      if (draft.description) setDescription(draft.description);
      if (typeof draft.amount === 'number' && draft.amount > 0) {
        amountRef.current?.setCents(Math.round(draft.amount * 100));
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
      if (draft.notes) setNotes(draft.notes);
    },
    [categories],
  );

  const { isScanning, scanFromCamera, scanFromGallery, scanFromQr } =
    useReceiptScanner({ onDraft: applyDraft });

  // Aplica o rascunho recebido por navegação (fluxo da Nota) uma única vez,
  // após as categorias carregarem — assim a categoria sugerida é reconhecida.
  const draftApplied = useRef(false);
  useEffect(() => {
    if (draftApplied.current || !draftParam || categories.length === 0) return;
    try {
      const parsed = JSON.parse(draftParam) as TransactionDraft;
      applyDraft(parsed);
      draftApplied.current = true;
    } catch {
      // Rascunho inválido: ignora e mantém o formulário em branco
      draftApplied.current = true;
    }
  }, [draftParam, categories, applyDraft]);

  const openScanOptions = useCallback(() => {
    Keyboard.dismiss();
    setScanSheetVisible(true);
  }, []);

  // Fecha o sheet e espera a animação de saída antes de apresentar câmera/
  // galeria/scanner — apresentar por cima do Modal em saída falha no iOS.
  const runScanAction = useCallback((action: () => void) => {
    setScanSheetVisible(false);
    setTimeout(action, 300);
  }, []);

  const isTransfer = type === 'TRANSFERENCIA';
  const amountColor =
    type === 'RECEITA'
      ? colors.success
      : isTransfer
        ? colors.primary
        : isCardMode
          ? colors.warning
          : colors.text;

  const selectedCard =
    source?.kind === 'card'
      ? creditCards.find((c) => c.id === source.id)
      : undefined;

  const canSave =
    hasAmount &&
    description.trim().length > 0 &&
    (isTransfer
      ? !!fromAccountId && !!toAccountId && fromAccountId !== toAccountId
      : !!categoryId && !!source);

  const openDatePicker = () => {
    Keyboard.dismiss();
    setDraftDate(dueDate);
    setShowDatePicker(true);
  };

  const formatDateChip = (date: Date) => {
    if (isSameDay(date, new Date())) return 'Hoje';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // "segunda-feira, 21 de julho" — dia da semana por extenso para leitura rápida
  const formatDateLong = (date: Date) => {
    const text = date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const swapTransferAccounts = () => {
    setFromAccountId(toAccountId);
    setToAccountId(fromAccountId);
  };

  const handleSave = async () => {
    if (!canSave) {
      Alert.alert(
        'Faltam dados',
        isTransfer
          ? 'Informe valor, descrição e contas de origem e destino diferentes.'
          : isCardMode
            ? 'Informe valor, categoria, cartão e descrição.'
            : 'Informe valor, categoria, conta e descrição.'
      );
      return;
    }
    const amount = amountRef.current!.getCents() / 100;
    const dateISO = toISODate(dueDate);
    const trimmedNotes = notes.trim() || undefined;

    setIsSaving(true);
    try {
      if (recurrence) {
        // Recorrência: o POST já cria a primeira ocorrência
        await createRecurrence({
          type,
          description: description.trim(),
          amount,
          frequency: recurrence.frequency,
          start_date: dateISO,
          end_date: recurrence.endDate ?? undefined,
          ...(isTransfer
            ? {
                account_id: fromAccountId!,
                destination_account_id: toAccountId!,
              }
            : {
                category_id: categoryId!,
                ...(source!.kind === 'card'
                  ? { credit_card_id: source!.id }
                  : { account_id: source!.id }),
              }),
        });
      } else if (isTransfer) {
        await createTransfer({
          source_account_id: fromAccountId!,
          destination_account_id: toAccountId!,
          description: description.trim(),
          amount,
          transfer_date: dateISO,
          notes: trimmedNotes,
        });
      } else {
        await createTransaction({
          type,
          category_id: categoryId!,
          ...(source!.kind === 'card'
            ? { credit_card_id: source!.id }
            : {
                account_id: source!.id,
                status: isPaid ? ('PAGO' as const) : ('PENDENTE' as const),
              }),
          description: description.trim(),
          amount,
          due_date: dateISO,
          notes: trimmedNotes,
          ...(tagIds.length > 0 ? { tag_ids: tagIds } : {}),
        });
      }
      router.back();
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof Error ? error.message : 'Erro ao salvar'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const chipBg = 'rgba(255,255,255,0.10)';
  const chipBorder = 'rgba(255,255,255,0.16)';

  const chipStyle = [styles.chip, { backgroundColor: chipBg, borderColor: chipBorder }];

  const renderAccountChip = (
    label: string,
    selectedId: string | null,
    onSelect: (id: string) => void,
    icon: 'arrow-up-circle-outline' | 'arrow-down-circle-outline' | 'wallet-outline'
  ) => (
    <AccountPicker
      accounts={accounts}
      selectedId={selectedId}
      onSelect={(acc) => onSelect(acc.id)}
      renderTrigger={({ open, selected }) => (
        <TouchableOpacity
          style={chipStyle}
          onPress={() => {
            Keyboard.dismiss();
            open();
          }}
        >
          {selected ? (
            <BankLogo
              bank={selected.bank?.name}
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
            <Ionicons name={icon} size={15} color={colors.textSecondary} />
          )}
          <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
            {selected ? selected.name : label}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    />
  );

  return (
    <FullScreenOverlay
      title="Nova transação"
      onClose={() => router.back()}
      headerRight={
        type === 'DESPESA' ? (
          <TouchableOpacity
            onPress={openScanOptions}
            hitSlop={12}
            disabled={isScanning}
            accessibilityLabel="Escanear nota fiscal"
          >
            <Ionicons name="scan-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : undefined
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
          value={mode}
          onChange={handleModeChange}
          includeTransfer
          includeCard
        />

        {/* Valor (herói) — estado interno, não re-renderiza a tela por dígito */}
        <AmountInput
          ref={amountRef}
          color={amountColor}
          autoFocus
          onHasValueChange={setHasAmount}
        />

        {/* Descrição */}
        <TextField
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          returnKeyType="done"
        />

        {/* Chips por modo */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {isTransfer ? (
            <>
              {renderAccountChip(
                'De',
                fromAccountId,
                setFromAccountId,
                'arrow-up-circle-outline'
              )}
              <TouchableOpacity
                style={[styles.swapButton, { backgroundColor: chipBg, borderColor: chipBorder }]}
                onPress={swapTransferAccounts}
                accessibilityLabel="Inverter contas"
                disabled={!fromAccountId && !toAccountId}
              >
                <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              {renderAccountChip(
                'Para',
                toAccountId,
                setToAccountId,
                'arrow-down-circle-outline'
              )}
            </>
          ) : (
            <>
              <CategoryPicker
                categories={categories.filter((c) => c.type === type)}
                selectedId={categoryId}
                onSelect={(cat) => setCategoryId(cat.id)}
                renderTrigger={({ open, selected }) => (
                  <TouchableOpacity
                    style={chipStyle}
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

              {isCardMode ? (
                <PaymentSourcePicker
                  accounts={[]}
                  creditCards={creditCards}
                  selected={source}
                  onSelect={(next) => {
                    if (next.kind === 'card') {
                      setSource({ kind: 'card', id: next.card.id });
                    }
                  }}
                  title="Cartão de crédito"
                  searchPlaceholder="Buscar cartão..."
                  emptyText="Nenhum cartão cadastrado"
                  renderTrigger={({ open, selected }) => (
                    <TouchableOpacity
                      style={chipStyle}
                      onPress={() => {
                        Keyboard.dismiss();
                        open();
                      }}
                    >
                      {selected?.kind === 'card' ? (
                        <IconSymbol name="creditcard" size={16} color={selected.card.color} />
                      ) : (
                        <Ionicons name="card-outline" size={15} color={colors.textSecondary} />
                      )}
                      <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                        {selected?.kind === 'card' ? selected.card.name : 'Cartão'}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                />
              ) : (
                renderAccountChip(
                  'Conta',
                  source?.kind === 'account' ? source.id : null,
                  (id) => setSource({ kind: 'account', id }),
                  'wallet-outline'
                )
              )}
            </>
          )}

        </ScrollView>

        {/* Data — linha empilhada, sempre visível (fora do carrossel) */}
        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: chipBg }]}
          onPress={openDatePicker}
          accessibilityRole="button"
          accessibilityLabel="Escolher data"
        >
          <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
          <View style={styles.optionText}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>
              {isTransfer
                ? 'Data da transferência'
                : selectedCard
                  ? 'Data da compra'
                  : 'Data'}
            </Text>
            <Text style={[styles.optionHint, { color: colors.textSecondary }]}>
              {formatDateLong(dueDate)}
            </Text>
          </View>
          <Text style={[styles.optionValue, { color: colors.text }]}>
            {formatDateChip(dueDate)}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Contexto do modo: fatura do cartão / categoria automática */}
        {selectedCard && !isTransfer ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Vai para a fatura de {invoiceMonthLabel(selectedCard, dueDate)}
          </Text>
        ) : null}
        {isTransfer ? (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Categoria: Transferências entre contas • o saldo sai de uma conta e
            entra na outra na hora
          </Text>
        ) : null}

        {/* Opções empilhadas — fora do carrossel para ficarem sempre visíveis */}

        {/* Já pago/recebido (switch) — só para transação simples em conta:
            transferência é sempre efetuada; cartão liquida pela fatura;
            recorrência gera ocorrências pendentes */}
        {!isTransfer && !isCardMode && !recurrence ? (
          <View style={[styles.optionRow, { backgroundColor: chipBg }]}>
            <Ionicons
              name={isPaid ? 'checkmark-circle' : 'time-outline'}
              size={20}
              color={isPaid ? colors.success : colors.textSecondary}
            />
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {type === 'RECEITA' ? 'Já recebido' : 'Já pago'}
              </Text>
              <Text style={[styles.optionHint, { color: colors.textSecondary }]}>
                {isPaid
                  ? 'Entra no saldo da conta na hora'
                  : type === 'RECEITA'
                    ? 'Fica pendente até você receber'
                    : 'Fica pendente até você pagar'}
              </Text>
            </View>
            <Switch
              value={isPaid}
              onValueChange={setIsPaid}
              trackColor={{ true: colors.success }}
              accessibilityLabel={
                type === 'RECEITA' ? 'Já recebido' : 'Já pago'
              }
            />
          </View>
        ) : null}

        {/* Repetir — abre o sheet de recorrência */}
        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: chipBg }]}
          onPress={() => {
            Keyboard.dismiss();
            setShowRecurrenceSheet(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Configurar repetição"
        >
          <Ionicons
            name="repeat"
            size={20}
            color={recurrence ? colors.primary : colors.textSecondary}
          />
          <View style={styles.optionText}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>Repetir</Text>
          </View>
          <Text
            style={[
              styles.optionValue,
              { color: recurrence ? colors.primary : colors.textSecondary },
            ]}
          >
            {recurrence
              ? RECURRENCE_FREQUENCY_LABELS[recurrence.frequency]
              : 'Não repete'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Tags — só onde categorizar faz sentido (não em transferência) */}
        {!isTransfer && !recurrence ? (
          <TagPicker selectedIds={tagIds} onChange={setTagIds} />
        ) : null}

        {/* Nota opcional — abre em bottom sheet, no padrão das demais opções */}
        <TouchableOpacity
          style={[styles.optionRow, { backgroundColor: chipBg }]}
          onPress={() => {
            Keyboard.dismiss();
            setDraftNote(notes);
            setNoteSheetVisible(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={notes ? 'Editar nota' : 'Adicionar nota'}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={notes ? colors.primary : colors.textSecondary}
          />
          <View style={styles.optionText}>
            <Text style={[styles.optionLabel, { color: colors.text }]}>
              {notes ? 'Nota' : 'Adicionar nota'}
            </Text>
            {notes ? (
              <Text
                style={[styles.optionHint, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {notes}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </ScrollView>

        {/* CTA */}
        <View
          style={[
            styles.bottomBar,
            {
              paddingBottom: keyboardVisible
                ? Spacing.sm
                : Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          <Button
            label={
              recurrence
                ? 'Salvar recorrência'
                : isTransfer
                  ? 'Transferir'
                  : 'Salvar'
            }
            onPress={handleSave}
            loading={isSaving}
            disabled={!canSave}
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
              themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
              locale="pt-BR"
              style={styles.datePicker}
            />
          </View>
        </View>
      </Modal>

      {/* Configuração de repetição */}
      <RecurrenceSheet
        visible={showRecurrenceSheet}
        onClose={() => setShowRecurrenceSheet(false)}
        value={recurrence}
        onChange={setRecurrence}
        startDate={dueDate}
      />

      {/* Nota da transação */}
      <BottomSheet
        title="Nota"
        visible={noteSheetVisible}
        onClose={() => setNoteSheetVisible(false)}
      >
        <View style={styles.noteSheetBody}>
          <TextField
            label="Escreva uma observação sobre a transação"
            value={draftNote}
            onChangeText={setDraftNote}
            multiline
            autoFocus
          />
          <Button
            label="Salvar nota"
            onPress={() => {
              setNotes(draftNote.trim());
              setNoteSheetVisible(false);
            }}
          />
          {notes ? (
            <TouchableOpacity
              style={styles.noteRemove}
              onPress={() => {
                setNotes('');
                setNoteSheetVisible(false);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.noteRemoveLabel, { color: colors.danger }]}>
                Remover nota
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </BottomSheet>

      {/* Opções de leitura da nota fiscal */}
      <BottomSheet
        title="Escanear nota"
        visible={scanSheetVisible}
        onClose={() => setScanSheetVisible(false)}
      >
        <View style={styles.scanOptions}>
          {(
            [
              { icon: 'camera-outline', label: 'Tirar foto', action: scanFromCamera },
              { icon: 'images-outline', label: 'Escolher da galeria', action: scanFromGallery },
              {
                icon: 'qr-code-outline',
                label: 'Ler QR code (NFC-e)',
                action: () => setScannerVisible(true),
              },
            ] as const
          ).map((option) => (
            <TouchableOpacity
              key={option.label}
              style={[styles.scanOption, { backgroundColor: 'rgba(255,255,255,0.08)' }]}
              onPress={() => runScanAction(option.action)}
              accessibilityRole="button"
            >
              <Ionicons name={option.icon} size={20} color={colors.text} />
              <Text style={[styles.scanOptionLabel, { color: colors.text }]}>
                {option.label}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheet>

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
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  swapButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    flexShrink: 1,
  },
  hint: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: 60,
    borderRadius: 16,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  optionText: {
    flex: 1,
    gap: 1,
  },
  optionLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  optionHint: {
    fontSize: FontSize.xs,
  },
  optionValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  noteSheetBody: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  noteRemove: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  noteRemoveLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  scanOptions: {
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  scanOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: 16,
  },
  scanOptionLabel: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
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
