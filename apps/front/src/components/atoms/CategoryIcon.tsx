'use client';

import { useState, useMemo, useCallback, useRef, useEffect, memo } from 'react';
import {
  // Financas
  Wallet,
  CreditCard,
  Banknote,
  DollarSign,
  Euro,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  Receipt,
  Landmark,
  Coins,
  BadgeDollarSign,
  CircleDollarSign,
  HandCoins,
  // Casa & Moradia
  Home,
  Building,
  Building2,
  Key,
  Sofa,
  Bed,
  Bath,
  Lamp,
  Lightbulb,
  Plug,
  Flame,
  Droplets,
  Thermometer,
  AirVent,
  // Alimentacao
  ShoppingCart,
  Utensils,
  Coffee,
  Wine,
  Beer,
  Pizza,
  Sandwich,
  Salad,
  Apple,
  Cherry,
  Egg,
  IceCream,
  Cake,
  CookingPot,
  UtensilsCrossed,
  // Transporte
  Car,
  CarFront,
  Bus,
  Train,
  Plane,
  Ship,
  Bike,
  Fuel,
  ParkingCircle,
  Navigation,
  MapPin,
  Route,
  Truck,
  // Saude
  Heart,
  HeartPulse,
  Pill,
  Syringe,
  Stethoscope,
  Activity,
  Thermometer as ThermometerHealth,
  Hospital,
  Cross,
  Dumbbell,
  PersonStanding,
  Footprints,
  Apple as AppleHealth,
  // Entretenimento & Lazer
  Gamepad2,
  Music,
  Music2,
  Headphones,
  Tv,
  Film,
  Camera,
  Image,
  Palette,
  Brush,
  Drama,
  Mic,
  Radio,
  PartyPopper,
  Gift,
  Sparkles,
  // Educacao
  GraduationCap,
  BookOpen,
  Book,
  Library,
  Notebook,
  PenTool,
  Pencil,
  Highlighter,
  FileText,
  Award,
  Medal,
  Brain,
  Lightbulb as LightbulbIdea,
  // Vestuario & Compras
  Shirt,
  ShoppingBag,
  Store,
  Package,
  Tag,
  Tags,
  Percent,
  BadgePercent,
  Gem,
  Watch,
  Glasses,
  Umbrella,
  // Trabalho & Negocios
  Briefcase,
  Building2 as Office,
  Users,
  UserCircle,
  Presentation,
  Monitor,
  Laptop,
  Printer,
  Phone,
  Mail,
  Send,
  Calendar,
  Clock,
  Timer,
  // Tecnologia
  Code,
  Terminal,
  Cpu,
  HardDrive,
  Wifi,
  Bluetooth,
  Smartphone,
  Tablet,
  Globe,
  Cloud,
  Database,
  Server,
  Zap,
  // Servicos & Utilidades
  Wrench,
  Settings,
  Hammer,
  Scissors,
  Shield,
  Lock,
  Unlock,
  Bell,
  // Viagem & Turismo
  Plane as PlaneTravel,
  Hotel,
  Map,
  Compass,
  Mountain,
  TreePine,
  Tent,
  Backpack,
  Luggage,
  Anchor,
  Sunrise,
  Sun,
  Moon,
  // Pets & Animais
  Dog,
  Cat,
  Bird,
  Fish,
  Bug,
  Leaf,
  Flower,
  TreeDeciduous,
  // Comunicacao
  MessageCircle,
  MessageSquare,
  AtSign,
  Hash,
  Link,
  Share2,
  Rss,
  // Status & Indicadores
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  HelpCircle,
  Star,
  Bookmark,
  Flag,
  Target,
  Crosshair,
  // Outros
  MoreHorizontal,
  Grid3X3,
  Layout,
  Box,
  Archive,
  Folder,
  FileBox,
  Trash2,
  Recycle,
  type LucideIcon,
} from 'lucide-react';
import type { FinanceCategoryType } from '@/types/finance';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

