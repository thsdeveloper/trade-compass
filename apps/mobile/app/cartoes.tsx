import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinance } from '@/contexts/FinanceContext';
import { extractCreditCardFromInvoice, getCreditCardInvoice } from '@/lib/finance-api';
import { captureImageFile, pickImageFile, pickInvoiceFile } from '@/lib/statement-file';
import type { PickedStatementFile } from '@/types/import';
import { obterPreset, resolveBankKey } from '@/lib/bancos-brasil';
import { Button } from '@/components/atoms/Button';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { MoneyText } from '@/components/atoms/MoneyText';
import { ScrollEdgeEffect } from '@/components/atoms/ScrollEdgeEffect';
import { AIActionButton } from '@/components/molecules/AIActionButton';
import { CreditCardVisual } from '@/components/molecules/CreditCardVisual';
import { DEFAULT_CARD_COLOR } from '@/components/organisms/CreditCardForm';
import { ReceiptScanningLoader } from '@/components/organisms/ReceiptScanningLoader';
import { formatCurrency } from '@/types/finance';
import type { CreditCardInvoiceSummary, ExtractedCreditCard } from '@/types/finance';

// Mensagens do loader de IA durante a leitura da fatura
const INVOICE_SCAN_MESSAGES = [
  'Lendo sua fatura…',
  'Identificando o cartão…',
  'Extraindo limite e vencimento…',
  'Quase lá…',
];

// Carrossel: espaço entre cartões e "espiada" do próximo cartão na borda
const CARD_GAP = Spacing.md;
const CARD_PEEK = 28;

// Mesma chave da tela de contas: ocultar valores é uma escolha do usuário
// para o app inteiro, não por tela.
const BALANCE_VISIBILITY_KEY = '@balance_visibility';

function GlassCircleButton({
  icon,
  onPress,
  accessibilityLabel,
}: {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      {({ pressed }) => (
        <View style={pressed && styles.pressedScale}>
          <GlassSurface variant="glass" isInteractive style={styles.circleButton}>
            <IconSymbol name={icon} size={20} color={colors.text} />
          </GlassSurface>
        </View>
      )}
    </Pressable>
  );
}

/** Mês corrente no formato YYYY-MM exigido pela rota de fatura. */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** "12/08" a partir de uma data ISO (YYYY-MM-DD). */
function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

