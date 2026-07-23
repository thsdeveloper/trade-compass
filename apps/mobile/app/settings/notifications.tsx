import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';

import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { Button } from '@/components/atoms/Button';
import { ScreenHeader, SCREEN_HEADER_HEIGHT } from '@/components/molecules/ScreenHeader';
import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/lib/profile-api';

// Fusos aceitos pelo backend (mesma allowlist da API). Só enviamos o fuso do
// device quando ele estiver aqui; senão o servidor mantém America/Sao_Paulo.
const ALLOWED_TIMEZONES = new Set([
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Fortaleza',
  'America/Recife',
  'America/Bahia',
  'America/Cuiaba',
  'America/Rio_Branco',
  'America/Belem',
  'America/Noronha',
]);

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

function hourToDate(hour: number): Date {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return date;
}

/**
 * Preferências de notificação por e-mail: liga/desliga o lembrete diário e
 * escolhe a hora do envio. Persiste no perfil (profiles) via /profile/update.
 */
export default function NotificationSettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const screenBg = isDark ? colors.background : '#F6F7F9';
  const hairlineColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.65)';
  const fieldBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.05)';
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const scrollY = useSharedValue(0);
  const headerOffset = insets.top + SCREEN_HEADER_HEIGHT + Spacing.md;

  const [enabled, setEnabled] = useState<boolean>(profile?.daily_email_enabled ?? false);
  const [hour, setHour] = useState<number>(profile?.daily_email_hour ?? 8);
  const [original, setOriginal] = useState({
    enabled: profile?.daily_email_enabled ?? false,
    hour: profile?.daily_email_hour ?? 8,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(hourToDate(hour));

  // Semeia o estado a partir do perfil na primeira vez que ele chega (o contexto
  // pode não estar carregado no primeiro render).
  const seeded = useRef(profile != null);
  useEffect(() => {
    if (!seeded.current && profile) {
      seeded.current = true;
      setEnabled(profile.daily_email_enabled);
      setHour(profile.daily_email_hour);
      setOriginal({ enabled: profile.daily_email_enabled, hour: profile.daily_email_hour });
    }
  }, [profile]);

  const hasChanges = enabled !== original.enabled || hour !== original.hour;

  const openPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftDate(hourToDate(hour));
    setPickerOpen(true);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updates: {
      daily_email_enabled: boolean;
      daily_email_hour: number;
      timezone?: string;
    } = {
      daily_email_enabled: enabled,
      daily_email_hour: hour,
    };

    const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (deviceTz && ALLOWED_TIMEZONES.has(deviceTz)) {
      updates.timezone = deviceTz;
    }

    try {
      const result = await updateProfile(updates);

      if (result.error) {
        Alert.alert('Erro', result.error);
        return;
      }

      setOriginal({ enabled, hour });
      await refreshProfile();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Erro', 'Nao foi possivel salvar as alteracoes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: screenBg }]} edges={['bottom']}>
      <LinearGradient
        colors={
          isDark ? ['#1D4ED8', '#16233F', colors.background] : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.55, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: headerOffset }]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
      >
        <GlassSurface variant="material" style={[styles.card, { borderColor: hairlineColor }]}>
          {/* Ativar/desativar */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <IconSymbol name="envelope.fill" size={22} color={colors.text} />
              <View style={styles.rowTexts}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>E-mail diario</Text>
                <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                  Resumo das contas atrasadas e que vencem amanha
                </Text>
              </View>
            </View>
            <Switch
              value={enabled}
              onValueChange={(value) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEnabled(value);
              }}
              trackColor={{ true: colors.primary, false: undefined }}
              accessibilityLabel="Ativar e-mail diario de vencimentos"
            />
          </View>

          {/* Horario (só quando ativo) */}
          {enabled && (
            <TouchableOpacity
              style={[styles.row, styles.rowDivider, { borderTopColor: colors.border }]}
              onPress={openPicker}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Horario do envio: ${formatHour(hour)}`}
            >
              <View style={styles.rowLeft}>
                <IconSymbol name="clock" size={22} color={colors.text} />
                <View style={styles.rowTexts}>
                  <Text style={[styles.rowLabel, { color: colors.text }]}>Horario do envio</Text>
                  <Text style={[styles.rowDescription, { color: colors.textSecondary }]}>
                    Voce recebe o e-mail por volta desse horario
                  </Text>
                </View>
              </View>
              <View style={[styles.timePill, { backgroundColor: fieldBg }]}>
                <Text style={[styles.timeText, { color: colors.text }]}>{formatHour(hour)}</Text>
              </View>
            </TouchableOpacity>
          )}
        </GlassSurface>

        <Text style={[styles.hint, { color: isDark ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
          Enviamos um unico e-mail por dia agrupando todas as pendencias. Se nao houver nada
          atrasado ou vencendo amanha, nenhum e-mail e enviado.
        </Text>
      </ScrollView>

      {/* CTA fixo do rodape */}
      <View style={styles.footer}>
        <Button
          label="Salvar"
          onPress={handleSave}
          variant="primary"
          loading={isSaving}
          disabled={!hasChanges}
        />
      </View>

      {/* Picker de hora — spinner em Modal no iOS, dialogo nativo no Android */}
      {pickerOpen && Platform.OS === 'ios' && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
          <View style={styles.backdrop}>
            <View style={[styles.pickerSheet, { backgroundColor: colors.surface }]}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setPickerOpen(false)}>
                  <Text style={[styles.pickerCancel, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={[styles.pickerTitle, { color: colors.text }]}>Horario do envio</Text>
                <TouchableOpacity
                  onPress={() => {
                    setHour(draftDate.getHours());
                    setPickerOpen(false);
                  }}
                >
                  <Text style={[styles.pickerDone, { color: colors.primary }]}>Concluir</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draftDate}
                mode="time"
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

      {pickerOpen && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={draftDate}
          mode="time"
          display="default"
          onChange={(event, date) => {
            setPickerOpen(false);
            if (date && event.type !== 'dismissed') {
              setHour(date.getHours());
            }
          }}
        />
      )}

      <ScreenHeader title="Notificacoes" scrollY={scrollY} onBack={() => router.back()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  card: {
    borderRadius: BorderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  rowDescription: {
    fontSize: FontSize.xs,
  },
  timePill: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  timeText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  hint: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xs,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  footer: {
    padding: Spacing.xl,
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
