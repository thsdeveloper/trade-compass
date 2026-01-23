// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
export type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation & Basic
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'plus': 'add',
  'plus.circle': 'add-circle-outline',
  'plus.circle.fill': 'add-circle',
  'list.bullet': 'list',
  'xmark': 'close',
  'calendar': 'event',
  'checkmark': 'check',

  // Dashboard icons
  'wallet.pass.fill': 'account-balance-wallet',
  'wallet.pass': 'account-balance-wallet',
  'arrow.down.circle.fill': 'arrow-downward',
  'arrow.up.circle.fill': 'arrow-upward',
  'chart.line.uptrend.xyaxis': 'trending-up',
  'chart.line.downtrend.xyaxis': 'trending-down',
  'creditcard.fill': 'credit-card',
  'banknote.fill': 'payments',

  // Nubank-style icons
  'eye': 'visibility',
  'eye.slash': 'visibility-off',
  'eye.fill': 'visibility',
  'eye.slash.fill': 'visibility-off',
  'questionmark.circle': 'help-outline',
  'questionmark.circle.fill': 'help',
  'line.3.horizontal': 'menu',
  'gearshape': 'settings',
  'gearshape.fill': 'settings',
  'tag': 'local-offer',
  'tag.fill': 'local-offer',
  'chart.bar': 'bar-chart',
  'chart.bar.fill': 'bar-chart',
  'person.circle': 'account-circle',
  'person.circle.fill': 'account-circle',
  'bell': 'notifications-none',
  'bell.fill': 'notifications',
  'arrow.right': 'arrow-forward',
  'arrow.left': 'arrow-back',
  'ellipsis': 'more-horiz',
  'ellipsis.circle': 'more-horiz',
  'square.grid.2x2': 'grid-view',
  'square.grid.2x2.fill': 'grid-view',
  'doc.text': 'description',
  'doc.text.fill': 'description',
  'arrow.up.arrow.down': 'swap-vert',
  'arrow.clockwise': 'refresh',
  'magnifyingglass': 'search',
  'trash': 'delete-outline',
  'trash.fill': 'delete',
  'pencil': 'edit',
  'pencil.circle': 'edit',
  'info.circle': 'info-outline',
  'info.circle.fill': 'info',
  'exclamationmark.circle': 'error-outline',
  'exclamationmark.circle.fill': 'error',
  'checkmark.circle': 'check-circle-outline',
  'checkmark.circle.fill': 'check-circle',
  'power': 'power-settings-new',
  'rectangle.portrait.and.arrow.right': 'logout',
  'qrcode': 'qr-code',
  'qrcode.viewfinder': 'qr-code-scanner',
  'creditcard': 'credit-card',
  'building.columns': 'account-balance',
  'building.columns.fill': 'account-balance',
  'dollarsign.circle': 'attach-money',
  'dollarsign.circle.fill': 'attach-money',
  'arrow.triangle.swap': 'sync-alt',
  'clock': 'schedule',
  'clock.fill': 'schedule',
  'star': 'star-outline',
  'star.fill': 'star',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'bolt': 'flash-on',
  'bolt.fill': 'flash-on',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