// Mapeamento de nome de icone (string) para componente Lucide
const ICON_MAP: Record<string, LucideIcon> = {
  // Financas
  Wallet, CreditCard, Banknote, DollarSign, Euro, PiggyBank,
  TrendingUp, TrendingDown, BarChart3, LineChart, Receipt,
  Landmark, Coins, BadgeDollarSign, CircleDollarSign, HandCoins,
  // Casa & Moradia
  Home, Building, Building2, Key, Sofa, Bed, Bath, Lamp,
  Lightbulb, Plug, Flame, Droplets, Thermometer, AirVent,
  // Alimentacao
  ShoppingCart, Utensils, Coffee, Wine, Beer, Pizza, Sandwich,
  Salad, Apple, Cherry, Egg, IceCream, Cake, CookingPot, UtensilsCrossed,
  // Transporte
  Car, CarFront, Bus, Train, Plane, Ship, Bike, Fuel,
  ParkingCircle, Navigation, MapPin, Route, Truck,
  // Saude
  Heart, HeartPulse, Pill, Syringe, Stethoscope, Activity,
  Hospital, Cross, Dumbbell, PersonStanding, Footprints,
  // Entretenimento & Lazer
  Gamepad2, Music, Music2, Headphones, Tv, Film, Camera,
  Image, Palette, Brush, Drama, Mic, Radio, PartyPopper, Gift, Sparkles,
  // Educacao
  GraduationCap, BookOpen, Book, Library, Notebook, PenTool,
  Pencil, Highlighter, FileText, Award, Medal, Brain,
  // Vestuario & Compras
  Shirt, ShoppingBag, Store, Package, Tag, Tags, Percent,
  BadgePercent, Gem, Watch, Glasses, Umbrella,
  // Trabalho & Negocios
  Briefcase, Users, UserCircle, Presentation, Monitor, Laptop,
  Printer, Phone, Mail, Send, Calendar, Clock, Timer,
  // Tecnologia
  Code, Terminal, Cpu, HardDrive, Wifi, Bluetooth,
  Smartphone, Tablet, Globe, Cloud, Database, Server, Zap,
  // Servicos & Utilidades
  Wrench, Settings, Hammer, Scissors, Shield, Lock, Unlock, Bell,
  // Viagem & Turismo
  Hotel, Map, Compass, Mountain, TreePine, Tent,
  Backpack, Luggage, Anchor, Sunrise, Sun, Moon,
  // Pets & Animais
  Dog, Cat, Bird, Fish, Bug, Leaf, Flower, TreeDeciduous,
  // Comunicacao
  MessageCircle, MessageSquare, AtSign, Hash, Link, Share2, Rss,
  // Status & Indicadores
  AlertCircle, AlertTriangle, CheckCircle, XCircle, Info,
  HelpCircle, Star, Bookmark, Flag, Target, Crosshair,
  // Outros
  MoreHorizontal, Grid3X3, Layout, Box, Archive, Folder, FileBox, Trash2, Recycle,
};

// Categorias de icones organizadas para o seletor
export const ICON_CATEGORIES = {
  financas: {
    label: 'Financas',
    icons: [
      'Wallet', 'CreditCard', 'Banknote', 'DollarSign', 'Euro', 'PiggyBank',
      'TrendingUp', 'TrendingDown', 'BarChart3', 'LineChart', 'Receipt',
      'Landmark', 'Coins', 'BadgeDollarSign', 'CircleDollarSign', 'HandCoins',
    ],
  },
  casa: {
    label: 'Casa',
    icons: [
      'Home', 'Building', 'Building2', 'Key', 'Sofa', 'Bed', 'Bath', 'Lamp',
      'Lightbulb', 'Plug', 'Flame', 'Droplets', 'Thermometer', 'AirVent',
    ],
  },
  alimentacao: {
    label: 'Comida',
    icons: [
      'ShoppingCart', 'Utensils', 'Coffee', 'Wine', 'Beer', 'Pizza', 'Sandwich',
      'Salad', 'Apple', 'Cherry', 'Egg', 'IceCream', 'Cake', 'CookingPot', 'UtensilsCrossed',
    ],
  },
  transporte: {
    label: 'Transporte',
    icons: [
      'Car', 'CarFront', 'Bus', 'Train', 'Plane', 'Ship', 'Bike', 'Fuel',
      'ParkingCircle', 'Navigation', 'MapPin', 'Route', 'Truck',
    ],
  },
  saude: {
    label: 'Saude',
    icons: [
      'Heart', 'HeartPulse', 'Pill', 'Syringe', 'Stethoscope', 'Activity',
      'Hospital', 'Cross', 'Dumbbell', 'PersonStanding', 'Footprints',
    ],
  },
  lazer: {
    label: 'Lazer',
    icons: [
      'Gamepad2', 'Music', 'Music2', 'Headphones', 'Tv', 'Film', 'Camera',
      'Image', 'Palette', 'Brush', 'Drama', 'Mic', 'Radio', 'PartyPopper', 'Gift', 'Sparkles',
    ],
  },
  educacao: {
    label: 'Educacao',
    icons: [
      'GraduationCap', 'BookOpen', 'Book', 'Library', 'Notebook', 'PenTool',
      'Pencil', 'Highlighter', 'FileText', 'Award', 'Medal', 'Brain',
    ],
  },
  compras: {
    label: 'Compras',
    icons: [
      'Shirt', 'ShoppingBag', 'Store', 'Package', 'Tag', 'Tags', 'Percent',
      'BadgePercent', 'Gem', 'Watch', 'Glasses', 'Umbrella',
    ],
  },
  trabalho: {
    label: 'Trabalho',
    icons: [
      'Briefcase', 'Users', 'UserCircle', 'Presentation', 'Monitor', 'Laptop',
      'Printer', 'Phone', 'Mail', 'Send', 'Calendar', 'Clock', 'Timer',
    ],
  },
  tech: {
    label: 'Tech',
    icons: [
      'Code', 'Terminal', 'Cpu', 'HardDrive', 'Wifi', 'Bluetooth',
      'Smartphone', 'Tablet', 'Globe', 'Cloud', 'Database', 'Server', 'Zap',
    ],
  },
  servicos: {
    label: 'Servicos',
    icons: [
      'Wrench', 'Settings', 'Hammer', 'Scissors', 'Shield', 'Lock', 'Unlock', 'Bell',
    ],
  },
  viagem: {
    label: 'Viagem',
    icons: [
      'Hotel', 'Map', 'Compass', 'Mountain', 'TreePine', 'Tent',
      'Backpack', 'Luggage', 'Anchor', 'Sunrise', 'Sun', 'Moon',
    ],
  },
  natureza: {
    label: 'Natureza',
    icons: ['Dog', 'Cat', 'Bird', 'Fish', 'Bug', 'Leaf', 'Flower', 'TreeDeciduous'],
  },
  comunicacao: {
    label: 'Social',
    icons: ['MessageCircle', 'MessageSquare', 'AtSign', 'Hash', 'Link', 'Share2', 'Rss'],
  },
  outros: {
    label: 'Outros',
    icons: [
      'AlertCircle', 'AlertTriangle', 'CheckCircle', 'XCircle', 'Info',
      'HelpCircle', 'Star', 'Bookmark', 'Flag', 'Target', 'Crosshair',
      'MoreHorizontal', 'Grid3X3', 'Layout', 'Box', 'Archive', 'Folder', 'FileBox', 'Trash2', 'Recycle',
    ],
  },
} as const;

