import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { EditableAvatar } from '@/components/profile/EditableAvatar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { getProfile, updateProfile } from '@/lib/profile-api';

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

export default function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [originalData, setOriginalData] = useState({
    fullName: '',
    phone: '',
    avatarUrl: null as string | null,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    const changed =
      fullName !== originalData.fullName ||
      phone !== originalData.phone ||
      avatarUrl !== originalData.avatarUrl;
    setHasChanges(changed);
  }, [fullName, phone, avatarUrl, originalData]);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const result = await getProfile();
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
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel carregar o perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    // Validate name
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

      setOriginalData({
        fullName,
        phone,
        avatarUrl,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel salvar as alteracoes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setPhone(formatPhone(value));
  };

  const handleAvatarChange = (newUrl: string | null) => {
    setAvatarUrl(newUrl);
    setOriginalData((prev) => ({ ...prev, avatarUrl: newUrl }));
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <EditableAvatar
              avatarUrl={avatarUrl}
              onAvatarChange={handleAvatarChange}
              size={120}
            />
            <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
              Toque para alterar a foto
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Nome completo</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Seu nome"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Telefone</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={phone}
                onChangeText={handlePhoneChange}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={15}
              />
            </View>

            {/* Email (read-only) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Email</Text>
              <View
                style={[
                  styles.input,
                  styles.readOnlyInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.readOnlyText, { color: colors.textSecondary }]}>
                  {user?.email || ''}
                </Text>
              </View>
            </View>

            {/* Change Password Button */}
            <TouchableOpacity
              style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/profile/change-password');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <IconSymbol name="lock.fill" size={20} color={colors.text} />
                <Text style={[styles.menuItemText, { color: colors.text }]}>Alterar Senha</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: hasChanges ? colors.primary : colors.card },
            ]}
            onPress={handleSave}
            disabled={!hasChanges || isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={[
                  styles.saveButtonText,
                  { color: hasChanges ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Salvar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  form: {
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
  },
  readOnlyInput: {
    justifyContent: 'center',
  },
  readOnlyText: {
    fontSize: FontSize.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemText: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  footer: {
    padding: Spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
});
