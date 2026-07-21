import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol, type IconSymbolName } from '@/components/atoms/icon-symbol';
import { Button } from '@/components/atoms/Button';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ConfirmDialogProps = {
  visible: boolean;
  /** Pergunta curta e direta, ex.: "Limpar conversa?" */
  title: string;
  /** Consequência da ação, ex.: "Isso não pode ser desfeito." */
  message?: string;
  /** Rótulo do CTA de confirmação (padrão: "Confirmar") */
  confirmLabel?: string;
  /** Rótulo do cancelamento (padrão: "Cancelar") */
  cancelLabel?: string;
  /** Ação perigosa: CTA em vermelho tonal (padrão true — é um alerta) */
  destructive?: boolean;
  /** Ícone ilustrando a ação, ex.: "trash" */
  icon?: IconSymbolName;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Alerta de confirmação (Atomic Design · organismo). Toda ação destrutiva ou
 * irreversível do app (limpar, excluir, sair) deve passar por ele — nunca
 * execute direto no toque. Composição: backdrop + cartão central + átomos
 * Button (destructive/secondary).
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      {/* Backdrop: toque fora cancela (mesmo contrato do botão Cancelar) */}
      <Pressable style={styles.backdrop} onPress={onCancel}>
        {/* Pressable vazio impede o toque no cartão de vazar para o backdrop */}
        <Pressable style={[styles.card, { backgroundColor: colors.card }]}>
          {icon && (
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: destructive ? colors.dangerLight : colors.primaryLight },
              ]}
            >
              <IconSymbol
                name={icon}
                size={24}
                color={destructive ? colors.danger : colors.primary}
              />
            </View>
          )}
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {message}
            </Text>
          )}
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'destructive' : 'primary'}
              size="md"
              onPress={onConfirm}
            />
            <Button
              label={cancelLabel}
              variant="secondary"
              size="md"
              onPress={onCancel}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['2xl'],
  },
  card: {
    alignSelf: 'stretch',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 21,
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
});
