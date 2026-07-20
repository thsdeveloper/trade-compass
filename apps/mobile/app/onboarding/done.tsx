import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  OnboardingShell,
  Button,
} from '@/components/templates/OnboardingShell';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { Colors, FontSize, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';

/** Passo final: confirmação e entrada no app. */
export default function DoneScreen() {
  const router = useRouter();
  const { profile, setPendingOnboarding } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const firstName = profile?.full_name?.split(' ')[0];

  const handleStart = () => {
    setPendingOnboarding(false);
    router.replace('/(tabs)');
  };

  return (
    <OnboardingShell
      title={firstName ? `Tudo pronto, ${firstName}!` : 'Tudo pronto!'}
      subtitle="Sua conta foi criada. Agora é só adicionar suas contas e transações para ver seu dinheiro com clareza."
      showBack={false}
      footer={<Button label="Começar a usar" onPress={handleStart} />}
    >
      <View style={styles.center}>
        <GlassSurface variant="material" style={styles.badge}>
          <Ionicons name="checkmark" size={64} color={colors.success} />
        </GlassSurface>
        <Text style={styles.caption}>
          Você pode ajustar tudo isso depois em Perfil e Configurações.
        </Text>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2xl'],
  },
  badge: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    paddingHorizontal: Spacing['3xl'],
  },
});
