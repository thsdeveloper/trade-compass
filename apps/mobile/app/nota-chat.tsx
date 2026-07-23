import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { extractReceipt, MAX_MESSAGE_LENGTH } from '@/lib/agent-api';
import {
  createTransaction,
  detectStatement,
  getCreditCards,
  parseStatement,
  payTransaction,
} from '@/lib/finance-api';
import { pickStatementFile } from '@/lib/statement-file';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { AIRing } from '@/components/atoms/AIRing';
import { ScrollEdgeEffect } from '@/components/atoms/ScrollEdgeEffect';
import { Button } from '@/components/atoms/Button';
import { AccountPicker } from '@/components/organisms/AccountPicker';
import { ConfirmDialog } from '@/components/organisms/ConfirmDialog';
import { QrScannerModal } from '@/components/organisms/QrScannerModal';
import { ReceiptScanningLoader } from '@/components/organisms/ReceiptScanningLoader';
import { StatementReviewModal } from '@/components/organisms/StatementReviewModal';
import {
  ReceiptDraftCard,
  type DraftConfirmation,
} from '@/components/organisms/ReceiptDraftCard';
import type { ReceiptChatMessage, TransactionDraft } from '@/types/agent';
import type {
  ConfirmImportResult,
  DetectStatementResponse,
  ImportPreviewTransaction,
  ImportTarget,
  InvoiceAdjustment,
  PickedStatementFile,
} from '@/types/import';
import type { FinanceAccount, FinanceCreditCard } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

