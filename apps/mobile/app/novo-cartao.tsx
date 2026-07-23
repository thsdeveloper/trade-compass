import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import {
  CreditCardForm,
  type CreditCardFormInitialValues,
} from '@/components/organisms/CreditCardForm';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { useFinance } from '@/contexts/FinanceContext';
import { CREDIT_CARD_BRAND_LABELS } from '@/types/finance';
import type { CreditCardBrand, CreditCardFormData } from '@/types/finance';

/** Params opcionais de pré-preenchimento (ex.: extração da fatura por IA). */
type PrefillParams = {
  name?: string;
  brand?: string;
  cents?: string;
  closingDay?: string;
  dueDay?: string;
  color?: string;
};

export default function NovoCartaoScreen() {
  const router = useRouter();
  const { createCreditCard } = useFinance();
  const params = useLocalSearchParams<PrefillParams>();

  const [isSaving, setIsSaving] = useState(false);

  // Query params chegam como string; só entra no formulário o que é válido
  const initialValues = useMemo<Partial<CreditCardFormInitialValues>>(() => {
    const values: Partial<CreditCardFormInitialValues> = {};
    if (params.name) values.name = params.name;
    if (params.brand && params.brand in CREDIT_CARD_BRAND_LABELS) {
      values.brand = params.brand as CreditCardBrand;
    }
    if (params.cents && /^\d+$/.test(params.cents)) {
      values.cents = parseInt(params.cents, 10);
    }
    if (params.closingDay) values.closingDay = params.closingDay;
    if (params.dueDay) values.dueDay = params.dueDay;
    if (params.color) values.color = params.color;
    return values;
  }, [params.name, params.brand, params.cents, params.closingDay, params.dueDay, params.color]);

  const handleSave = async (data: CreditCardFormData) => {
    setIsSaving(true);
    try {
      await createCreditCard(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      // Mantém o formulário preenchido: o usuário só ajusta o que deu errado
      Alert.alert(
        'Não foi possível criar o cartão',
        error instanceof Error ? error.message : 'Erro ao criar cartão'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FullScreenOverlay title="Novo cartão" onClose={() => router.back()}>
      <CreditCardForm
        mode="create"
        initialValues={initialValues}
        submitLabel="Criar cartão"
        isSubmitting={isSaving}
        onSubmit={handleSave}
      />
    </FullScreenOverlay>
  );
}
