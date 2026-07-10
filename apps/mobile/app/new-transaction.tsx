import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { TransactionTypeToggle } from '@/components/finance/TransactionTypeToggle';
import { CategoryPicker } from '@/components/finance/CategoryPicker';
import { AccountPicker } from '@/components/finance/AccountPicker';
import type { TransactionType, TransactionFormData } from '@/types/finance';

export default function NewTransactionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const {
    categories,
    accounts,
    isLoading,
    loadCategories,
    loadAccounts,
    createTransaction,
  } = useFinance();

  const [type, setType] = useState<TransactionType>('DESPESA');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    loadAccounts();
  }, [loadCategories, loadAccounts]);

  const handleAmountChange = (text: string) => {
    // Only allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.,]/g, '').replace(',', '.');
    setAmount(cleaned);
  };

  const handleDateChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const validateForm = (): boolean => {
    if (!categoryId) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return false;
    }
    if (!accountId) {
      Alert.alert('Erro', 'Selecione uma conta');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Erro', 'Digite uma descricao');
      return false;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Digite um valor valido');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const data: TransactionFormData = {
        type,
        category_id: categoryId!,
        account_id: accountId!,
        description: description.trim(),
        amount: parseFloat(amount),
        due_date: dueDate.toISOString().split('T')[0],
        notes: notes.trim() || undefined,
      };

      await createTransaction(data);
      router.back();
    } catch (error) {
      Alert.alert(
        'Erro',
        error instanceof Error ? error.message : 'Erro ao criar transacao'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <IconSymbol name="xmark" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Nova Transacao
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
          <TransactionTypeToggle value={type} onChange={setType} />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
          <CategoryPicker
            categories={categories}
            selectedId={categoryId}
            onSelect={(cat) => setCategoryId(cat.id)}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Descricao</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                color: colors.text,
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Ex: Aluguel, Supermercado..."
            placeholderTextColor={colors.icon}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Valor</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                color: colors.text,
              },
            ]}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0,00"
            placeholderTextColor={colors.icon}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Data</Text>
          <TouchableOpacity
            style={[
              styles.dateButton,
              { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' },
            ]}
            onPress={() => setShowDatePicker(true)}
          >
            <IconSymbol name="calendar" size={20} color={colors.icon} />
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formatDisplayDate(dueDate)}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              locale="pt-BR"
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>Conta</Text>
          <AccountPicker
            accounts={accounts}
            selectedId={accountId}
            onSelect={(acc) => setAccountId(acc.id)}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.text }]}>
            Observacoes (opcional)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: isDark ? '#1f2937' : '#f3f4f6',
                color: colors.text,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Adicione notas..."
            placeholderTextColor={colors.icon}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.tint },
              isSaving && styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 16,
  },
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
});
