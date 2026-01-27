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
  'arrow.down': 'arrow-downward',
  'arrow.up': 'arrow-upward',
  'chart.line.uptrend.xyaxis': 'trending-up',
  'chart.line.downtrend.xyaxis': 'trending-down',
  'creditcard.fill': 'credit-card',
  'banknote.fill': 'payments',

  // Category icons - Alimentacao
  'cart.fill': 'shopping-cart',
  'fork.knife': 'restaurant',
  'cup.and.saucer.fill': 'local-cafe',

  // Category icons - Transporte
  'car.fill': 'directions-car',
  'bus': 'directions-bus',
  'tram.fill': 'tram',
  'airplane': 'flight',
  'bicycle': 'pedal-bike',
  'fuelpump.fill': 'local-gas-station',
  'mappin.and.ellipse': 'place',
  'location.fill': 'my-location',
  'truck.box.fill': 'local-shipping',

  // Category icons - Saude
  'pills.fill': 'medication',
  'stethoscope': 'medical-services',
  'cross.fill': 'local-hospital',
  'dumbbell.fill': 'fitness-center',
  'figure.stand': 'accessibility-new',

  // Category icons - Educacao & Trabalho
  'book.fill': 'menu-book',
  'books.vertical.fill': 'library-books',
  'briefcase.fill': 'work',
  'graduationcap.fill': 'school',
  'brain.head.profile': 'psychology',

  // Category icons - Compras & Vestuario
  'bag.fill': 'shopping-bag',
  'storefront.fill': 'storefront',
  'shippingbox.fill': 'inventory-2',
  'tshirt.fill': 'checkroom',
  'eyeglasses': 'visibility',
  'umbrella.fill': 'beach-access',

  // Category icons - Entretenimento
  'gift.fill': 'card-giftcard',
  'gamecontroller.fill': 'sports-esports',
  'music.note': 'music-note',
  'headphones': 'headphones',
  'tv.fill': 'tv',
  'film': 'movie',
  'camera.fill': 'photo-camera',
  'sparkles': 'auto-awesome',

  // Category icons - Tech
  'iphone': 'phone-iphone',
  'ipad': 'tablet-mac',
  'desktopcomputer': 'desktop-windows',
  'laptopcomputer': 'laptop-mac',
  'printer.fill': 'print',
  'phone.fill': 'phone',
  'envelope.fill': 'email',
  'globe': 'language',
  'cloud.fill': 'cloud',
  'wifi': 'wifi',

  // Category icons - Casa
  'key.fill': 'vpn-key',
  'drop.fill': 'water-drop',

  // Category icons - Servicos
  'wrench.and.screwdriver.fill': 'build',
  'hammer.fill': 'hardware',
  'scissors': 'content-cut',
  'shield.fill': 'security',
  'lock.fill': 'lock',
  'timer': 'timer',

  // Category icons - Viagem
  'bed.double.fill': 'hotel',
  'map.fill': 'map',
  'safari.fill': 'explore',
  'mountain.2.fill': 'terrain',
  'tent.fill': 'holiday-village',
  'suitcase.fill': 'luggage',
  'sun.max.fill': 'wb-sunny',
  'moon.fill': 'nightlight',

  // Category icons - Pets & Natureza
  'pawprint.fill': 'pets',
  'bird.fill': 'flutter-dash',
  'fish.fill': 'set-meal',
  'leaf.fill': 'eco',
  'camera.macro': 'local-florist',

  // Category icons - Comunicacao
  'message.fill': 'chat',
  'at': 'alternate-email',
  'link': 'link',

  // Category icons - Status
  'exclamationmark.triangle': 'warning',
  'exclamationmark.triangle.fill': 'warning',
  'bookmark.fill': 'bookmark',
  'flag.fill': 'flag',
  'target': 'gps-fixed',

  // Category icons - Outros
  'circle.fill': 'circle',
  'archivebox.fill': 'archive',
  'folder.fill': 'folder',
  'arrow.triangle.2.circlepath': 'sync',
  'person.2.fill': 'people',

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
