import { StyleSheet, View } from 'react-native';

import { Skeleton, SkeletonProvider } from '@/components/atoms/Skeleton';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { Buttons, Spacing, BorderRadius } from '@/constants/theme';

// Espelha as medidas reais da tela de editar perfil, para o conteúdo
// carregado "encaixar" no lugar dos placeholders sem pulo de layout.
const AVATAR_SIZE = 120;
const FIELD_HEIGHT = 60; // TextField do design system
const FIELD_RADIUS = 16;

/**
 * Skeleton da tela de editar perfil (Atomic Design · organismo).
 * Composição dos átomos Skeleton na mesma silhueta da tela: avatar,
 * cartão de formulário (3 campos + linha de navegação) e CTA do rodapé.
 */
export function ProfileEditSkeleton() {
  return (
    <SkeletonProvider active>
      <View style={styles.container}>
        {/* Avatar + dica */}
        <View style={styles.avatarSection}>
          <Skeleton
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            radius={AVATAR_SIZE / 2}
          />
          <Skeleton width={168} height={14} />
        </View>

        {/* Cartão do formulário: mesmos campos da tela real */}
        <GlassSurface variant="material" style={styles.form}>
          <Skeleton height={FIELD_HEIGHT} radius={FIELD_RADIUS} />
          <Skeleton height={FIELD_HEIGHT} radius={FIELD_RADIUS} />
          <Skeleton height={FIELD_HEIGHT} radius={FIELD_RADIUS} />
          {/* Linha "Alterar senha" */}
          <View style={styles.menuRow}>
            <Skeleton width={20} height={20} radius={10} />
            <Skeleton width={120} height={16} />
          </View>
        </GlassSurface>
      </View>

      {/* CTA do rodapé */}
      <View style={styles.footer}>
        <Skeleton height={Buttons.heightLg} radius={BorderRadius.full} />
      </View>
    </SkeletonProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing['3xl'],
  },
  form: {
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  footer: {
    padding: Spacing.xl,
  },
});
