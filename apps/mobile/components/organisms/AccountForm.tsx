import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/atoms/Button';
import { BankLogo } from '@/components/atoms/BankLogo';
import { MoneyText } from '@/components/atoms/MoneyText';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { TextField } from '@/components/atoms/TextField';
import { SelectableChip } from '@/components/molecules/SelectableChip';
import { BankPicker } from '@/components/organisms/BankPicker';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { obterPreset, resolveBankKey } from '@/lib/bancos-brasil';
import { contrastingTextColor } from '@/lib/color-contrast';
import {
  ACCOUNT_COLOR_PALETTE,
  ACCOUNT_TYPE_LABELS,
  formatCurrency,
} from '@/types/finance';
import type { AccountFormData, Bank, FinanceAccountType } from '@/types/finance';

const MAX_CENTS = 9_999_999_999; // R$ 99.999.999,99
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;
/** Ícone lucide (o app traduz para SF Symbol na renderização). */
export const DEFAULT_ACCOUNT_ICON = 'Wallet';
/** Cor usada até o banco escolhido ditar a identidade visual da conta. */
export const DEFAULT_ACCOUNT_COLOR = '#2563eb';

/**
 * Banco é obrigatório por regra de produto nos tipos com instituição
 * emissora. Carteira (dinheiro em espécie) e investimento se identificam
 * pela cor + inicial do nome.
 */
const TYPES_REQUIRING_BANK: FinanceAccountType[] = [
  'CONTA_CORRENTE',
  'POUPANCA',
  'BENEFICIO',
];

const ACCOUNT_TYPE_ORDER: FinanceAccountType[] = [
  'CONTA_CORRENTE',
  'POUPANCA',
  'CARTEIRA',
  'INVESTIMENTO',
  'BENEFICIO',
];

const ACCOUNT_TYPE_ICONS: Record<
  FinanceAccountType,
  ComponentProps<typeof Ionicons>['name']
> = {
  CONTA_CORRENTE: 'business-outline',
  POUPANCA: 'save-outline',
  CARTEIRA: 'cash-outline',
  INVESTIMENTO: 'trending-up-outline',
  BENEFICIO: 'fast-food-outline',
};

/** Valores iniciais do formulário; na edição vêm da conta carregada. */
export interface AccountFormInitialValues {
  type: FinanceAccountType;
  bank: Bank | null;
  name: string;
  /** Saldo inicial em CENTAVOS (o estado do formulário trabalha em centavos). */
  cents: number;
  color: string;
  icon: string;
}

interface AccountFormProps {
  /**
   * `edit` trava o tipo da conta: o updateAccountSchema da API não aceita
   * `type`, então ele vira informação estática em vez de chips.
   */
  mode: 'create' | 'edit';
  initialValues?: Partial<AccountFormInitialValues>;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (data: AccountFormData) => void;
  /** Conteúdo extra no fim do formulário (ex.: zona de exclusão na edição). */
  footer?: ReactNode;
  /**
   * Saldo atual da conta (só na edição). Com ele presente, o formulário
   * mostra os saldos em modo leitura e delega correções ao fluxo de
   * "Ajustar saldo" — editar o saldo inicial disfarçado de saldo atual
   * confunde (era o bug: -15.000 → digitou 10.000 → virou -5.000).
   */
  currentBalance?: number;
  /** Abre o fluxo de reajuste de saldo (obrigatório junto de currentBalance). */
  onAdjustBalance?: () => void;
}

/**
 * Formulário compartilhado de conta (criar e editar). Concentra os defaults
 * inteligentes do banco, o saldo em centavos e o que falta para salvar — as
 * telas só decidem o que fazer com os dados no submit.
 */
