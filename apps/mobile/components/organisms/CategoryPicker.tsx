import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { PickerModal, type PickerOption } from '@/components/organisms/PickerModal';
import { getCategoryIcon } from '@/lib/category-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { FinanceCategory } from '@/types/finance';

interface CategoryPickerProps {
  categories: FinanceCategory[];
  selectedId: string | null;
  onSelect: (category: FinanceCategory) => void;
  placeholder?: string;
  /** Trigger customizado (ex.: chip); se ausente, usa a linha padrão */
  renderTrigger?: (args: {
    open: () => void;
    selected: FinanceCategory | undefined;
  }) => ReactNode;
}

export function CategoryPicker({
  categories,
  selectedId,
  onSelect,
  placeholder = 'Selecione uma categoria',
  renderTrigger,
}: CategoryPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const selectedCategory = categories.find((c) => c.id === selectedId);

  // Monta a hierarquia pai → filhos a partir da lista plana
  const options = useMemo<PickerOption[]>(() => {
    const toOption = (c: FinanceCategory): PickerOption => ({
      id: c.id,
      label: c.name,
      color: c.color,
      iconName: getCategoryIcon(c.icon),
    });

    const byParent = new Map<string, FinanceCategory[]>();
    for (const c of categories) {
      if (c.parent_id) {
        const arr = byParent.get(c.parent_id) ?? [];
        arr.push(c);
        byParent.set(c.parent_id, arr);
      }
    }

    return categories
      .filter((c) => !c.parent_id)
      .map((parent) => ({
        ...toOption(parent),
        children: (byParent.get(parent.id) ?? []).map(toOption),
      }));
  }, [categories]);

  const handleSelect = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (category) onSelect(category);
  };

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open: () => setIsOpen(true), selected: selectedCategory })
      ) : (
        <TouchableOpacity
          style={[styles.trigger, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.7}
        >
          {selectedCategory ? (
            <View style={styles.selectedContainer}>
              <IconSymbol
                name={getCategoryIcon(selectedCategory.icon)}
                size={18}
                color={selectedCategory.color}
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
      )}

      <PickerModal
        visible={isOpen}
        onClose={() => setIsOpen(false)}
        title="Selecione uma categoria"
        searchPlaceholder="Buscar categoria..."
        options={options}
        selectedId={selectedId}
        onSelect={handleSelect}
      />
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
  selectedText: {
    fontSize: 16,
  },
  placeholder: {
    fontSize: 16,
  },
});
