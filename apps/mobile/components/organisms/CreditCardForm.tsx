import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
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
import { CardBrandLogo } from '@/components/atoms/CardBrandLogo';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { TextField } from '@/components/atoms/TextField';
import { SelectableChip } from '@/components/molecules/SelectableChip';
import { CreditCardVisual } from '@/components/molecules/CreditCardVisual';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { contrastingTextColor } from '@/lib/color-contrast';
import {
  ACCOUNT_COLOR_PALETTE,
  CREDIT_CARD_BRAND_LABELS,
  formatCurrency,
} from '@/types/finance';
import type { CreditCardBrand, CreditCardFormData } from '@/types/finance';

const MAX_CENTS = 9_999_999_999; // R$ 99.999.999,99
const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 60;
/** Cor usada até o usuário escolher a identidade visual do cartão. */
export const DEFAULT_CARD_COLOR = '#1e293b';

const BRAND_ORDER: CreditCardBrand[] = [
  'VISA',
  'MASTERCARD',
  'ELO',
  'AMEX',
  'HIPERCARD',
  'OUTROS',
];

/** Valores iniciais do formulário; na edição vêm do cartão carregado. */
export interface CreditCardFormInitialValues {
  name: string;
  brand: CreditCardBrand;
  /** Limite total em CENTAVOS (o estado do formulário trabalha em centavos). */
  cents: number;
  closingDay: string;
  dueDay: string;
  color: string;
}

interface CreditCardFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<CreditCardFormInitialValues>;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (data: CreditCardFormData) => void;
  /** Limite disponível atual (só na edição), exibido no preview do cartão. */
  availableLimit?: number;
  /** Conteúdo extra no fim do formulário (ex.: zona de exclusão na edição). */
  footer?: ReactNode;
}

/** Dia válido de fatura: inteiro entre 1 e 31. */
function parseDay(text: string): number | null {
  if (!/^\d{1,2}$/.test(text)) return null;
  const day = parseInt(text, 10);
  return day >= 1 && day <= 31 ? day : null;
}

/**
 * Formulário compartilhado de cartão de crédito (criar e editar). O preview
 * no topo reflete cada escolha na hora — nome, bandeira, cor e limite — para
 * o usuário ver o cartão que está construindo.
 */
