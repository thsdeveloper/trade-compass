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
  getCreditCards,
  payTransaction,
} from '@/lib/finance-api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { QrScannerModal } from '@/components/agent/QrScannerModal';
import {
  ReceiptDraftCard,
  type DraftConfirmation,
} from '@/components/agent/ReceiptDraftCard';
import type { ReceiptChatMessage, TransactionDraft } from '@/types/agent';
import type { FinanceCreditCard } from '@/types/finance';
import { formatCurrency } from '@/types/finance';

const NOTA_GRADIENT = ['#0D9488', '#14B8A6', '#2DD4BF'] as const;

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const listRef = useRef<FlatList<ReceiptChatMessage>>(null);

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

  const runExtraction = useCallback(
    async (request: ExtractionRequest) => {
      if (isLoading) return;

      if (!session?.access_token) {
        setError('Voce precisa estar logado para usar o assistente.');
        return;
      }

      setError(null);
      setIsLoading(true);

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
          content: `Prontinho! Lançei ${formatCurrency(data.amount)} em "${draft.description}"${sourceName ? ` (${sourceName})` : ''}. Pode escanear a próxima nota quando quiser.`,
        },
      ]);

      loadTransactions();
    },
    [accounts, creditCards, loadTransactions]
  );

  const renderItem = useCallback(
    ({ item }: { item: ReceiptChatMessage }) => {
      const isUser = item.role === 'user';

      if (isUser) {
        return (
          <View style={styles.userRow}>
            <View
              style={[styles.bubble, styles.userBubble, { backgroundColor: colors.primary }]}
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
            <View
              style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.surface }]}
            >
              <View style={styles.thinkingRow}>
                <ActivityIndicator size="small" color="#14B8A6" />
                <Text style={[styles.thinkingText, { color: colors.textSecondary }]}>
                  Lendo a nota...
                </Text>
              </View>
            </View>
          </View>
        );
      }

      return (
        <View style={styles.assistantRow}>
          <AvatarBadge />
          <View style={styles.assistantColumn}>
            <View
              style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.bubbleText, { color: colors.text }]}>{item.content}</Text>
            </View>
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
          </View>
        </View>
      );
    },
    [accounts, categories, colors, creditCards, handleConfirmDraft]
  );

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <AvatarBadge size={34} />
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Nota</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Lance gastos por nota fiscal
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {messages.length > 0 && (
            <Pressable
              onPress={() => setMessages([])}
              style={styles.headerButton}
              accessibilityLabel="Limpar conversa"
            >
              <IconSymbol name="trash" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
          <Pressable
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityLabel="Fechar chat"
          >
            <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <AvatarBadge size={64} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Recebeu uma notinha?
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Escaneie o QR code da nota fiscal, fotografe o cupom ou descreva a
              compra. Eu preencho tudo — você só confirma a conta ou o cartão.
            </Text>
            <View style={styles.emptyActions}>
              <Pressable
                onPress={() => setScannerVisible(true)}
                style={({ pressed }) => [
                  styles.emptyAction,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <IconSymbol name="qrcode.viewfinder" size={20} color="#14B8A6" />
                <Text style={[styles.emptyActionText, { color: colors.text }]}>
                  Escanear QR code da nota
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAttachImage}
                style={({ pressed }) => [
                  styles.emptyAction,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <IconSymbol name="camera.fill" size={20} color="#14B8A6" />
                <Text style={[styles.emptyActionText, { color: colors.text }]}>
                  Fotografar nota ou comprovante
                </Text>
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
          />
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
            <IconSymbol name="exclamationmark.circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          <Pressable
            onPress={() => setScannerVisible(true)}
            disabled={isLoading}
            accessibilityLabel="Escanear QR code"
            style={({ pressed }) => [
              styles.toolButton,
              { backgroundColor: colors.surface },
              (pressed || isLoading) && { opacity: 0.6 },
            ]}
          >
            <IconSymbol name="qrcode.viewfinder" size={22} color="#14B8A6" />
          </Pressable>
          <Pressable
            onPress={handleAttachImage}
            disabled={isLoading}
            accessibilityLabel="Anexar foto da nota"
            style={({ pressed }) => [
              styles.toolButton,
              { backgroundColor: colors.surface },
              (pressed || isLoading) && { opacity: 0.6 },
            ]}
          >
            <IconSymbol name="camera.fill" size={20} color="#14B8A6" />
          </Pressable>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="Descreva a compra..."
            placeholderTextColor={colors.textSecondary}
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
            editable={!isLoading}
            onSubmitEditing={handleSend}
            submitBehavior="submit"
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            accessibilityLabel="Enviar mensagem"
            style={({ pressed }) => [pressed && canSend && { opacity: 0.8 }]}
          >
            <LinearGradient
              colors={NOTA_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol name="arrow.up" size={20} color="#FFFFFF" />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleQrScanned}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    padding: Spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
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
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  emptyActionText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    fontSize: FontSize.md,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
