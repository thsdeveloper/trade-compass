import { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/atoms/Button';
import { CreditCardForm } from '@/components/organisms/CreditCardForm';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import type { CreditCardFormData } from '@/types/finance';

export default function EditarCartaoScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const { id } = useLocalSearchParams<{ id: string }>();
  const { creditCards, updateCreditCard, deleteCreditCard } = useFinance();

  // A lista já está em memória (a tela de cartões a carrega): não refazemos
  // fetch só para preencher o formulário.
  const card = useMemo(
    () => creditCards.find((item) => item.id === id) ?? null,
    [creditCards, id]
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  // Após excluir, o cartão some de `creditCards` antes de a animação de saída
  // do modal terminar. Sem esta marca, a tela piscaria "cartão não encontrado"
  // justamente quando a exclusão deu certo.
  const [foiExcluido, setFoiExcluido] = useState(false);

  const handleSave = useCallback(
    async (data: CreditCardFormData) => {
      if (!card) return;
      setIsSaving(true);
      try {
        await updateCreditCard(card.id, data);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (error) {
        // Mantém o formulário preenchido: o usuário só ajusta o que deu errado
        Alert.alert(
          'Não foi possível salvar o cartão',
          error instanceof Error ? error.message : 'Erro ao salvar cartão'
        );
      } finally {
        setIsSaving(false);
      }
    },
    [card, updateCreditCard, router]
  );

  const confirmDelete = useCallback(async () => {
    if (!card) return;
    setIsDeleting(true);
    try {
      await deleteCreditCard(card.id);
      setFoiExcluido(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      Alert.alert(
        'Não foi possível excluir o cartão',
        error instanceof Error ? error.message : 'Erro ao excluir cartão'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [card, deleteCreditCard, router]);

  const handleDelete = useCallback(() => {
    if (!card) return;
    Alert.alert(
      'Excluir cartão',
      `"${card.name}" sai da sua lista de cartões. O histórico já lançado continua visível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: confirmDelete },
      ]
    );
  }, [card, confirmDelete]);

  // Durante a saída do modal após excluir, renderiza vazio em vez do erro.
  if (!card && foiExcluido) {
    return (
      <FullScreenOverlay title="Editar cartão" onClose={() => router.back()}>
        <View style={styles.notFound} />
      </FullScreenOverlay>
    );
  }

  if (!card) {
    return (
      <FullScreenOverlay title="Editar cartão" onClose={() => router.back()}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Cartão não encontrado. Ele pode ter sido excluído em outro
            dispositivo.
          </Text>
          <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
        </View>
      </FullScreenOverlay>
    );
  }

  return (
    <FullScreenOverlay title="Editar cartão" onClose={() => router.back()}>
      <CreditCardForm
        mode="edit"
        initialValues={{
          name: card.name,
          brand: card.brand,
          cents: Math.round(card.total_limit * 100),
          closingDay: String(card.closing_day),
          dueDay: String(card.due_day),
          color: card.color,
        }}
        submitLabel="Salvar alterações"
        isSubmitting={isSaving}
        onSubmit={handleSave}
        availableLimit={card.available_limit}
        footer={
          <View style={styles.dangerZone}>
            <Button
              label="Excluir cartão"
              variant="destructive"
              onPress={handleDelete}
              loading={isDeleting}
              fullWidth
            />
          </View>
        }
      />
    </FullScreenOverlay>
  );
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.lg,
  },
  notFoundText: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  dangerZone: {
    gap: Spacing.sm,
  },
});
