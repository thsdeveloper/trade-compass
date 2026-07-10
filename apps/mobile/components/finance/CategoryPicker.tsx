import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FinanceCategory } from '@/types/finance';

interface CategoryPickerProps {
  categories: FinanceCategory[];
  selectedId: string | null;
  onSelect: (category: FinanceCategory) => void;
  placeholder?: string;
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  placeholder = 'Selecione uma categoria',
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const selectedCategory = categories.find((c) => c.id === selectedId);

  const handleSelect = (category: FinanceCategory) => {
    onSelect(category);
    setIsOpen(false);
  };

  const renderItem = ({ item }: { item: FinanceCategory }) => (
    <TouchableOpacity
      style={[
        styles.item,
        item.id === selectedId && styles.selectedItem,
        { backgroundColor: isDark ? '#1f2937' : '#fff' },
      ]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      <Text style={[styles.itemText, { color: colors.text }]}>{item.name}</Text>
      {item.id === selectedId && (
        <IconSymbol name="checkmark" size={20} color={colors.tint} />
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        {selectedCategory ? (
          <View style={styles.selectedContainer}>
            <View
              style={[styles.colorDot, { backgroundColor: selectedCategory.color }]}
            />
            <Text style={[styles.selectedText, { color: colors.text }]}>
              {selectedCategory.name}
            </Text>
          </View>
        ) : (
          <Text style={[styles.placeholder, { color: colors.icon }]}>
            {placeholder}
          </Text>
        )}
        <IconSymbol name="chevron.right" size={20} color={colors.icon} />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background, paddingTop: insets.top },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Selecione uma categoria
            </Text>
            <TouchableOpacity
              onPress={() => setIsOpen(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <IconSymbol name="xmark" size={24} color={colors.icon} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: isDark ? '#374151' : '#e5e7eb' }]} />
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedText: {
    fontSize: 16,
  },
  placeholder: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  selectedItem: {
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
  },
  itemText: {
    fontSize: 16,
    flex: 1,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
});
