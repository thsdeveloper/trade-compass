import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/atoms/Button';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { AmountInput, type AmountInputHandle } from '@/components/molecules/AmountInput';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import { updateProfile } from '@/lib/profile-api';

interface IncomeSheetProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Edição da renda mensal declarada (profile.monthly_income) direto da tela de
 * orçamento: é ela que preenche a distribuição 50-30-20 nos meses sem receitas
 * lançadas. Salvar atualiza o perfil e recarrega o dashboard na hora.
 */
export function IncomeSheet({ visible, onClose }: IncomeSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { profile, refreshProfile } = useAuth();
  const { loadDashboard } = useFinance();

  const amountRef = useRef<AmountInputHandle>(null);
  const [hasAmount, setHasAmount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pré-preenche com a renda atual a cada abertura (o sheet remonta o input)
  useEffect(() => {
    if (!visible) return;
    const income = profile?.monthly_income ?? 0;
    requestAnimationFrame(() => {
      amountRef.current?.setCents(Math.round(income * 100));
    });
  }, [visible, profile?.monthly_income]);

  const handleSave = async () => {
    const income = (amountRef.current?.getCents() ?? 0) / 100;
    if (income <= 0) return;

    setIsSaving(true);
    try {
      const result = await updateProfile({ monthly_income: income });
      if (result.error) {
        throw new Error(result.error);
      }
      await Promise.all([refreshProfile(), loadDashboard()]);
      onClose();
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheet title="Renda mensal" visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Base da distribuição 50-30-20 quando o mês ainda não tem receitas
          lançadas.
        </Text>
        <AmountInput
          ref={amountRef}
          color={colors.text}
          autoFocus
          onHasValueChange={setHasAmount}
        />
        <Button
          label="Salvar renda"
          onPress={handleSave}
          loading={isSaving}
          disabled={!hasAmount}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  hint: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
});
