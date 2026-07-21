import { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { MoneyText } from '@/components/atoms/MoneyText';
import { BorderRadius, Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createTransaction,
  getAdjustmentCategory,
  payTransaction,
  updateAccount,
} from '@/lib/finance-api';
import { formatCurrency } from '@/types/finance';
import type { FinanceAccount } from '@/types/finance';

const MAX_CENTS = 9_999_999_999; // R$ 99.999.999,99

type AdjustmentMode = 'transaction' | 'initial_balance';

interface AdjustBalanceModalProps {
  visible: boolean;
  account: FinanceAccount;
  onClose: () => void;
  /** Chamado após o ajuste ser salvo (o pai recarrega contas/transações) */
  onAdjusted: () => void;
}

/**
 * Reajuste de saldo da conta (Atomic Design · organismo), espelhando a web:
 * o usuário informa o SALDO ATUAL desejado e escolhe entre criar uma
 * transação de ajuste (mantém o histórico batendo) ou alterar o saldo
 * inicial. Nunca edita o saldo inicial "disfarçado de saldo atual" — a
 * confusão que este modal existe para eliminar.
 */
export function AdjustBalanceModal({
  visible,
  account,
  onClose,
  onAdjusted,
}: AdjustBalanceModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();

  const [cents, setCents] = useState(0);
  const [negative, setNegative] = useState(false);
  const [mode, setMode] = useState<AdjustmentMode>('transaction');
  const [description, setDescription] = useState('Ajuste de saldo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reabre sempre partindo do saldo atual real da conta
  useEffect(() => {
    if (visible) {
      setCents(Math.min(Math.round(Math.abs(account.current_balance) * 100), MAX_CENTS));
      setNegative(account.current_balance < 0);
      setMode('transaction');
      setDescription('Ajuste de saldo');
      setError(null);
    }
  }, [visible, account.current_balance]);

  const newBalance = (negative ? -1 : 1) * (cents / 100);
  const diff = Math.round((newBalance - account.current_balance) * 100) / 100;

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    setCents(digits ? Math.min(parseInt(digits, 10), MAX_CENTS) : 0);
  };

  const handleConfirm = useCallback(async () => {
    if (saving || diff === 0) return;
    setSaving(true);
    setError(null);

    try {
      if (mode === 'transaction') {
        const type = diff > 0 ? 'RECEITA' : 'DESPESA';
        const today = new Date().toISOString().split('T')[0];
        const category = await getAdjustmentCategory(type);
        const transaction = await createTransaction({
          category_id: category.id,
          account_id: account.id,
          type,
          description: description.trim() || 'Ajuste de saldo',
          amount: Math.abs(diff),
          due_date: today,
        });
        // Ajuste é fato consumado: paga na hora para refletir no saldo
        await payTransaction(transaction.id, {
          paid_amount: Math.abs(diff),
          payment_date: today,
        });
      } else {
        await updateAccount(account.id, {
          initial_balance: account.initial_balance + diff,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAdjusted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ajustar o saldo');
    } finally {
      setSaving(false);
    }
  }, [saving, diff, mode, description, account, onAdjusted]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>Reajuste de saldo</Text>
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              Ajuste o saldo da conta {account.name}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            accessibilityLabel="Fechar reajuste de saldo"
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <IconSymbol name="xmark" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Saldo atual em destaque */}
          <View style={[styles.currentCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.currentLabel, { color: colors.textSecondary }]}>
              SALDO ATUAL
            </Text>
            <MoneyText value={account.current_balance} style={styles.currentValue} />
            <View style={styles.initialRow}>
              <Text style={[styles.initialLabel, { color: colors.textSecondary }]}>
                Saldo inicial da conta
              </Text>
              <MoneyText value={account.initial_balance} style={styles.initialValue} />
            </View>
          </View>

          {/* Novo saldo */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Novo saldo
            </Text>
            <View style={styles.amountRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync();
                  setNegative((v) => !v);
                }}
                accessibilityRole="switch"
                accessibilityState={{ checked: negative }}
                accessibilityLabel="Saldo negativo"
                style={[
                  styles.signToggle,
                  {
                    backgroundColor: negative ? colors.dangerLight : colors.card,
                    borderColor: negative ? colors.danger : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.signToggleText,
                    { color: negative ? colors.danger : colors.textSecondary },
                  ]}
                >
                  −
                </Text>
              </Pressable>
              <TextInput
                style={[styles.amount, { color: negative ? colors.danger : colors.text }]}
                value={cents > 0 ? formatCurrency(cents / 100) : ''}
                onChangeText={handleAmountChange}
                placeholder={formatCurrency(0)}
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                textAlign="center"
                accessibilityLabel="Novo saldo da conta"
              />
            </View>
            {diff !== 0 && (
              <Text
                style={[
                  styles.diffText,
                  { color: diff > 0 ? colors.success : colors.text },
                ]}
              >
                {diff > 0 ? 'Entrada' : 'Saída'} de {formatCurrency(Math.abs(diff))}{' '}
                para acertar o saldo
              </Text>
            )}
          </View>

          {/* Como aplicar o ajuste */}
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Você gostaria de...
            </Text>

            <Pressable
              onPress={() => setMode('transaction')}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === 'transaction' }}
              style={[
                styles.option,
                {
                  borderColor: mode === 'transaction' ? colors.primary : colors.border,
                  backgroundColor: mode === 'transaction' ? colors.card : 'transparent',
                },
              ]}
            >
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Criar transação de ajuste
              </Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                Cria uma transação de {diff > 0 ? 'receita' : 'despesa'} para balancear o
                saldo. O histórico continua batendo.
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('initial_balance')}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === 'initial_balance' }}
              style={[
                styles.option,
                {
                  borderColor: mode === 'initial_balance' ? colors.primary : colors.border,
                  backgroundColor:
                    mode === 'initial_balance' ? colors.card : 'transparent',
                },
              ]}
            >
              <Text style={[styles.optionTitle, { color: colors.text }]}>
                Alterar saldo inicial
              </Text>
              <Text style={[styles.optionDescription, { color: colors.textSecondary }]}>
                Recalcula o saldo desde o início da conta, sem criar lançamento.
              </Text>
            </Pressable>
          </View>

          {/* Descrição do lançamento (só no modo transação) */}
          {mode === 'transaction' && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Descrição do lançamento
              </Text>
              <TextInput
                style={[
                  styles.descriptionInput,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ajuste de saldo"
                placeholderTextColor={colors.textSecondary}
                maxLength={80}
              />
            </View>
          )}

          {error && (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
              <IconSymbol name="exclamationmark.circle" size={16} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View
          style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
        >
          {diff === 0 && (
            <Text style={[styles.footerHint, { color: colors.textSecondary }]}>
              O saldo já está correto.
            </Text>
          )}
          <Button
            label="Ajustar saldo"
            size="lg"
            fullWidth
            loading={saving}
            disabled={saving || diff === 0}
            onPress={handleConfirm}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
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
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  subtitle: {
    fontSize: FontSize.xs,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ scale: 0.94 }],
  },
  content: {
    padding: Spacing.xl,
    gap: Spacing.xl,
  },
  currentCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  currentLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    letterSpacing: 1,
  },
  currentValue: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  initialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  initialLabel: {
    fontSize: FontSize.sm,
  },
  initialValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    fontVariant: ['tabular-nums'],
  },
  field: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signToggleText: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  amount: {
    flex: 1,
    fontSize: 34,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
    paddingVertical: Spacing.sm,
  },
  diffText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
  },
  option: {
    borderWidth: 2,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: 2,
  },
  optionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  optionDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  descriptionInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
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
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  footerHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
