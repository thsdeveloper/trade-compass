import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/atoms/Button';
import { AccountForm } from '@/components/organisms/AccountForm';
import { AdjustBalanceModal } from '@/components/organisms/AdjustBalanceModal';
import { FullScreenOverlay } from '@/components/organisms/FullScreenOverlay';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { getAccountUsage } from '@/lib/finance-api';
import type { AccountFormData, AccountUsage } from '@/types/finance';

/** Contagem + substantivo no singular/plural, ex.: "12 lançamentos". */
function contar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

/** Junta as partes com vírgulas e "e" antes da última, como em português. */
function juntar(partes: string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} e ${partes[partes.length - 1]}`;
}

/**
 * Explica, com as contagens reais, o que impede a exclusão. Categorias
 * zeradas somem do texto. Metas ganham uma saída mais leve: como o vínculo é
 * opcional, basta desvincular a conta — não é preciso apagar a meta.
 */
function explicarBloqueio(usage: AccountUsage): string {
  const partes: string[] = [];
  if (usage.transactions > 0) {
    partes.push(contar(usage.transactions, 'lançamento', 'lançamentos'));
  }
  if (usage.recurrences > 0) {
    partes.push(contar(usage.recurrences, 'recorrência ativa', 'recorrências ativas'));
  }
  if (usage.invoice_payments > 0) {
    partes.push(
      contar(usage.invoice_payments, 'pagamento de fatura', 'pagamentos de fatura')
    );
  }
  if (usage.goals > 0) {
    partes.push(contar(usage.goals, 'meta vinculada', 'metas vinculadas'));
  }
  if (partes.length === 0) {
    return 'Esta conta ainda tem registros vinculados e não pode ser excluída.';
  }

  const inicio = `Esta conta tem ${juntar(partes)}.`;
  // Só metas: a saída é desvincular, não apagar nada.
  const soMetas = partes.length === 1 && usage.goals > 0;
  if (soMetas) {
    return `${inicio} Desvincule a conta ${
      usage.goals === 1 ? 'da meta' : 'das metas'
    } antes de excluí-la.`;
  }
  const complemento =
    usage.goals > 0
      ? 'Exclua ou transfira esses registros e desvincule a conta das metas antes.'
      : 'Exclua ou transfira esses registros antes.';
  return `${inicio} ${complemento}`;
}

export default function EditarContaScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'dark'];

  const { id } = useLocalSearchParams<{ id: string }>();
  const { accounts, updateAccount, deleteAccount, loadAccounts, loadTransactions } =
    useFinance();

  // A lista já está em memória (a tela de contas a carrega): não refazemos
  // fetch só para preencher o formulário.
  const account = useMemo(
    () => accounts.find((item) => item.id === id) ?? null,
    [accounts, id]
  );

  const [usage, setUsage] = useState<AccountUsage | null>(null);
  const [usageError, setUsageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [adjustVisible, setAdjustVisible] = useState(false);
  // Após excluir, a conta some de `accounts` antes de a animação de saída do
  // modal terminar. Sem esta marca, a tela piscaria "conta não encontrada"
  // justamente quando a exclusão deu certo.
  const [foiExcluida, setFoiExcluida] = useState(false);

  useEffect(() => {
    if (!id) return;
    let ativo = true;
    getAccountUsage(id)
      .then((result) => {
        if (ativo) setUsage(result);
      })
      .catch((error: unknown) => {
        if (!ativo) return;
        setUsageError(
          error instanceof Error ? error.message : 'Erro ao carregar os vínculos'
        );
      });
    return () => {
      ativo = false;
    };
  }, [id]);

  const handleSave = useCallback(
    async (data: AccountFormData) => {
      if (!account) return;
      setIsSaving(true);
      try {
        // `type` não vai no PATCH: a API não aceita trocar o tipo da conta.
        await updateAccount(account.id, {
          name: data.name,
          bank_id: data.bank_id ?? null,
          initial_balance: data.initial_balance,
          color: data.color,
          icon: data.icon,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (error) {
        // Mantém o formulário preenchido: o usuário só ajusta o que deu errado.
        Alert.alert(
          'Não foi possível salvar a conta',
          error instanceof Error ? error.message : 'Erro ao salvar conta'
        );
      } finally {
        setIsSaving(false);
      }
    },
    [account, updateAccount, router]
  );

  const confirmDelete = useCallback(async () => {
    if (!account) return;
    setIsDeleting(true);
    try {
      await deleteAccount(account.id);
      setFoiExcluida(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      // A contagem pode ter mudado entre abrir a tela e confirmar: o 409 do
      // servidor é a fonte da verdade e vem com o motivo já escrito.
      Alert.alert(
        'Não foi possível excluir a conta',
        error instanceof Error ? error.message : 'Erro ao excluir conta'
      );
    } finally {
      setIsDeleting(false);
    }
  }, [account, deleteAccount, router]);

  const handleAdjusted = useCallback(() => {
    setAdjustVisible(false);
    // O ajuste muda saldo e (no modo transação) cria um lançamento
    loadAccounts();
    loadTransactions();
  }, [loadAccounts, loadTransactions]);

  const handleDelete = useCallback(() => {
    if (!account) return;
    Alert.alert(
      'Excluir conta',
      `"${account.name}" sai da sua lista de contas e deixa de somar no saldo. O histórico já lançado continua visível.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: confirmDelete },
      ]
    );
  }, [account, confirmDelete]);

  // Durante a saída do modal após excluir, renderiza vazio em vez do erro.
  if (!account && foiExcluida) {
    return (
      <FullScreenOverlay title="Editar conta" onClose={() => router.back()}>
        <View style={styles.notFound} />
      </FullScreenOverlay>
    );
  }

  if (!account) {
    return (
      <FullScreenOverlay title="Editar conta" onClose={() => router.back()}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
            Conta não encontrada. Ela pode ter sido excluída em outro dispositivo.
          </Text>
          <Button label="Voltar" variant="secondary" onPress={() => router.back()} />
        </View>
      </FullScreenOverlay>
    );
  }

  const canDelete = usage?.can_delete ?? false;
  // Enquanto o vínculo não chega, o botão fica em carregamento: nem habilitado
  // (evita excluir no escuro) nem escondido (evita pulo de layout).
  const deleteLoading = usage === null && usageError === null;

  const deleteHint = usageError
    ? usageError
    : usage && !usage.can_delete
      ? explicarBloqueio(usage)
      : null;

  return (
    <FullScreenOverlay title="Editar conta" onClose={() => router.back()}>
      <AccountForm
        mode="edit"
        initialValues={{
          type: account.type,
          bank: account.bank ?? null,
          name: account.name,
          cents: Math.round(account.initial_balance * 100),
          color: account.color,
          icon: account.icon,
        }}
        submitLabel="Salvar alterações"
        isSubmitting={isSaving}
        onSubmit={handleSave}
        currentBalance={account.current_balance}
        onAdjustBalance={() => setAdjustVisible(true)}
        footer={
          <View style={styles.dangerZone}>
            <Button
              label="Excluir conta"
              variant="destructive"
              onPress={handleDelete}
              loading={deleteLoading || isDeleting}
              disabled={!canDelete}
              fullWidth
            />
            {deleteHint ? (
              <Text style={[styles.dangerHint, { color: colors.textSecondary }]}>
                {deleteHint}
              </Text>
            ) : null}
          </View>
        }
      />
      <AdjustBalanceModal
        visible={adjustVisible}
        account={account}
        onClose={() => setAdjustVisible(false)}
        onAdjusted={handleAdjusted}
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
  dangerHint: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    paddingHorizontal: Spacing.xs,
  },
});
