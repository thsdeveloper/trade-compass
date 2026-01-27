import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <NativeTabs
      tintColor={colors.primary}
      backgroundColor={null}
      iconColor={{
        default: colors.textSecondary,
        selected: colors.primary,
      }}
      labelStyle={{
        default: { color: colors.textSecondary },
        selected: { color: colors.primary },
      }}
      minimizeBehavior="onScrollDown"
    >
      <NativeTabs.Trigger name="index">
        <Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          androidSrc={<MaterialIcons name="home" size={24} color={colors.textSecondary} />}
        />
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="transactions">
        <Icon
          sf={{ default: 'list.bullet.rectangle', selected: 'list.bullet.rectangle.fill' }}
          androidSrc={<MaterialIcons name="receipt-long" size={24} color={colors.textSecondary} />}
        />
        <Label>Transações</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="more">
        <Icon
          sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }}
          androidSrc={<MaterialIcons name="more-horiz" size={24} color={colors.textSecondary} />}
        />
        <Label>Mais</Label>
      </NativeTabs.Trigger>

      {/* Hidden screens */}
      <NativeTabs.Trigger name="explore" hidden />
      <NativeTabs.Trigger name="fab-placeholder" hidden />
    </NativeTabs>
  );
}