// Icones padrao para cada tipo de categoria
export const DEFAULT_CATEGORY_ICONS: Record<FinanceCategoryType, string> = {
  DESPESA: 'Tag',
  RECEITA: 'Wallet',
};

// Lista de todos icones disponiveis (flat)
export const AVAILABLE_ICONS = Object.values(ICON_CATEGORIES).flatMap(cat =>
  cat.icons.map(name => ({ name, label: name }))
);

interface CategoryIconProps {
  icon?: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  withBackground?: boolean;
}

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const bgSizeClasses = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function CategoryIcon({
  icon = 'Tag',
  color = '#64748b',
  size = 'sm',
  className,
  withBackground = false,
}: CategoryIconProps) {
  const IconComponent = ICON_MAP[icon] || Tag;

  if (withBackground) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg',
          bgSizeClasses[size],
          className
        )}
        style={{ backgroundColor: `${color}15` }}
      >
        <IconComponent
          className={sizeClasses[size]}
          style={{ color }}
        />
      </div>
    );
  }

  return (
    <IconComponent
      className={cn(sizeClasses[size], className)}
      style={{ color }}
    />
  );
}

// Paleta de cores predefinidas para selecao rapida
const COLOR_PALETTE = [
  // Row 1 - Grays
  '#1e293b', '#475569', '#64748b', '#94a3b8',
  // Row 2 - Colors (saturated)
  '#dc2626', '#ea580c', '#d97706', '#ca8a04',
  '#65a30d', '#16a34a', '#059669', '#0d9488',
  '#0891b2', '#0284c7', '#2563eb', '#4f46e5',
  '#7c3aed', '#9333ea', '#c026d3', '#db2777',
  // Row 3 - Colors (muted/pastel)
  '#f87171', '#fb923c', '#fbbf24', '#facc15',
  '#a3e635', '#4ade80', '#34d399', '#2dd4bf',
  '#22d3ee', '#38bdf8', '#60a5fa', '#818cf8',
  '#a78bfa', '#c084fc', '#e879f9', '#f472b6',
];

