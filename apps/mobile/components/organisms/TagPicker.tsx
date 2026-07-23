import { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/atoms/Button';
import { TextField } from '@/components/atoms/TextField';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { SelectableChip } from '@/components/molecules/SelectableChip';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';

interface TagPickerProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Tags da transação: linha horizontal de chips multi-seleção com criação
 * inline — o chip "+ Nova" abre um BottomSheet com campo de nome; a tag criada
 * já entra selecionada. As tags vêm do FinanceContext (cache da sessão).
 */
export function TagPicker({ selectedIds, onChange }: TagPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { tags, createTag } = useFinance();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setNewName('');
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setIsCreating(true);
    try {
      const tag = await createTag(name);
      onChange([...selectedIds, tag.id]);
      closeSheet();
    } catch (error) {
      // Ex.: nome duplicado (unique por usuário no backend)
      Alert.alert(
        'Não foi possível criar a tag',
        error instanceof Error ? error.message : 'Tente novamente.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Tags</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        keyboardShouldPersistTaps="handled"
      >
        {tags.map((tag) => (
          <SelectableChip
            key={tag.id}
            label={tag.name}
            selected={selectedIds.includes(tag.id)}
            onToggle={() => toggle(tag.id)}
            compact
          />
        ))}

        <TouchableOpacity
          style={[styles.newChip, { borderColor: colors.border }]}
          onPress={() => setSheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Criar nova tag"
        >
          <Ionicons name="add" size={13} color={colors.textSecondary} />
          <Text style={[styles.newChipLabel, { color: colors.textSecondary }]}>
            {tags.length === 0 ? 'Criar tag' : 'Nova'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomSheet title="Nova tag" visible={sheetVisible} onClose={closeSheet}>
        <View style={styles.sheetBody}>
          <TextField
            label="Nome da tag"
            value={newName}
            onChangeText={setNewName}
            autoFocus
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleCreate}
          />
          <Button
            label="Criar tag"
            onPress={handleCreate}
            loading={isCreating}
            disabled={!newName.trim()}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  newChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
  },
  newChipLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  sheetBody: {
    gap: Spacing.lg,
    paddingBottom: Spacing.md,
  },
});
