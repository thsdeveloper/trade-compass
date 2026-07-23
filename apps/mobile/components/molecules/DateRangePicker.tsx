import { useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type DateRange = { start: string | null; end: string | null };

type EditingField = 'start' | 'end';

function parseIsoDate(value: string | null): Date {
  return value ? new Date(value + 'T12:00:00') : new Date();
}

function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatLabel(value: string | null): string {
  if (!value) return 'Selecionar';
  return parseIsoDate(value).toLocaleDateString('pt-BR');
}

type DateRangePickerProps = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

/**
 * Seleção de intervalo de datas (De → Até). Cada campo abre o picker nativo:
 * spinner em Modal próprio no iOS (Modal aninhado — evita o pan do BottomSheet
 * roubar o gesto do spinner), diálogo nativo no Android.
 */
export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = Colors[colorScheme ?? 'light'];

  const [editing, setEditing] = useState<EditingField | null>(null);
  const [draftDate, setDraftDate] = useState<Date>(new Date());

  const fieldBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)';

  const openField = (field: EditingField) => {
    setDraftDate(parseIsoDate(value[field]));
    setEditing(field);
  };

  const commit = (field: EditingField, date: Date) => {
    const iso = toIsoDate(date);
    const next: DateRange = { ...value, [field]: iso };
    // Range invertido: a outra ponta acompanha a data escolhida
    if (next.start && next.end && next.start > next.end) {
      next.start = iso;
      next.end = iso;
    }
    onChange(next);
  };

  const renderField = (field: EditingField, label: string) => (
    <TouchableOpacity
      style={[styles.field, { backgroundColor: fieldBg }]}
      onPress={() => openField(field)}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${formatLabel(value[field])}`}
    >
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.fieldValue,
          { color: value[field] ? colors.text : colors.textSecondary },
        ]}
      >
        {formatLabel(value[field])}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.row}>
      {renderField('start', 'De')}
      {renderField('end', 'Até')}

      {editing !== null && Platform.OS === 'ios' && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setEditing(null)}
        >
          <View style={styles.backdrop}>
            <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setEditing(null)}>
                  <Text style={[styles.pickerCancel, { color: colors.textSecondary }]}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>
                  {editing === 'start' ? 'Data inicial' : 'Data final'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    commit(editing, draftDate);
                    setEditing(null);
                  }}
                >
                  <Text style={[styles.pickerDone, { color: colors.primary }]}>
                    Concluir
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) setDraftDate(date);
                }}
                themeVariant={isDark ? 'dark' : 'light'}
                locale="pt-BR"
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}

      {editing !== null && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={draftDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            const field = editing;
            setEditing(null);
            if (date && field) commit(field, date);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  field: {
    flex: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Spacing.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  pickerTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  pickerCancel: {
    fontSize: FontSize.md,
  },
  pickerDone: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  picker: {
    alignSelf: 'center',
  },
});