// ColorPicker otimizado com debounce e paleta
interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker = memo(function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [localColor, setLocalColor] = useState(value);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync local state when value prop changes (e.g., form reset)
  useEffect(() => {
    setLocalColor(value);
  }, [value]);

  // Debounced onChange for native color picker
  const handleColorInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(newColor);
    }, 100);
  }, [onChange]);

  // Immediate onChange for palette clicks
  const handlePaletteSelect = useCallback((color: string) => {
    setLocalColor(color);
    onChange(color);
    setIsPickerOpen(false);
  }, [onChange]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <Popover open={isPickerOpen} onOpenChange={setIsPickerOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-2',
            'text-sm transition-colors',
            'hover:border-slate-300 hover:bg-slate-50',
            'focus:outline-none focus:ring-2 focus:ring-slate-200'
          )}
        >
          <div
            className="h-5 w-5 rounded border border-slate-200"
            style={{ backgroundColor: localColor }}
          />
          <span className="font-mono text-xs text-slate-500">{localColor}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start" sideOffset={4}>
        {/* Paleta de cores */}
        <div className="grid grid-cols-8 gap-1.5">
          {COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handlePaletteSelect(color)}
              className={cn(
                'h-7 w-7 rounded border transition-all',
                localColor === color
                  ? 'border-slate-900 ring-1 ring-slate-900 ring-offset-1'
                  : 'border-transparent hover:scale-110'
              )}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Separador */}
        <div className="my-3 border-t border-slate-100" />

        {/* Cor personalizada */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Personalizada:</span>
          <div className="relative flex-1">
            <input
              type="color"
              value={localColor}
              onChange={handleColorInput}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
            <div
              className="flex h-7 items-center justify-center rounded border border-slate-200 px-2"
              style={{ backgroundColor: localColor }}
            >
              <span
                className="font-mono text-xs font-medium"
                style={{ color: isLightColor(localColor) ? '#1e293b' : '#fff' }}
              >
                {localColor}
              </span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

// Helper para determinar se cor e clara ou escura
function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// Componente para selecao de icone com popover e categorias
interface IconSelectorProps {
  value: string;
  onChange: (icon: string) => void;
  color?: string;
}

const categoryKeys = Object.keys(ICON_CATEGORIES) as Array<keyof typeof ICON_CATEGORIES>;

export const IconSelector = memo(function IconSelector({ value, onChange, color = '#64748b' }: IconSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<keyof typeof ICON_CATEGORIES>('financas');

  const SelectedIcon = ICON_MAP[value] || Tag;

  // Filtra icones por busca
  const filteredIcons = useMemo(() => {
    if (!search.trim()) return null;
    const query = search.toLowerCase();
    return Object.values(ICON_CATEGORIES)
      .flatMap(cat => cat.icons)
      .filter(name => name.toLowerCase().includes(query));
  }, [search]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearch('');
  };

  const iconsToShow = filteredIcons || ICON_CATEGORIES[activeCategory].icons;

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3',
            'text-sm text-slate-700 transition-colors',
            'hover:border-slate-300 hover:bg-slate-50',
            'focus:outline-none focus:ring-2 focus:ring-slate-200'
          )}
        >
          <SelectedIcon className="h-4 w-4" style={{ color }} />
          <span className="text-slate-500">Selecionar icone</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[340px] p-0"
        align="start"
        sideOffset={4}
      >
        {/* Busca */}
        <div className="border-b border-slate-100 p-2">
          <Input
            placeholder="Buscar icone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Tabs de categorias */}
        {!filteredIcons && (
          <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-1.5 scrollbar-none">
            {categoryKeys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCategory(key)}
                className={cn(
                  'shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors',
                  activeCategory === key
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                )}
              >
                {ICON_CATEGORIES[key].label}
              </button>
            ))}
          </div>
        )}

        {/* Grid de icones */}
        <div className="max-h-[240px] overflow-y-auto p-2">
          {filteredIcons && filteredIcons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-slate-400">
              <AlertCircle className="h-5 w-5" />
              <span className="mt-2 text-xs">Nenhum icone encontrado</span>
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1">
              {iconsToShow.map((name) => {
                const IconComponent = ICON_MAP[name] || Tag;
                const isSelected = value === name;

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelect(name)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md border transition-all',
                      isSelected
                        ? 'border-slate-400 bg-slate-100'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                    )}
                    title={name}
                  >
                    <IconComponent
                      className="h-4 w-4"
                      style={{ color: isSelected ? color : '#64748b' }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rodape com icone selecionado */}
        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
          <span className="text-xs text-slate-400">
            {filteredIcons ? `${filteredIcons.length} encontrados` : `${iconsToShow.length} icones`}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Selecionado:</span>
            <div
              className="flex h-6 w-6 items-center justify-center rounded"
              style={{ backgroundColor: `${color}15` }}
            >
              <SelectedIcon className="h-3.5 w-3.5" style={{ color }} />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