export function AccountForm({
  mode,
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  footer,
  currentBalance,
  onAdjustBalance,
}: AccountFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();

  const isEdit = mode === 'edit';

  const [type, setType] = useState<FinanceAccountType>(
    initialValues?.type ?? 'CONTA_CORRENTE'
  );
  const [bank, setBank] = useState<Bank | null>(initialValues?.bank ?? null);
  const [name, setName] = useState(initialValues?.name ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  // Distingue "nome preenchido pelo banco" de "nome digitado": só o segundo
  // sobrevive à troca de banco. Na edição o que já está em tela é escolha do
  // usuário, então nasce protegido.
  const [nameEdited, setNameEdited] = useState(isEdit);
  const [cents, setCents] = useState(initialValues?.cents ?? 0);
  const [color, setColor] = useState<string>(
    initialValues?.color ?? DEFAULT_ACCOUNT_COLOR
  );
  const [colorEdited, setColorEdited] = useState(isEdit);
  const [bankClearedNotice, setBankClearedNotice] = useState<string | null>(null);

  // Guarda contra duplo toque: `isSubmitting` só chega no próximo render, então
  // o ref segura os toques até a tela terminar de salvar.
  const submittingRef = useRef(false);
  useEffect(() => {
    if (!isSubmitting) submittingRef.current = false;
  }, [isSubmitting]);

  const icon = initialValues?.icon ?? DEFAULT_ACCOUNT_ICON;

  const isBenefit = type === 'BENEFICIO';
  const bankRequired = TYPES_REQUIRING_BANK.includes(type);
  const bankLabel = isBenefit ? 'Empresa' : 'Banco';

  const trimmedName = name.trim();
  const nameError = nameTouched && trimmedName.length < MIN_NAME_LENGTH;

  // O que falta para salvar — exibido acima do CTA, para o botão desabilitado
  // nunca ficar mudo.
  const missingHint = useMemo(() => {
    if (bankRequired && !bank) {
      return isBenefit
        ? 'Escolha uma empresa para continuar'
        : 'Escolha um banco para continuar';
    }
    if (trimmedName.length < MIN_NAME_LENGTH) {
      return 'Dê um nome com pelo menos 2 letras à conta';
    }
    return null;
  }, [bankRequired, bank, isBenefit, trimmedName]);

  const canSubmit = !missingHint && !isSubmitting;

  const handleTypeChange = (next: FinanceAccountType) => {
    if (next === type) return;
    Haptics.selectionAsync();
    // Bancos e empresas de benefício são catálogos disjuntos: trocar entre
    // eles invalida a escolha anterior. Avisamos em vez de limpar em silêncio.
    const crossesBenefit = (next === 'BENEFICIO') !== isBenefit;
    if (crossesBenefit && bank) {
      setBank(null);
      setBankClearedNotice(
        next === 'BENEFICIO'
          ? 'O banco selecionado foi limpo.'
          : 'A empresa selecionada foi limpa.'
      );
    }
    setType(next);
  };

  const handleSelectBank = (selected: Bank) => {
    setBank(selected);
    setBankClearedNotice(null);
    // Defaults inteligentes: só preenchem o que o usuário ainda não personalizou.
    // Trocar de banco reescreve o nome/cor herdados do banco anterior, mas nunca
    // o que o usuário digitou ou escolheu à mão.
    if (!nameEdited) setName(selected.name);
    if (!colorEdited) {
      const key = resolveBankKey(selected.name);
      const preset = key ? obterPreset(key) : null;
      setColor(preset?.fundo ?? DEFAULT_ACCOUNT_COLOR);
    }
  };

  const handleNameChange = (text: string) => {
    setNameEdited(true);
    setName(text);
  };

  // Entrada em centavos via teclado do dispositivo: descarta não-dígitos
  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    setCents(digits ? Math.min(parseInt(digits, 10), MAX_CENTS) : 0);
  };

  const handleSelectColor = (next: string) => {
    Haptics.selectionAsync();
    setColorEdited(true);
    setColor(next);
  };

  const handleSubmit = () => {
    if (submittingRef.current) return;
    if (!canSubmit) {
      setNameTouched(true);
      return;
    }
    submittingRef.current = true;
    Keyboard.dismiss();
    onSubmit({
      name: trimmedName,
      type,
      bank_id: bank?.id ?? null,
      initial_balance: cents / 100, // API espera REAIS, não centavos
      color,
      icon,
    });
  };

  const chipBg = 'rgba(255,255,255,0.10)';
  const chipBorder = 'rgba(255,255,255,0.16)';

  // A cor de marca do banco raramente está na paleta: mostramos ela primeiro
  // para o selecionado nunca ficar sem swatch visível.
  const swatches = useMemo(
    () =>
      ACCOUNT_COLOR_PALETTE.includes(color as (typeof ACCOUNT_COLOR_PALETTE)[number])
        ? [...ACCOUNT_COLOR_PALETTE]
        : [color, ...ACCOUNT_COLOR_PALETTE],
    [color]
  );

  return (
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
        {/* Tipo de conta — imutável na edição (a API não aceita trocar) */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Tipo de conta
          </Text>
          {isEdit ? (
            <>
              <View style={styles.staticType}>
                <Ionicons
                  name={ACCOUNT_TYPE_ICONS[type]}
                  size={16}
                  color={colors.textSecondary}
                />
                <Text style={[styles.staticTypeText, { color: colors.text }]}>
                  {ACCOUNT_TYPE_LABELS[type]}
                </Text>
              </View>
              <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                O tipo não pode ser alterado depois que a conta é criada.
              </Text>
            </>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
              keyboardShouldPersistTaps="handled"
            >
              {ACCOUNT_TYPE_ORDER.map((option) => (
                <SelectableChip
                  key={option}
                  label={ACCOUNT_TYPE_LABELS[option]}
                  icon={ACCOUNT_TYPE_ICONS[option]}
                  selected={option === type}
                  onToggle={() => handleTypeChange(option)}
                  accessibilityRole="radio"
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Banco / empresa de benefício */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            {bankRequired ? bankLabel : `${bankLabel} (opcional)`}
          </Text>
          <BankPicker
            accountType={type}
            selected={bank}
            onSelect={handleSelectBank}
            renderTrigger={({ open, selected }) => (
              <TouchableOpacity
                style={[
                  styles.chip,
                  { backgroundColor: chipBg, borderColor: chipBorder },
                ]}
                onPress={() => {
                  Keyboard.dismiss();
                  open();
                }}
              >
                {selected ? (
                  <BankLogo
                    bank={selected.name}
                    size={16}
                    formato="circulo"
                    fallback={
                      <Ionicons
                        name="business-outline"
                        size={15}
                        color={colors.textSecondary}
                      />
                    }
                  />
                ) : (
                  <Ionicons
                    name="business-outline"
                    size={15}
                    color={colors.textSecondary}
                  />
                )}
                <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                  {selected ? selected.name : bankLabel}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
          {bankClearedNotice ? (
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              {bankClearedNotice}
            </Text>
          ) : null}
        </View>

        {/* Nome */}
        <View style={styles.field}>
          <TextField
            label="Nome da conta"
            value={name}
            onChangeText={handleNameChange}
            onBlur={() => setNameTouched(true)}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={MAX_NAME_LENGTH}
            returnKeyType="done"
            error={nameError}
          />
          {nameError ? (
            <Text style={[styles.helperText, { color: colors.danger }]}>
              Use pelo menos 2 caracteres.
            </Text>
          ) : null}
        </View>

        {/* Saldo: na criação é o campo herói editável; na edição vira leitura
            + "Ajustar saldo" (mexer no saldo inicial aqui confundia — o
            usuário achava que estava definindo o saldo atual) */}
        {isEdit && currentBalance !== undefined ? (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Saldo
            </Text>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                Saldo atual
              </Text>
              <MoneyText value={currentBalance} style={styles.balanceValue} />
            </View>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                Saldo inicial
              </Text>
              <MoneyText value={cents / 100} style={styles.balanceValue} />
            </View>
            <Button
              label="Ajustar saldo"
              variant="secondary"
              size="sm"
              onPress={onAdjustBalance}
            />
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              O saldo atual vem das suas movimentações. Para corrigi-lo, use o
              ajuste — assim o histórico continua batendo.
            </Text>
          </View>
        ) : (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Saldo inicial
            </Text>
            <TextInput
              style={[styles.amount, { color: colors.text }]}
              value={cents > 0 ? formatCurrency(cents / 100) : ''}
              onChangeText={handleAmountChange}
              placeholder={formatCurrency(0)}
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              textAlign="center"
              accessibilityLabel="Saldo inicial da conta"
            />
          </View>
        )}

        {/* Cor */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Cor
          </Text>
          <View style={styles.colorGrid}>
            {swatches.map((swatch) => {
              const isSelected = swatch === color;
              return (
                <Pressable
                  key={swatch}
                  onPress={() => handleSelectColor(swatch)}
                  // O círculo tem 32px; o hitSlop leva a área de toque ao
                  // mínimo de 44pt sem abrir buraco entre swatches vizinhos.
                  hitSlop={6}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`Cor ${swatch}`}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: swatch },
                    isSelected && styles.colorSwatchSelected,
                  ]}
                >
                  {isSelected ? (
                    <IconSymbol
                      name="checkmark"
                      size={16}
                      color={contrastingTextColor(swatch)}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {footer}
      </ScrollView>

      {/* CTA */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        {missingHint ? (
          <Text style={[styles.missingHint, { color: colors.textSecondary }]}>
            {missingHint}
          </Text>
        ) : null}
        <Button
          label={submitLabel}
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!canSubmit}
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
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
    paddingBottom: Spacing['2xl'],
    gap: Spacing.xl,
  },
  field: {
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  helperText: {
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 260,
  },
  chipText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    flexShrink: 1,
  },
  staticType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  balanceLabel: {
    fontSize: FontSize.sm,
  },
  balanceValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  staticTypeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  amount: {
    fontSize: 40,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  bottomBar: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  missingHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
