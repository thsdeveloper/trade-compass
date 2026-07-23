import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/atoms/Button';
import { BottomSheet } from '@/components/organisms/BottomSheet';
import { SelectableChip } from '@/components/molecules/SelectableChip';
import { Colors, FontSize, FontWeight, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RecurrenceFrequency } from '@/types/finance';
import { RECURRENCE_FREQUENCY_LABELS } from '@/types/finance';

export interface RecurrenceConfig {
  frequency: RecurrenceFrequency;
  /** YYYY-MM-DD; null = repete sem data final */
  endDate: string | null;
}

interface RecurrenceSheetProps {
  visible: boolean;
  onClose: () => void;
  /** null = repetição desligada */
  value: RecurrenceConfig | null;
  onChange: (config: RecurrenceConfig | null) => void;
  /** Data da transação — âncora do resumo ("a partir de ...") */
  startDate: Date;
}

const FREQUENCIES = Object.keys(
  RECURRENCE_FREQUENCY_LABELS
) as RecurrenceFrequency[];

/** Resumo em linguagem natural: "Repete mensalmente a partir de 21/07/2026" */
function summaryText(
  frequency: RecurrenceFrequency,
  startDate: Date,
  endDate: string | null
): string {
  const freqText: Record<RecurrenceFrequency, string> = {
    DIARIA: 'diariamente',
    SEMANAL: 'semanalmente',
    QUINZENAL: 'a cada 15 dias',
    MENSAL: 'mensalmente',
    BIMESTRAL: 'a cada 2 meses',
    TRIMESTRAL: 'a cada 3 meses',
    SEMESTRAL: 'a cada 6 meses',
    ANUAL: 'anualmente',
  };
  const start = startDate.toLocaleDateString('pt-BR');
  let text = `Repete ${freqText[frequency]} a partir de ${start}`;
  if (endDate) {
    const [y, m, d] = endDate.split('-').map(Number);
    text += ` até ${new Date(y, m - 1, d).toLocaleDateString('pt-BR')}`;
  }
  return text;
}

/**
 * Configuração de repetição da transação: frequência (Diária…Anual) e data
 * final opcional. Devolve null em "Remover repetição" — a tela então salva uma
 * transação comum em vez de uma recorrência.
 */
export function RecurrenceSheet({
  visible,
  onClose,
  value,
  onChange,
  startDate,
}: RecurrenceSheetProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [frequency, setFrequency] = useState<RecurrenceFrequency>('MENSAL');
  const [endDate, setEndDate] = useState<string | null>(null);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Reabrir o sheet parte da configuração vigente
  useEffect(() => {
    if (!visible) return;
    setFrequency(value?.frequency ?? 'MENSAL');
    setEndDate(value?.endDate ?? null);
    setShowEndPicker(false);
  }, [visible, value]);

  const endDateValue = (() => {
    if (!endDate) return startDate;
    const [y, m, d] = endDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  })();

  const toISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const confirm = () => {
    onChange({ frequency, endDate });
    onClose();
  };

  const remove = () => {
    onChange(null);
    onClose();
  };

  return (
    <BottomSheet title="Repetir" visible={visible} onClose={onClose}>
      <View style={styles.body}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Frequência
        </Text>
        <View style={styles.chipsWrap}>
          {FREQUENCIES.map((freq) => (
            <SelectableChip
              key={freq}
              label={RECURRENCE_FREQUENCY_LABELS[freq]}
              selected={frequency === freq}
              onToggle={() => setFrequency(freq)}
              accessibilityRole="radio"
            />
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Duração
        </Text>
        <View style={styles.chipsWrap}>
          <SelectableChip
            label="Sem data final"
            selected={endDate === null}
            onToggle={() => {
              setEndDate(null);
              setShowEndPicker(false);
            }}
            accessibilityRole="radio"
          />
          <SelectableChip
            label={
              endDate
                ? `Até ${endDateValue.toLocaleDateString('pt-BR')}`
                : 'Definir data final'
            }
            icon="calendar-outline"
            selected={endDate !== null}
            onToggle={() => {
              if (endDate === null) setEndDate(toISODate(startDate));
              setShowEndPicker(true);
            }}
            accessibilityRole="radio"
          />
        </View>

        {showEndPicker && endDate !== null ? (
          <DateTimePicker
            value={endDateValue}
            mode="date"
            minimumDate={startDate}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, date) => {
              if (Platform.OS !== 'ios') setShowEndPicker(false);
              if (date) setEndDate(toISODate(date));
            }}
            themeVariant="dark"
            locale="pt-BR"
            style={styles.datePicker}
          />
        ) : null}

        <Text style={[styles.summary, { color: colors.textSecondary }]}>
          {summaryText(frequency, startDate, endDate)}
        </Text>

        <Button label="Concluir" onPress={confirm} />
        {value ? (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={remove}
            accessibilityRole="button"
          >
            <Text style={[styles.removeLabel, { color: colors.danger }]}>
              Remover repetição
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  sectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  datePicker: {
    alignSelf: 'center',
  },
  summary: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  removeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  removeLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});