const NOTA_GRADIENT = ['#0D9488', '#14B8A6', '#2DD4BF'] as const;
const NOTA_ACCENT = '#14B8A6';
// Balão do usuário na identidade teal do Nota, não no azul primário do app.
// Teal-700 (mais escuro que o acento dos ícones) para manter contraste AA
// (~5,4:1) com o texto branco do balão.
const NOTA_BUBBLE = '#0F766E';
// Espectro do anel "IA" na identidade teal da Nota (último stop repete o
// primeiro para o anel girar sem emenda)
const NOTA_RING_GRADIENT = [
  '#0D9488',
  '#2DD4BF',
  '#5EEAD4',
  '#22D3EE',
  '#0D9488',
] as const;
// Espessura do anel "IA" (mesma assinatura visual do Norte)
const RING_WIDTH = 2;
// Altura da linha do header (avatar + títulos + ações)
const HEADER_BAR_HEIGHT = 56;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function AvatarBadge({ size = 28 }: { size?: number }) {
  return (
    <LinearGradient
      colors={NOTA_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <IconSymbol name="doc.text.fill" size={size * 0.55} color="#FFFFFF" />
    </LinearGradient>
  );
}

interface ExtractionRequest {
  text?: string;
  qrData?: string;
  imageUri?: string;
  /** Texto exibido na bolha do usuário */
  displayText: string;
}

/** Estado da importação de extrato em curso (arquivo → destino → parse) */
interface PendingImport {
  file: PickedStatementFile;
  detect?: DetectStatementResponse;
  target?: ImportTarget;
  targetLabel?: string;
  /** Só as transações novas — duplicatas exatas (FITID) já saem no parse */
  transactions?: ImportPreviewTransaction[];
  /** Quantas transações do arquivo ficaram de fora por já terem sido importadas */
  alreadyImportedCount?: number;
  /** Saldo "fatura anterior e pagamentos" da fatura (negativo = crédito) */
  invoiceAdjustment?: InvoiceAdjustment | null;
  /** id da mensagem-resumo no chat (para marcar o resultado após o commit) */
  summaryMessageId?: string;
}

type ImportPhase = 'idle' | 'detecting' | 'awaiting-target' | 'parsing' | 'reviewing';

export default function NotaChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { session } = useAuth();
  const { categories, accounts, loadCategories, loadAccounts, loadTransactions } =
    useFinance();

  const [messages, setMessages] = useState<ReceiptChatMessage[]>([]);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // true só quando a leitura em curso é de imagem/QR (mostra o overlay premium)
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  // Texto da bolha do assistente enquanto processa (nota vs extrato)
  const [streamingLabel, setStreamingLabel] = useState('Lendo a nota...');

  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle');
  const [reviewVisible, setReviewVisible] = useState(false);

  const listRef = useRef<FlatList<ReceiptChatMessage>>(null);
  const scrollY = useSharedValue(0);

  const activeAccounts = accounts.filter((a) => a.is_active);

  useEffect(() => {
    loadCategories();
    loadAccounts();
    getCreditCards()
      .then(setCreditCards)
      .catch(() => setCreditCards([]));
  }, [loadCategories, loadAccounts]);

  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const appendAssistant = useCallback((content: string): string => {
    const id = generateId();
    setMessages((prev) => [...prev, { id, role: 'assistant', content }]);
    return id;
  }, []);

  const runExtraction = useCallback(
    async (request: ExtractionRequest) => {
      if (isLoading) return;

      if (!session?.access_token) {
        setError('Voce precisa estar logado para usar o assistente.');
        return;
      }

      setError(null);
      setIsLoading(true);
      setStreamingLabel('Lendo a nota...');
      setIsScanningReceipt(!!(request.imageUri || request.qrData));

      const userMessage: ReceiptChatMessage = {
        id: generateId(),
        role: 'user',
        content: request.displayText,
        imageUri: request.imageUri,
      };
      const assistantId = generateId();

      setMessages((prev) => [
        ...prev,
        userMessage,
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ]);

      try {
        let imageBase64: string | undefined;
        if (request.imageUri) {
          // Reduz a foto para caber no limite do endpoint e baratear a visão
          const manipulated = await manipulateAsync(
            request.imageUri,
            [{ resize: { width: 1280 } }],
            { compress: 0.7, format: SaveFormat.JPEG, base64: true }
          );
          imageBase64 = manipulated.base64 ?? undefined;
        }

        const result = await extractReceipt({
          accessToken: session.access_token,
          text: request.text,
          qrData: request.qrData,
          imageBase64,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: result.message,
                  isStreaming: false,
                  draft: result.draft ?? undefined,
                }
              : m
          )
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erro ao interpretar a nota';
        setError(message);
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsLoading(false);
        setIsScanningReceipt(false);
      }
    },
    [isLoading, session?.access_token]
  );

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    runExtraction({ text: content, displayText: content });
  }, [input, isLoading, runExtraction]);

  const handleQrScanned = useCallback(
    (data: string) => {
      setScannerVisible(false);
      runExtraction({
        qrData: data,
        text: input.trim() || undefined,
        displayText: 'QR code da nota fiscal escaneado',
      });
      setInput('');
    },
    [input, runExtraction]
  );

  const sendImage = useCallback(
    (uri: string) => {
      const text = input.trim();
      setInput('');
      runExtraction({
        imageUri: uri,
        text: text || undefined,
        displayText: text || 'Foto da nota anexada',
      });
    },
    [input, runExtraction]
  );

  const handleAttachImage = useCallback(() => {
    if (isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Anexar nota', 'De onde vem a imagem?', [
      {
        text: 'Tirar foto',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            setError('Permissao de camera negada.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!result.canceled && result.assets[0]) {
            sendImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Escolher da galeria',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]) {
            sendImage(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, [isLoading, sendImage]);

  // ==========================================================================
  // Importação de extrato bancário
  // ==========================================================================

  const resetImport = useCallback(() => {
    setPendingImport(null);
    setImportPhase('idle');
    setReviewVisible(false);
  }, []);

  const handleImportStatement = useCallback(async () => {
    if (isLoading || importPhase !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (activeAccounts.length === 0 && creditCards.length === 0) {
      appendAssistant(
        'Para importar um extrato, primeiro cadastre uma conta (ou um cartão) na tela de Contas. Depois é só voltar aqui!'
      );
      return;
    }

    let file: PickedStatementFile | null;
    try {
      file = await pickStatementFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ler o arquivo');
      return;
    }
    if (!file) return;

    setError(null);
    const assistantId = generateId();
    setStreamingLabel('Analisando o arquivo...');
    setMessages((prev) => [
      ...prev,
      { id: generateId(), role: 'user', content: `Extrato anexado: ${file.name}` },
      { id: assistantId, role: 'assistant', content: '', isStreaming: true },
    ]);
    setImportPhase('detecting');

    let detect: DetectStatementResponse | undefined;
    try {
      detect = await detectStatement(file);
    } catch {
      // Falha do detect não é fatal: cai na escolha manual do destino
      detect = undefined;
    }

    let prompt: string;
    if (detect?.document_kind === 'CREDIT_CARD_INVOICE') {
      prompt =
        creditCards.length > 0
          ? `Parece uma fatura de cartão${detect.bank_name ? ` do ${detect.bank_name}` : ''}. De qual cartão é?`
          : 'Parece uma fatura de cartão, mas você não tem cartões cadastrados. Escolha uma conta para importar como extrato ou cadastre o cartão antes.';
    } else if (detect?.document_kind === 'ACCOUNT_STATEMENT' && detect.detected_account_id) {
      const detected = activeAccounts.find((a) => a.id === detect!.detected_account_id);
      prompt = detected
        ? `Parece um extrato${detect.bank_name ? ` do ${detect.bank_name}` : ''} da conta ${detected.name}. Confirma o destino?`
        : 'Reconheci um extrato bancário. Em qual conta devo lançar as transações?';
    } else {
      prompt =
        'Não reconheci a conta automaticamente. Em qual conta (ou cartão) devo lançar as transações?';
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantId ? { ...m, content: prompt, isStreaming: false } : m
      )
    );
    setPendingImport({ file, detect });
    setImportPhase('awaiting-target');
  }, [
    isLoading,
    importPhase,
    activeAccounts,
    creditCards,
    appendAssistant,
  ]);

  const handleTargetChosen = useCallback(
    async (target: ImportTarget, targetLabel: string) => {
      if (!pendingImport) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const assistantId = generateId();
      setStreamingLabel('Lendo o extrato com IA... isso pode levar até um minuto.');
      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: 'user', content: `Importar para ${targetLabel}` },
        { id: assistantId, role: 'assistant', content: '', isStreaming: true },
      ]);
      setImportPhase('parsing');

      try {
        const parseResponse = await parseStatement(pendingImport.file, target);
        const { transactions } = parseResponse;
        // Ajuste da fatura anterior: só existe em fatura de cartão e precisa
        // do mês de referência para ser aplicado no confirm
        const invoiceAdjustment: InvoiceAdjustment | null =
          parseResponse.invoice_month && parseResponse.invoice_previous_balance
            ? {
                invoice_month: parseResponse.invoice_month,
                amount: parseResponse.invoice_previous_balance,
              }
            : null;

        if (transactions.length === 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content:
                      'Não encontrei transações nesse arquivo. Confira se é um extrato válido ou tente exportar em outro formato.',
                    isStreaming: false,
                  }
                : m
            )
          );
          resetImport();
          return;
        }

        // Duplicatas exatas (FITID já importado) ficam FORA da revisão:
        // reimportar o mesmo arquivo não pode virar lançamento duplicado
        const fresh = transactions.filter((tx) => !tx.duplicate_exact);
        const alreadyImported = transactions.length - fresh.length;

        if (fresh.length === 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: `Boa notícia: as ${transactions.length} transações desse arquivo já estão todas lançadas — você as importou antes. Nada novo para importar.`,
                    isStreaming: false,
                  }
                : m
            )
          );
          resetImport();
          return;
        }

        const count = fresh.length;
        const skippedNote =
          alreadyImported > 0
            ? ` Deixei de fora ${alreadyImported} ${alreadyImported === 1 ? 'transação que você já tinha importado' : 'transações que você já tinha importado'} antes.`
            : '';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `Encontrei ${count} transaç${count === 1 ? 'ão nova' : 'ões novas'} em ${pendingImport.file.name}, já categorizadas.${skippedNote} Revise e confirme a importação.`,
                  isStreaming: false,
                  statementImport: {
                    fileName: pendingImport.file.name,
                    targetLabel,
                    transactionCount: count,
                  },
                }
              : m
          )
        );
        setPendingImport((prev) =>
          prev
            ? {
                ...prev,
                target,
                targetLabel,
                transactions: fresh,
                alreadyImportedCount: alreadyImported,
                invoiceAdjustment,
                summaryMessageId: assistantId,
              }
            : prev
        );
        setImportPhase('reviewing');
        setReviewVisible(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao processar o extrato');
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        resetImport();
      }
    },
    [pendingImport, resetImport]
  );

  const handleImportCommitted = useCallback(
    (result: ConfirmImportResult, _includedCount: number) => {
      const summaryId = pendingImport?.summaryMessageId;
      const targetLabel = pendingImport?.targetLabel;

      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === summaryId && m.statementImport
            ? { ...m, statementImport: { ...m.statementImport, result } }
            : m
        ),
        {
          id: generateId(),
          role: 'assistant' as const,
          content: `Prontinho! Importei ${result.transactions_created} lançamento(s)${
            result.transfers_created > 0
              ? ` e ${result.transfers_created} transferência(s)`
              : ''
          }${targetLabel ? ` para ${targetLabel}` : ''}. Pode conferir na aba de transações.`,
        },
      ]);
      resetImport();
      loadTransactions();
      loadAccounts();
    },
    [pendingImport, resetImport, loadTransactions, loadAccounts]
  );

  const handleClearChat = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMessages([]);
    setError(null);
    resetImport();
    setConfirmClearVisible(false);
  }, [resetImport]);

  const handleConfirmDraft = useCallback(
    async (messageId: string, draft: TransactionDraft, data: DraftConfirmation) => {
      const dueDate = draft.due_date ?? new Date().toISOString().split('T')[0];

      const transaction = await createTransaction({
        type: draft.type,
        category_id: data.categoryId,
        account_id: data.accountId,
        credit_card_id: data.creditCardId,
        description: draft.description,
        amount: data.amount,
        due_date: dueDate,
        notes: draft.notes ?? undefined,
      });

      // Nota fiscal = compra já realizada: em conta, marca como paga na data
      // da nota. No cartão fica pendente e entra na fatura.
      if (data.accountId) {
        try {
          await payTransaction(transaction.id, { payment_date: dueDate });
        } catch {
          // Transação criada; falha ao marcar como paga não deve travar o fluxo
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const sourceName = data.creditCardId
        ? creditCards.find((c) => c.id === data.creditCardId)?.name
        : accounts.find((a) => a.id === data.accountId)?.name;

      setMessages((prev) => [
        ...prev.map((m) =>
          m.id === messageId ? { ...m, savedTransactionId: transaction.id } : m
        ),
        {
          id: generateId(),
          role: 'assistant',
          content: `Prontinho! Lancei ${formatCurrency(data.amount)} em "${draft.description}"${sourceName ? ` (${sourceName})` : ''}. Pode escanear a próxima nota quando quiser.`,
        },
      ]);

      loadTransactions();
    },
    [accounts, creditCards, loadTransactions]
  );

  const openReview = useCallback(() => setReviewVisible(true), []);

  const renderItem = useCallback(
    ({ item }: { item: ReceiptChatMessage }) => {
      const isUser = item.role === 'user';

      if (isUser) {
        return (
          <View style={styles.userRow}>
            <View
              style={[styles.bubble, styles.userBubble, { backgroundColor: NOTA_BUBBLE }]}
            >
              {item.imageUri && (
                <Image source={{ uri: item.imageUri }} style={styles.attachedImage} />
              )}
              <Text style={[styles.bubbleText, { color: colors.textOnPrimary }]}>
                {item.content}
              </Text>
            </View>
          </View>
        );
      }

      if (item.isStreaming && !item.content) {
        return (
          <View style={styles.assistantRow}>
            <AvatarBadge />
            {/* Bolha do assistente em material frosted (camada de conteúdo) */}
            <GlassSurface variant="material" style={[styles.bubble, styles.assistantBubble]}>
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color={NOTA_ACCENT} />
                <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>
                  {streamingLabel}
                </Text>
              </View>
            </GlassSurface>
          </View>
        );
      }

      return (
        <View style={styles.assistantRow}>
          <AvatarBadge />
          <View style={styles.assistantColumn}>
            <GlassSurface variant="material" style={[styles.bubble, styles.assistantBubble]}>
              <Text style={[styles.bubbleText, { color: colors.text }]}>{item.content}</Text>
            </GlassSurface>
            {item.draft && (
              <ReceiptDraftCard
                draft={item.draft}
                categories={categories}
                accounts={accounts}
                creditCards={creditCards}
                saved={!!item.savedTransactionId}
                onConfirm={(data) => handleConfirmDraft(item.id, item.draft!, data)}
              />
            )}
            {item.statementImport && (
              <GlassSurface variant="material" style={styles.importCard}>
                <View style={styles.importCardHeader}>
                  <IconSymbol name="arrow.up.doc.fill" size={18} color={NOTA_ACCENT} />
                  <Text style={[styles.importCardTitle, { color: colors.text }]}>
                    {item.statementImport.fileName}
                  </Text>
                </View>
                <Text style={[styles.importCardMeta, { color: colors.textSecondary }]}>
                  {item.statementImport.transactionCount} transações ·{' '}
                  {item.statementImport.targetLabel}
                </Text>
                {item.statementImport.result ? (
                  <View style={styles.importCardDone}>
                    <IconSymbol name="checkmark.circle.fill" size={16} color={colors.success} />
                    <Text style={[styles.importCardDoneText, { color: colors.success }]}>
                      {item.statementImport.result.transactions_created} lançamento(s)
                      {item.statementImport.result.transfers_created > 0
                        ? ` · ${item.statementImport.result.transfers_created} transferência(s)`
                        : ''}{' '}
                      importado(s)
                    </Text>
                  </View>
                ) : (
                  <Button
                    label="Revisar transações"
                    size="sm"
                    onPress={openReview}
                    disabled={importPhase !== 'reviewing'}
                  />
                )}
              </GlassSurface>
            )}
          </View>
        </View>
      );
    },
    [
      accounts,
      categories,
      colors,
      creditCards,
      handleConfirmDraft,
      importPhase,
      openReview,
      streamingLabel,
    ]
  );

  // Bloco de escolha do destino da importação (acima da barra de input)
  const renderTargetChooser = () => {
    if (importPhase !== 'awaiting-target' || !pendingImport) return null;

    const detect = pendingImport.detect;
    const detectedAccount =
      detect?.document_kind === 'ACCOUNT_STATEMENT' && detect.detected_account_id
        ? activeAccounts.find((a) => a.id === detect.detected_account_id)
        : undefined;
    const isInvoice = detect?.document_kind === 'CREDIT_CARD_INVOICE';

    return (
      <View style={styles.targetChooser}>
        {detectedAccount && (
          <Pressable
            onPress={() =>
              handleTargetChosen(
                { account_id: detectedAccount.id },
                `Conta ${detectedAccount.name}`
              )
            }
            style={({ pressed }) => [pressed && styles.pressedScale]}
          >
            <GlassSurface variant="material" style={styles.targetChip}>
              <IconSymbol name="checkmark" size={16} color={NOTA_ACCENT} />
              <Text style={[styles.targetChipText, { color: colors.text }]}>
                Usar {detectedAccount.name}
              </Text>
            </GlassSurface>
          </Pressable>
        )}

        {isInvoice &&
          creditCards.map((card) => (
            <Pressable
              key={card.id}
              onPress={() =>
                handleTargetChosen({ credit_card_id: card.id }, `Cartão ${card.name}`)
              }
              style={({ pressed }) => [pressed && styles.pressedScale]}
            >
              <GlassSurface variant="material" style={styles.targetChip}>
                <IconSymbol name="creditcard" size={16} color={NOTA_ACCENT} />
                <Text style={[styles.targetChipText, { color: colors.text }]}>
                  Cartão {card.name}
                </Text>
              </GlassSurface>
            </Pressable>
          ))}

        {activeAccounts.length > 0 && (
          <AccountPickerChip
            accounts={activeAccounts}
            label={detectedAccount ? 'Trocar conta' : 'Escolher conta'}
            onSelect={(account) =>
              handleTargetChosen({ account_id: account.id }, `Conta ${account.name}`)
            }
          />
        )}

        {!isInvoice && !detectedAccount && creditCards.length > 0 && (
          creditCards.map((card) => (
            <Pressable
              key={card.id}
              onPress={() =>
                handleTargetChosen({ credit_card_id: card.id }, `Cartão ${card.name}`)
              }
              style={({ pressed }) => [pressed && styles.pressedScale]}
            >
              <GlassSurface variant="material" style={styles.targetChip}>
                <IconSymbol name="creditcard" size={16} color={NOTA_ACCENT} />
                <Text style={[styles.targetChipText, { color: colors.text }]}>
                  Cartão {card.name}
                </Text>
              </GlassSurface>
            </Pressable>
          ))
        )}

        <Pressable
          onPress={() => {
            appendAssistant('Importação cancelada. Quando quiser, é só anexar o extrato de novo.');
            resetImport();
          }}
          style={({ pressed }) => [styles.cancelTarget, pressed && styles.pressedScale]}
        >
          <Text style={[styles.cancelTargetText, { color: colors.textSecondary }]}>
            Cancelar
          </Text>
        </Pressable>
      </View>
    );
  };

  const canSend = input.trim().length > 0 && !isLoading;
  const importBusy = importPhase !== 'idle';

  const isDark = colorScheme === 'dark';
  const ambientColors = isDark
    ? (['#115E59', '#132a28', colors.background] as const)
    : (['#0D9488', '#7DD8CE', '#F6F7F9'] as const);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradiente ambiente da identidade da Nota: a camada de conteúdo dá
          ao vidro algo para refratar (edge-to-edge, atrás de tudo) */}
      <LinearGradient
        colors={ambientColors}
        locations={[0, 0.5, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <AvatarBadge size={64} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Oi, eu sou a Nota
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Escaneie o QR code da nota fiscal, fotografe o comprovante ou importe o
              extrato do banco. Eu leio, categorizo e lanço tudo — você só confirma.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable
                onPress={() => setScannerVisible(true)}
                style={({ pressed }) => [pressed && styles.pressedScale]}
              >
                {/* Ação em material frosted (camada de conteúdo) */}
                <GlassSurface variant="material" style={styles.emptyAction}>
                  <IconSymbol name="qrcode.viewfinder" size={20} color={NOTA_ACCENT} />
                  <Text style={[styles.emptyActionText, { color: colors.text }]}>
                    Escanear QR code da nota
                  </Text>
                </GlassSurface>
              </Pressable>
              <Pressable
                onPress={handleAttachImage}
                style={({ pressed }) => [pressed && styles.pressedScale]}
              >
                <GlassSurface variant="material" style={styles.emptyAction}>
                  <IconSymbol name="camera.fill" size={20} color={NOTA_ACCENT} />
                  <Text style={[styles.emptyActionText, { color: colors.text }]}>
                    Fotografar nota ou comprovante
                  </Text>
                </GlassSurface>
              </Pressable>
              <Pressable
                onPress={handleImportStatement}
                style={({ pressed }) => [pressed && styles.pressedScale]}
              >
                <GlassSurface variant="material" style={styles.emptyAction}>
                  <IconSymbol name="arrow.up.doc.fill" size={20} color={NOTA_ACCENT} />
                  <View style={styles.emptyActionColumn}>
                    <Text style={[styles.emptyActionText, { color: colors.text }]}>
                      Importar extrato do banco
                    </Text>
                    <Text style={[styles.emptyActionHint, { color: colors.textSecondary }]}>
                      Prefira OFX: mais preciso e sem duplicatas
                    </Text>
                  </View>
                </GlassSurface>
              </Pressable>
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              scrollY.value = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          />
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
            <IconSymbol name="exclamationmark.circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {renderTargetChooser()}

        {/* Input bar: controles flutuando sobre o gradiente, sem borda sólida */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom, Spacing.md) },
          ]}
        >
          {/* Botões de ferramenta: círculos de Liquid Glass; feedback por
              escala e ícone esmaecido quando desabilitado (nunca opacity
              em ancestral de GlassSurface) */}
          <Pressable
            onPress={() => setScannerVisible(true)}
            disabled={isLoading}
            accessibilityLabel="Escanear QR code"
            style={({ pressed }) => [pressed && styles.pressedScale]}
          >
            <GlassSurface variant="glass" isInteractive style={styles.toolButton}>
              <IconSymbol
                name="qrcode.viewfinder"
                size={22}
                color={isLoading ? colors.textSecondary : NOTA_ACCENT}
              />
            </GlassSurface>
          </Pressable>
          <Pressable
            onPress={handleAttachImage}
            disabled={isLoading}
            accessibilityLabel="Anexar foto da nota"
            style={({ pressed }) => [pressed && styles.pressedScale]}
          >
            <GlassSurface variant="glass" isInteractive style={styles.toolButton}>
              <IconSymbol
                name="camera.fill"
                size={20}
                color={isLoading ? colors.textSecondary : NOTA_ACCENT}
              />
            </GlassSurface>
          </Pressable>
          <Pressable
            onPress={handleImportStatement}
            disabled={isLoading || importBusy}
            accessibilityLabel="Importar extrato bancário"
            style={({ pressed }) => [pressed && styles.pressedScale]}
          >
            <GlassSurface variant="glass" isInteractive style={styles.toolButton}>
              <IconSymbol
                name="arrow.up.doc.fill"
                size={20}
                color={isLoading || importBusy ? colors.textSecondary : NOTA_ACCENT}
              />
            </GlassSurface>
          </Pressable>
          {/* Campo de texto em cápsula de material frosted; o anel "IA"
              acende no foco e enquanto a Nota lê */}
          <AIRing
            width={RING_WIDTH}
            borderRadius={22 + RING_WIDTH}
            active={inputFocused || isLoading}
            colors={NOTA_RING_GRADIENT}
            style={styles.inputRing}
          >
            <GlassSurface variant="material" style={styles.inputCapsule}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={input}
                onChangeText={setInput}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Descreva a compra..."
                placeholderTextColor={colors.textSecondary}
                maxLength={MAX_MESSAGE_LENGTH}
                multiline
                editable={!isLoading}
                onSubmitEditing={handleSend}
                submitBehavior="submit"
                returnKeyType="send"
              />
              {input.length >= MAX_MESSAGE_LENGTH - 100 && (
                <Text style={[styles.charCounter, { color: colors.textSecondary }]}>
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </Text>
              )}
            </GlassSurface>
          </AIRing>
          {/* Enviar: pill do design system (unificado) */}
          <Button
            iconOnly
            icon="arrow-up"
            size="md"
            onPress={handleSend}
            loading={isLoading}
            disabled={!canSend}
            accessibilityLabel="Enviar mensagem"
          />
        </View>
      </KeyboardAvoidingView>

      {/* Header integrado ao corpo: transparente em repouso, um corpo só com
          o conteúdo. Renderizado por último para o material de sistema se
          materializar atrás dele (blur no header todo) quando a conversa
          rola por baixo. */}
      <View style={styles.header}>
        <ScrollEdgeEffect scrollY={scrollY} />
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <AvatarBadge size={34} />
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Nota</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Notas, comprovantes e extratos
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {messages.length > 0 && (
              <Pressable
                onPress={() => setConfirmClearVisible(true)}
                accessibilityLabel="Limpar conversa"
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.pressedScale,
                ]}
              >
                <IconSymbol name="trash" size={20} color={colors.text} />
              </Pressable>
            )}
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Fechar chat"
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressedScale,
              ]}
            >
              <IconSymbol name="xmark" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Limpar é destrutivo e irreversível: sempre passa pelo alerta */}
      <ConfirmDialog
        visible={confirmClearVisible}
        title="Limpar conversa?"
        message="Todas as mensagens desta conversa serão apagadas, incluindo importações não confirmadas. Essa ação não pode ser desfeita."
        confirmLabel="Limpar"
        icon="trash"
        onConfirm={handleClearChat}
        onCancel={() => setConfirmClearVisible(false)}
      />

      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleQrScanned}
      />

      {pendingImport?.target && pendingImport.transactions && (
        <StatementReviewModal
          visible={reviewVisible}
          fileName={pendingImport.file.name}
          target={pendingImport.target}
          targetLabel={pendingImport.targetLabel ?? ''}
          transactions={pendingImport.transactions}
          alreadyImportedCount={pendingImport.alreadyImportedCount ?? 0}
          invoiceAdjustment={pendingImport.invoiceAdjustment ?? null}
          categories={categories}
          accounts={activeAccounts}
          onClose={() => setReviewVisible(false)}
          onCommitted={handleImportCommitted}
        />
      )}

      {/* Overlay premium enquanto lê a nota (só em imagem/QR) */}
      <ReceiptScanningLoader visible={isScanningReceipt} />
    </View>
  );
}