export function CreditCardForm({
  mode,
  initialValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  availableLimit,
  footer,
}: CreditCardFormProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];
  const insets = useSafeAreaInsets();

  const isEdit = mode === 'edit';

  const [name, setName] = useState(initialValues?.name ?? '');
  const [nameTouched, setNameTouched] = useState(false);
  const [brand, setBrand] = useState<CreditCardBrand>(initialValues?.brand ?? 'VISA');
  const [cents, setCents] = useState(initialValues?.cents ?? 0);
  const [closingDay, setClosingDay] = useState(initialValues?.closingDay ?? '');
  const [dueDay, setDueDay] = useState(initialValues?.dueDay ?? '');
  const [daysTouched, setDaysTouched] = useState(false);
  const [color, setColor] = useState(initialValues?.color ?? DEFAULT_CARD_COLOR);

  // Guarda contra duplo toque: `isSubmitting` só chega no próximo render,
  // então o ref segura os toques até a tela terminar de salvar.
  const submittingRef = useRef(false);
  useEffect(() => {
    if (!isSubmitting) submittingRef.current = false;
  }, [isSubmitting]);

  const trimmedName = name.trim();
  const nameError = nameTouched && trimmedName.length < MIN_NAME_LENGTH;

  const parsedClosing = parseDay(closingDay);
  const parsedDue = parseDay(dueDay);
  const closingError = daysTouched && closingDay.length > 0 && parsedClosing === null;
  const dueError = daysTouched && dueDay.length > 0 && parsedDue === null;

  // O que falta para salvar — exibido acima do CTA, para o botão desabilitado
  // nunca ficar mudo.
  const missingHint = useMemo(() => {
    if (trimmedName.length < MIN_NAME_LENGTH) {
      return 'Dê um nome com pelo menos 2 letras ao cartão';
    }
    if (cents <= 0) {
      return 'Informe o limite total do cartão';
    }
    if (parsedClosing === null) {
      return 'Informe o dia de fechamento da fatura (1 a 31)';
    }
    if (parsedDue === null) {
      return 'Informe o dia de vencimento da fatura (1 a 31)';
    }
    return null;
  }, [trimmedName, cents, parsedClosing, parsedDue]);

  const canSubmit = !missingHint && !isSubmitting;

  const handleSelectBrand = (next: CreditCardBrand) => {
    if (next === brand) return;
    Haptics.selectionAsync();
    setBrand(next);
  };

  // Entrada em centavos via teclado do dispositivo: descarta não-dígitos
  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    setCents(digits ? Math.min(parseInt(digits, 10), MAX_CENTS) : 0);
  };

  const handleDayChange = (setter: (value: string) => void) => (text: string) => {
    setter(text.replace(/\D/g, '').slice(0, 2));
  };

  const handleSelectColor = (next: string) => {
    Haptics.selectionAsync();
    setColor(next);
  };

  const handleSubmit = () => {
    if (submittingRef.current) return;
    if (!canSubmit || parsedClosing === null || parsedDue === null) {
      setNameTouched(true);
      setDaysTouched(true);
      return;
    }
    submittingRef.current = true;
    Keyboard.dismiss();
    onSubmit({
      name: trimmedName,
      brand,
      total_limit: cents / 100, // API espera REAIS, não centavos
      closing_day: parsedClosing,
      due_day: parsedDue,
      color,
    });
  };

  // A cor atual pode vir de fora da paleta (cartão antigo/web): mostramos ela
  // primeiro para o selecionado nunca ficar sem swatch visível.
  const swatches = useMemo(
    () =>
      ACCOUNT_COLOR_PALETTE.includes(color as (typeof ACCOUNT_COLOR_PALETTE)[number])
        ? [...ACCOUNT_COLOR_PALETTE]
        : [color, ...ACCOUNT_COLOR_PALETTE],
    [color]
  );

  const totalLimit = cents / 100;
  // No preview da criação todo o limite está livre; na edição vale o real.
  const previewAvailable = isEdit && availableLimit !== undefined ? availableLimit : totalLimit;

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
        {/* Preview ao vivo do cartão */}
        <CreditCardVisual
          name={trimmedName}
          brand={brand}
          color={color}
          totalLimit={totalLimit}
          availableLimit={previewAvailable}
          closingDay={parsedClosing ?? undefined}
          dueDay={parsedDue ?? undefined}
        />

        {/* Nome */}
        <View style={styles.field}>
          <TextField
            label="Nome do cartão"
            value={name}
            onChangeText={setName}
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

        {/* Bandeira */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Bandeira
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            keyboardShouldPersistTaps="handled"
          >
            {BRAND_ORDER.map((option) => (
              <SelectableChip
                key={option}
                label={CREDIT_CARD_BRAND_LABELS[option]}
                leading={<CardBrandLogo brand={option} size={18} />}
                selected={option === brand}
                onToggle={() => handleSelectBrand(option)}
                accessibilityRole="radio"
              />
            ))}
          </ScrollView>
        </View>

        {/* Limite total */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Limite total
          </Text>
          <TextInput
            style={[styles.amount, { color: colors.text }]}
            value={cents > 0 ? formatCurrency(cents / 100) : ''}
            onChangeText={handleAmountChange}
            placeholder={formatCurrency(0)}
            placeholderTextColor={colors.textSecondary}
            keyboardType="decimal-pad"
            textAlign="center"
            accessibilityLabel="Limite total do cartão"
          />
          {isEdit ? (
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              O limite disponível acompanha seus lançamentos e pagamentos de
              fatura.
            </Text>
          ) : null}
        </View>

        {/* Fatura: fechamento e vencimento */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Fatura
          </Text>
          <View style={styles.daysRow}>
            <View style={styles.dayField}>
              <TextField
                label="Dia de fechamento"
                value={closingDay}
                onChangeText={handleDayChange(setClosingDay)}
                onBlur={() => setDaysTouched(true)}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
                error={closingError}
              />
            </View>
            <View style={styles.dayField}>
              <TextField
                label="Dia de vencimento"
                value={dueDay}
                onChangeText={handleDayChange(setDueDay)}
                onBlur={() => setDaysTouched(true)}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
                error={dueError}
              />
            </View>
          </View>
          <Text
            style={[
              styles.helperText,
              { color: closingError || dueError ? colors.danger : colors.textSecondary },
            ]}
          >
            Dias entre 1 e 31. A fatura fecha no dia de fechamento e vence no
            dia de vencimento do mês seguinte quando ele vem antes.
          </Text>
        </View>

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
  amount: {
    fontSize: 40,
    fontWeight: FontWeight.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  daysRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  dayField: {
    flex: 1,
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
