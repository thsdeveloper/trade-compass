import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useRouter, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { IconSymbol, IconSymbolName } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { Colors, Spacing, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface QuickAction {
  id: string;
  label: string;
  icon: IconSymbolName;
  route?: string;
  onPress?: () => void;
  /** Destaca a ação com o fundo primário */
  highlight?: boolean;
}

// Quatro ações fixas, uniformemente distribuídas — o excedente vive em "Mais".
const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'new-transaction',
    label: 'Adicionar',
    icon: 'plus',
    route: '/new-transaction',
    highlight: true,
  },
  {
    id: 'scan-receipt',
    label: 'Escanear',
    icon: 'qrcode.viewfinder',
    route: '/nota-chat',
  },
  {
    id: 'accounts',
    label: 'Contas',
    icon: 'wallet.pass',
    route: '/contas',
  },
  {
    id: 'more',
    label: 'Mais',
    icon: 'ellipsis',
    route: '/more',
  },
];

interface QuickActionsProps {
  actions?: QuickAction[];
}

export function QuickActions({ actions = DEFAULT_ACTIONS }: QuickActionsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handlePress = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (action.onPress) {
      action.onPress();
    } else if (action.route) {
      router.push(action.route as Href);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {actions.map((action) => (
          <Pressable
            key={action.id}
            style={styles.actionButton}
            onPress={() => handlePress(action)}
            accessibilityRole="button"
            accessibilityLabel={action.label.replace('\n', ' ')}
          >
            {({ pressed }) => (
              <>
                {/* Escala no press (opacidade quebraria o Liquid Glass nativo) */}
                <View style={pressed && styles.iconPressed}>
                  <GlassSurface variant="glass" isInteractive style={styles.iconContainer}>
                    <IconSymbol
                      name={action.icon}
                      size={24}
                      color={action.highlight ? colors.primary : colors.text}
                    />
                  </GlassSurface>
                </View>
                <Text
                  style={[styles.label, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {action.label}
                </Text>
              </>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: Spacing.lg,
  },
  actionButton: {
    alignItems: 'center',
    width: 76,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconPressed: {
    transform: [{ scale: 0.92 }],
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    lineHeight: 15,
  },
});
