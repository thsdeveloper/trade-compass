import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { TextField } from '@/components/atoms/TextField';
import { Button } from '@/components/atoms/Button';
import { EditableAvatar } from '@/components/molecules/EditableAvatar';
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from '@/components/molecules/ScreenHeader';
import { ProfileEditSkeleton } from '@/components/organisms/ProfileSkeletons';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/lib/profile-api';

/** Máscara brasileira de telefone: (11) 98765-4321, aplicada ao digitar. */
function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');

  if (numbers.length <= 2) {
    return numbers;
  }
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }
  if (numbers.length <= 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
}

/**
 * Tela de editar perfil (template do Atomic Design):
 * - Átomos: TextField, Button, IconSymbol, GlassSurface, Skeleton
 * - Molécula: EditableAvatar
 * - Organismo: ProfileEditSkeleton (carregamento)
 * Segue o padrão de tela do app: gradiente ambiente na camada de conteúdo,
 * cartão de formulário em material frosted e CTA fixo no rodapé.
 */
export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const screenBg = isDark ? colors.background : '#F6F7F9';
  const hairlineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)';
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  // Conteúdo começa abaixo do header flutuante; ao rolar, passa sob o blur
  const headerOffset = insets.top + SCREEN_HEADER_HEIGHT + Spacing.md;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [originalData, setOriginalData] = useState({
    fullName: '',
    phone: '',
    avatarUrl: null as string | null,
  });

  // Derivado direto do estado: não precisa de useEffect próprio
  const hasChanges =
    fullName !== originalData.fullName ||
    phone !== originalData.phone ||
    avatarUrl !== originalData.avatarUrl;

  useEffect(() => {
    let ativo = true;
    (async () => {
      try {
        const result = await getProfile();
        if (!ativo) return;
        if (result.data) {
          const name = result.data.full_name || '';
          const phoneNumber = result.data.phone || '';
          const avatar = result.data.avatar_url || null;

          setFullName(name);
          setPhone(phoneNumber);
          setAvatarUrl(avatar);
          setOriginalData({
            fullName: name,
            phone: phoneNumber,
            avatarUrl: avatar,
          });
        }
      } catch {
        if (ativo) Alert.alert('Erro', 'Não foi possível carregar o perfil');
      } finally {
        if (ativo) setIsLoading(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const handleSave = async () => {
    if (!hasChanges) return;

    if (fullName && (fullName.length < 2 || fullName.length > 100)) {
      Alert.alert('Erro', 'Nome deve ter entre 2 e 100 caracteres');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await updateProfile({
        full_name: fullName || null,
        phone: phone || null,
      });

      if (result.error) {
        Alert.alert('Erro', result.error);
        return;
      }

      setOriginalData({ fullName, phone, avatarUrl });

      // Sucesso fala por haptic + retorno imediato, sem alerta bloqueante
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as alterações');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
  };

  const handleAvatarChange = (newUrl: string | null) => {
    // O upload/remoção já persiste na API dentro do EditableAvatar; o
    // original acompanha para o avatar não marcar "alterações pendentes"
    setAvatarUrl(newUrl);
    setOriginalData((prev) => ({ ...prev, avatarUrl: newUrl }));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]} edges={['bottom']}>
      {/* Gradiente ambiente edge-to-edge (camada de conteúdo) */}
      <LinearGradient
        colors={
          isDark
            ? ['#1D4ED8', '#16233F', colors.background]
            : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.55, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      {isLoading ? (
        // Organismo: skeleton na silhueta exata da tela, pulso sincronizado
        <View style={[styles.keyboardView, { paddingTop: headerOffset }]}>
          <ProfileEditSkeleton />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.content, { paddingTop: headerOffset }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              scrollY.value = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          >
            {/* Molécula: avatar editável com action sheet de foto */}
            <View style={styles.avatarSection}>
              <EditableAvatar
                avatarUrl={avatarUrl}
                onAvatarChange={handleAvatarChange}
                size={120}
              />
              <Text style={styles.avatarHint}>Toque para alterar a foto</Text>
            </View>

            {/* Organismo: cartão do formulário em material frosted */}
            <GlassSurface
              variant="material"
              style={[styles.form, { borderColor: hairlineColor }]}
            >
              {/* Átomos: TextField do design system */}
              <TextField
                label="Nome completo"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                autoCorrect={false}
              />

              <TextField
                label="Telefone"
                value={phone}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={15}
              />

              {/* E-mail somente leitura: mesmo TextField, com cadeado */}
              <TextField
                label="Email"
                value={user?.email || ''}
                onChangeText={() => {}}
                editable={false}
                rightElement={
                  <IconSymbol
                    name="lock.fill"
                    size={16}
                    color="rgba(255,255,255,0.45)"
                  />
                }
              />

              {/* Linha de navegação: alterar senha (padrão de list row) */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/profile/change-password');
                }}
                accessibilityRole="button"
                accessibilityLabel="Alterar senha"
                style={({ pressed }) => [
                  styles.menuItem,
                  { borderTopColor: hairlineColor },
                  pressed && styles.menuItemPressed,
                ]}
              >
                <View style={styles.menuItemLeft}>
                  <IconSymbol name="lock.fill" size={20} color={colors.text} />
                  <Text style={[styles.menuItemText, { color: colors.text }]}>
                    Alterar senha
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={18} color={colors.icon} />
              </Pressable>
            </GlassSurface>
          </ScrollView>

          {/* CTA fixo do rodapé (átomo Button, pill primário) */}
          <View style={styles.footer}>
            <Button
              label="Salvar"
              onPress={handleSave}
              variant="primary"
              loading={isSaving}
              disabled={!hasChanges}
            />
          </View>
        </KeyboardAvoidingView>
      )}

      {/* Molécula: header integrado — transparente em repouso, blur de
          sistema atrás dele quando o formulário rola por baixo */}
      <ScreenHeader
        title="Editar perfil"
        scrollY={scrollY}
        onBack={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
  },
  avatarHint: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.92)',
  },
  form: {
    gap: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuItemPressed: {
    opacity: 0.65,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  footer: {
    padding: Spacing.xl,
  },
});