/** Chip que abre o AccountPicker (escolha manual do destino da importação) */
function AccountPickerChip({
  accounts,
  label,
  onSelect,
}: {
  accounts: FinanceAccount[];
  label: string;
  onSelect: (account: FinanceAccount) => void;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <AccountPicker
      accounts={accounts}
      selectedId={null}
      onSelect={onSelect}
      renderTrigger={({ open }) => (
        <Pressable onPress={open} style={({ pressed }) => [pressed && styles.pressedScale]}>
          <GlassSurface variant="material" style={styles.targetChip}>
            <IconSymbol name="wallet.pass" size={16} color={NOTA_ACCENT} />
            <Text style={[styles.targetChipText, { color: colors.text }]}>{label}</Text>
          </GlassSurface>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  header: {
    // Flutua sobre o conteúdo: transparente em repouso, o ScrollEdgeEffect
    // (absoluteFill) materializa o blur atrás dele durante o scroll
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEADER_BAR_HEIGHT,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedScale: {
    // Feedback de toque por escala (opacity quebraria o Liquid Glass)
    transform: [{ scale: 0.94 }],
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    // Começa abaixo do header flutuante; ao rolar, passa por baixo do blur
    paddingTop: HEADER_BAR_HEIGHT + Spacing.sm * 2 + Spacing.md,
    gap: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  assistantColumn: {
    flex: 1,
    gap: Spacing.xs,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  userBubble: {
    borderBottomRightRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: BorderRadius.sm,
  },
  bubbleText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  attachedImage: {
    width: 180,
    height: 180,
    borderRadius: BorderRadius.md,
  },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  thinkingText: {
    fontSize: FontSize.sm,
    flexShrink: 1,
  },
  importCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  importCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  importCardTitle: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  importCardMeta: {
    fontSize: FontSize.xs,
  },
  importCardDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  importCardDoneText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  emptyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyActionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  emptyActionColumn: {
    flex: 1,
    gap: 2,
  },
  emptyActionHint: {
    fontSize: FontSize.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  targetChooser: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  targetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  targetChipText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  cancelTarget: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cancelTargetText: {
    fontSize: FontSize.sm,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRing: {
    flex: 1,
  },
  inputCapsule: {
    // Cápsula: radius = altura mínima / 2
    borderRadius: 22,
    justifyContent: 'center',
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    fontSize: FontSize.md,
  },
  charCounter: {
    fontSize: FontSize.xs,
    textAlign: 'right',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
});
