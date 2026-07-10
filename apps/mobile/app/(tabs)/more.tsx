import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Href } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { Image } from 'expo-image';

import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius, FontSize } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItem {
  id: string;
  label: string;
  icon: IconSymbolName;
  route?: string;
  onPress?: () => void;
  danger?: boolean;
}

const createMenuSections = (signOut: () => Promise<void>): { title?: string; items: MenuItem[] }[] => [
  {
    title: 'Conta',
    items: [
      { id: 'profile', label: 'Editar Perfil', icon: 'person.fill', route: '/profile/edit' },
    ],
  },
  {
    title: 'Financas',
    items: [
      { id: 'accounts', label: 'Contas', icon: 'wallet.pass', route: '/contas' },
      { id: 'categories', label: 'Categorias', icon: 'tag', route: '/categorias' },
      { id: 'transactions', label: 'Transacoes', icon: 'arrow.up.arrow.down', route: '/transactions' },
    ],
  },
  {
    title: 'Configuracoes',
    items: [
      { id: 'settings', label: 'Configuracoes', icon: 'gearshape', route: '/settings' },
      { id: 'help', label: 'Ajuda', icon: 'questionmark.circle', route: '/help' },
    ],
  },
  {
    items: [
      {
        id: 'logout',
        label: 'Sair',
        icon: 'rectangle.portrait.and.arrow.right',
        danger: true,
        onPress: () => {
          Alert.alert(
            'Sair',
            'Deseja realmente sair do aplicativo?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: () => signOut() },
            ]
          );
        },
      },
    ],
  },
];

export default function MoreScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { user, profile, signOut, refreshProfile } = useAuth();

  const MENU_SECTIONS = createMenuSections(signOut);

  // Set status bar style and refresh profile when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      setStatusBarStyle('light');
      refreshProfile();
    }, [refreshProfile])
  );

  const handleMenuPress = (item: MenuItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      router.push(item.route as Href);
    }
  };

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/profile/edit' as Href);
  };

  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const displayName = profile?.full_name || 'Usuario';
  const displayEmail = user?.email || '';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity style={styles.profileSection} onPress={handleAvatarPress} activeOpacity={0.8}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <IconSymbol name="person.circle.fill" size={64} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userEmail}>{displayEmail}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {MENU_SECTIONS.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            {section.title && (
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {section.title}
              </Text>
            )}
            <View
              style={[
                styles.sectionContent,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => handleMenuPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <IconSymbol
                      name={item.icon}
                      size={22}
                      color={item.danger ? colors.danger : colors.text}
                    />
                    <Text
                      style={[
                        styles.menuItemLabel,
                        { color: item.danger ? colors.danger : colors.text },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </View>
                  <IconSymbol
                    name="chevron.right"
                    size={18}
                    color={colors.icon}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            Trade Compass v{appVersion}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  sectionContent: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemLabel: {
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  versionText: {
    fontSize: FontSize.xs,
  },
});
