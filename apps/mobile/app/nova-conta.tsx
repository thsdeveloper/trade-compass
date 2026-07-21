import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { AccountForm } from '@/components/organisms/AccountForm';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { useFinance } from '@/contexts/FinanceContext';
import type { AccountFormData } from '@/types/finance';

export default function NovaContaScreen() {
  const router = useRouter();
  const { createAccount } = useFinance();

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (data: AccountFormData) => {
    setIsSaving(true);
    try {
      await createAccount(data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      // Mantém o formulário preenchido: o usuário só ajusta o que deu errado
      // (ex.: 409 de nome duplicado chega legível do servidor).
      Alert.alert(
        'Não foi possível criar a conta',
        error instanceof Error ? error.message : 'Erro ao criar conta'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FullScreenOverlay title="Nova conta" onClose={() => router.back()}>
      <AccountForm
        mode="create"
        submitLabel="Criar conta"
        isSubmitting={isSaving}
        onSubmit={handleSave}
      />
    </FullScreenOverlay>
  );
}