export default function CartoesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { creditCards, creditCardsLoaded, loadCreditCards, createCreditCard } =
    useFinance();

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [invoices, setInvoices] = useState<Record<string, CreditCardInvoiceSummary>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollY = useSharedValue(0);

  // Carrossel: um cartão por página, com o próximo espiando na borda direita
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - Spacing.xl * 2 - CARD_PEEK;
  const snapInterval = cardWidth + CARD_GAP;

  const screenBg = isDark ? colors.background : '#F6F7F9';
  // Altura da barra fixa: inset + respiro + botão de 44
  const headerHeight = insets.top + Spacing.sm + 44;

  // Resumo da fatura do mês por cartão — informação secundária: falha fica
  // silenciosa e o cartão aparece sem a linha de fatura.
  const loadInvoices = useCallback(async () => {
    const month = currentMonth();
    const results = await Promise.all(
      creditCards.map(async (card) => {
        try {
          return [card.id, await getCreditCardInvoice(card.id, month)] as const;
        } catch {
          return null;
        }
      })
    );
    setInvoices(Object.fromEntries(results.filter((entry) => entry !== null)));
  }, [creditCards]);

  // Recarrega ao ganhar foco: criar/editar/excluir acontece em telas por cima
  useFocusEffect(
    useCallback(() => {
      loadCreditCards();
    }, [loadCreditCards])
  );

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  useEffect(() => {
    AsyncStorage.getItem(BALANCE_VISIBILITY_KEY)
      .then((stored) => {
        if (stored !== null) setIsBalanceVisible(stored === 'true');
      })
      .catch(() => {});
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadCreditCards();
    await loadInvoices();
    setIsRefreshing(false);
  }, [loadCreditCards, loadInvoices]);

  const toggleBalanceVisibility = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsBalanceVisible((prev) => {
      AsyncStorage.setItem(BALANCE_VISIBILITY_KEY, String(!prev)).catch(() => {});
      return !prev;
    });
  }, []);

  const handleAddCard = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/novo-cartao');
  }, [router]);

  const handleEditCard = useCallback(
    (cardId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: '/editar-cartao', params: { id: cardId } });
    },
    [router]
  );

  // Cor sugerida pela identidade do emissor; paleta neutra quando desconhecido
  const suggestCardColor = useCallback((extracted: ExtractedCreditCard): string => {
    const key = resolveBankKey(extracted.bank_name ?? extracted.name);
    const preset = key ? obterPreset(key) : null;
    return preset?.fundo ?? DEFAULT_CARD_COLOR;
  }, []);

  // Abre o formulário de novo cartão pré-preenchido com o que a IA achou —
  // caminho dos casos incompletos (ex.: fatura sem limite total).
  const openPrefilledForm = useCallback(
    (extracted: ExtractedCreditCard, color: string) => {
      router.push({
        pathname: '/novo-cartao',
        params: {
          name: extracted.name,
          brand: extracted.brand,
          cents:
            extracted.total_limit !== null
              ? String(Math.round(extracted.total_limit * 100))
              : '',
          closingDay: extracted.closing_day !== null ? String(extracted.closing_day) : '',
          dueDay: extracted.due_day !== null ? String(extracted.due_day) : '',
          color,
        },
      });
    },
    [router]
  );

  const registerExtractedCard = useCallback(
    async (extracted: ExtractedCreditCard, message: string) => {
      const color = suggestCardColor(extracted);
      const complete =
        extracted.total_limit !== null &&
        extracted.closing_day !== null &&
        extracted.due_day !== null;

      if (!complete) {
        // Falta dado obrigatório: o formulário pré-preenchido diz o que falta
        Alert.alert('Falta pouco', message, [
          { text: 'Completar cadastro', onPress: () => openPrefilledForm(extracted, color) },
        ]);
        return;
      }

      await createCreditCard({
        name: extracted.name,
        brand: extracted.brand,
        total_limit: extracted.total_limit as number,
        closing_day: extracted.closing_day as number,
        due_day: extracted.due_day as number,
        color,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Cartão cadastrado', message);
    },
    [suggestCardColor, openPrefilledForm, createCreditCard]
  );

  // Fatura escolhida (PDF ou imagem) → IA identifica o cartão → cadastro
  // automático. As transações da fatura entram pelo fluxo de importação de
  // extrato, não por aqui.
  const processInvoiceFile = useCallback(
    async (file: PickedStatementFile) => {
      setIsImporting(true);
      try {
        const result = await extractCreditCardFromInvoice(file);
        if (!result.found || !result.card) {
          Alert.alert('Não foi possível identificar o cartão', result.message);
          return;
        }

        const extracted = result.card;
        const duplicate = creditCards.find(
          (card) => card.name.trim().toLowerCase() === extracted.name.trim().toLowerCase()
        );
        if (duplicate) {
          Alert.alert(
            'Cartão já cadastrado?',
            `Você já tem um cartão chamado "${duplicate.name}". Cadastrar mesmo assim?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Cadastrar',
                onPress: () => {
                  registerExtractedCard(extracted, result.message).catch((error) => {
                    Alert.alert(
                      'Não foi possível cadastrar o cartão',
                      error instanceof Error ? error.message : 'Erro ao criar cartão'
                    );
                  });
                },
              },
            ]
          );
          return;
        }

        await registerExtractedCard(extracted, result.message);
      } catch (error) {
        Alert.alert(
          'Não foi possível ler a fatura',
          error instanceof Error ? error.message : 'Erro ao processar o arquivo'
        );
      } finally {
        setIsImporting(false);
      }
    },
    [creditCards, registerExtractedCard]
  );

  // Roda um seletor de origem (arquivo/galeria/câmera) e processa o resultado
  const importFrom = useCallback(
    async (picker: () => Promise<PickedStatementFile | null>) => {
      let file: PickedStatementFile | null;
      try {
        file = await picker();
      } catch (error) {
        Alert.alert(
          'Não foi possível abrir a fatura',
          error instanceof Error ? error.message : 'Não foi possível ler o arquivo'
        );
        return;
      }
      if (!file) return;
      await processInvoiceFile(file);
    },
    [processInvoiceFile]
  );

  // Sem haptic aqui: o AIActionButton já vibra no toque
  const handleImportInvoice = useCallback(() => {
    Alert.alert(
      'Importar cartão com IA',
      'Envie a fatura do cartão em PDF ou foto e a IA cadastra o cartão para você.',
      [
        { text: 'Arquivo (PDF ou imagem)', onPress: () => importFrom(pickInvoiceFile) },
        { text: 'Galeria de fotos', onPress: () => importFrom(pickImageFile) },
        { text: 'Tirar foto', onPress: () => importFrom(captureImageFile) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  }, [importFrom]);

  const totals = useMemo(
    () =>
      creditCards.reduce(
        (acc, card) => ({
          available: acc.available + card.available_limit,
          total: acc.total + card.total_limit,
        }),
        { available: 0, total: 0 }
      ),
    [creditCards]
  );

  const hasCards = creditCards.length > 0;
  // Exclusões podem deixar o índice fora da lista: clampa na leitura
  const activeCard = hasCards
    ? creditCards[Math.min(activeIndex, creditCards.length - 1)]
    : null;
  const activeInvoice = activeCard ? invoices[activeCard.id] : undefined;

  return (
    <View style={[styles.container, { backgroundColor: screenBg }]}>
      {/* Camada de conteúdo: gradiente de marca para o vidro refratar */}
      <LinearGradient
        colors={
          isDark
            ? ['#1D4ED8', '#16233F', colors.background]
            : ['#0066FF', '#7FB0FF', screenBg]
        }
        locations={[0, 0.55, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing['3xl'],
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={(event) => {
          scrollY.value = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={isDark ? colors.primary : '#FFFFFF'}
          />
        }
      >
        {/* Limite disponível consolidado */}
        <Text style={styles.heroLabel}>
          {hasCards
            ? `Limite disponível em ${creditCards.length} ${
                creditCards.length === 1 ? 'cartão' : 'cartões'
              }`
            : 'Cartões de crédito'}
        </Text>
        <MoneyText
          value={totals.available}
          hidden={!isBalanceVisible}
          style={styles.heroValue}
        />
        {hasCards && isBalanceVisible ? (
          <Text style={styles.heroSubtitle}>
            de {formatCurrency(totals.total)} de limite total
          </Text>
        ) : null}

        {/* Carrossel de cartões: um por página, no formato de cartão físico,
            com o próximo espiando na borda para convidar o swipe */}
        {hasCards && (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={snapInterval}
              snapToAlignment="start"
              decelerationRate="fast"
              disableIntervalMomentum
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / snapInterval
                );
                setActiveIndex(
                  Math.max(0, Math.min(index, creditCards.length - 1))
                );
              }}
              style={styles.carousel}
              contentContainerStyle={styles.carouselContent}
            >
              {creditCards.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => handleEditCard(card.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar cartão ${card.name}`}
                  style={({ pressed }) => [
                    { width: cardWidth },
                    pressed && styles.cardItemPressed,
                  ]}
                >
                  <CreditCardVisual
                    name={card.name}
                    brand={card.brand}
                    color={card.color}
                    totalLimit={card.total_limit}
                    availableLimit={card.available_limit}
                    closingDay={card.closing_day}
                    dueDay={card.due_day}
                    hideValues={!isBalanceVisible}
                  />
                </Pressable>
              ))}
            </ScrollView>

            {/* Indicador de página do carrossel */}
            {creditCards.length > 1 && (
              <View style={styles.dotsRow}>
                {creditCards.map((card, index) => (
                  <View
                    key={card.id}
                    style={[
                      styles.dot,
                      index === Math.min(activeIndex, creditCards.length - 1)
                        ? styles.dotActive
                        : styles.dotIdle,
                    ]}
                  />
                ))}
              </View>
            )}

            {/* Fatura do cartão em foco no carrossel */}
            {activeCard && activeInvoice ? (
              <GlassSurface
                variant="material"
                style={[
                  styles.invoiceRow,
                  {
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: isDark
                      ? 'rgba(255,255,255,0.10)'
                      : 'rgba(255,255,255,0.65)',
                  },
                ]}
              >
                <View style={styles.invoiceInfo}>
                  <Text
                    style={[styles.invoiceLabel, { color: colors.textSecondary }]}
                    numberOfLines={1}
                  >
                    Fatura atual · {activeCard.name}
                  </Text>
                  <Text style={[styles.invoiceDue, { color: colors.textSecondary }]}>
                    Vence {shortDate(activeInvoice.due_date)}
                  </Text>
                </View>
                <MoneyText
                  value={activeInvoice.remaining_amount}
                  hidden={!isBalanceVisible}
                  style={[styles.invoiceValue, { color: colors.text }]}
                />
              </GlassSurface>
            ) : null}
          </>
        )}

        {/* Estado vazio */}
        {!hasCards && creditCardsLoaded && (
          <GlassSurface
            variant="material"
            style={[
              styles.emptyState,
              {
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: isDark
                  ? 'rgba(255,255,255,0.10)'
                  : 'rgba(255,255,255,0.65)',
              },
            ]}
          >
            <IconSymbol name="creditcard" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nenhum cartão cadastrado
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Cadastre seus cartões de crédito para acompanhar limite e fatura
              em um só lugar.
            </Text>
          </GlassSurface>
        )}

        {/* Ação: adicionar cartão (CTA primário do design system) */}
        <Button
          label="Adicionar cartão"
          onPress={handleAddCard}
          style={styles.addCardButton}
        />

        {/* Ação com IA: a fatura (PDF, galeria ou foto) vira cadastro — mesma
            assinatura visual do "Pergunte ao Norte" da home */}
        <AIActionButton
          label="Importar cartão com IA"
          onPress={handleImportInvoice}
          disabled={isImporting}
          accessibilityLabel="Importar cartão com inteligência artificial, enviando a fatura em PDF ou foto"
          style={styles.importInvoiceButton}
        />
      </ScrollView>

      {/* Camada funcional fixa: voltar + olho + novo cartão em vidro, com
          scroll edge effect materializando o fundo quando o conteúdo rola */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top + Spacing.sm }]}>
        <ScrollEdgeEffect scrollY={scrollY} />
        <View style={styles.topBarRow}>
          <GlassCircleButton
            icon="arrow.left"
            onPress={() => router.back()}
            accessibilityLabel="Voltar"
          />
          <View style={styles.topBarActions}>
            <GlassCircleButton
              icon={isBalanceVisible ? 'eye.fill' : 'eye.slash.fill'}
              onPress={toggleBalanceVisibility}
              accessibilityLabel={isBalanceVisible ? 'Ocultar valores' : 'Mostrar valores'}
            />
            <GlassCircleButton
              icon="plus"
              onPress={handleAddCard}
              accessibilityLabel="Adicionar cartão"
            />
          </View>
        </View>
      </View>

      {/* Overlay de IA lendo a fatura */}
      <ReceiptScanningLoader visible={isImporting} messages={INVOICE_SCAN_MESSAGES} />
    </View>
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
    height: 460,
  },
  content: {
    paddingHorizontal: Spacing.xl,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  topBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.sm,
  },
  topBarActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedScale: {
    transform: [{ scale: 0.94 }],
  },
  heroLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    color: 'rgba(255,255,255,0.85)',
  },
  heroValue: {
    fontSize: 48,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: Spacing.sm,
  },
  carousel: {
    // Full-bleed: o carrossel fura o padding lateral do conteúdo para os
    // cartões deslizarem até a borda da tela
    marginHorizontal: -Spacing.xl,
    marginTop: Spacing.xl,
  },
  carouselContent: {
    paddingHorizontal: Spacing.xl,
    gap: CARD_GAP,
  },
  cardItemPressed: {
    transform: [{ scale: 0.98 }],
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  dotIdle: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  invoiceInfo: {
    gap: 2,
  },
  invoiceLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  invoiceDue: {
    fontSize: FontSize.xs,
  },
  invoiceValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    marginTop: Spacing.xl,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  addCardButton: {
    marginTop: Spacing['2xl'],
  },
  importInvoiceButton: {
    marginTop: Spacing.md,
  },
});
