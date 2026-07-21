import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAgent } from '@/contexts/AgentContext';
import { MAX_MESSAGE_LENGTH } from '@/lib/agent-api';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { GlassSurface } from '@/components/atoms/GlassSurface';
import { AIRing } from '@/components/atoms/AIRing';
import { ScrollEdgeEffect } from '@/components/atoms/ScrollEdgeEffect';
import { Button } from '@/components/atoms/Button';
import { ConfirmDialog } from '@/components/organisms/ConfirmDialog';
import type { ChatMessage } from '@/types/agent';

const AI_GRADIENT = ['#7C3AED', '#A855F7', '#D946EF'] as const;
// Espessura do anel "IA" (mesma assinatura visual da AskNorteBar)
const RING_WIDTH = 2;
// Altura da linha do header (avatar + títulos + ações)
const HEADER_BAR_HEIGHT = 56;

const SUGGESTIONS = [
  'Qual é o meu saldo atual?',
  'Como está meu fluxo de caixa este mês?',
  'Quais são as próximas contas a pagar?',
  'Quanto gastei este mês por categoria?',
];

type ThemeColors = (typeof Colors)['light'];

interface MessageBubbleProps {
  message: ChatMessage;
  colors: ThemeColors;
}

const MessageBubble = memo(function MessageBubble({
  message,
  colors,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (!isUser && message.isStreaming && !message.content) {
    return (
      <View style={styles.assistantRow}>
        <AvatarBadge />
        {/* Bolha do assistente em material frosted (camada de conteúdo) */}
        <GlassSurface variant="material" style={[styles.bubble, styles.assistantBubble]}>
          <ActivityIndicator size="small" color="#A855F7" />
        </GlassSurface>
      </View>
    );
  }

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.primary }]}>
          <Text style={[styles.bubbleText, { color: colors.textOnPrimary }]}>
            {message.content}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantRow}>
      <AvatarBadge />
      <GlassSurface variant="material" style={[styles.bubble, styles.assistantBubble]}>
        <Text style={[styles.bubbleText, { color: colors.text }]}>{message.content}</Text>
      </GlassSurface>
    </View>
  );
});

function AvatarBadge({ size = 28 }: { size?: number }) {
  return (
    <LinearGradient
      colors={AI_GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <IconSymbol name="sparkles" size={size * 0.55} color="#FFFFFF" />
    </LinearGradient>
  );
}

export default function AgentChatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopStreaming,
    retryLast,
  } = useAgent();
  const [input, setInput] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [confirmClearVisible, setConfirmClearVisible] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    if (messages.length > 0) {
      // Aguarda o layout do novo item antes de rolar
      const timer = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || isLoading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
    sendMessage(content);
  }, [input, isLoading, sendMessage]);

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      if (isLoading) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      sendMessage(suggestion);
    },
    [isLoading, sendMessage]
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => <MessageBubble message={item} colors={colors} />,
    [colors]
  );

  const canSend = input.trim().length > 0 && !isLoading;

  const isDark = colorScheme === 'dark';
  const ambientColors = isDark
    ? (['#5B21B6', '#241536', colors.background] as const)
    : (['#7C3AED', '#C4A7F7', '#F6F7F9'] as const);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Gradiente ambiente da identidade do Norte: a camada de conteúdo dá
          ao vidro algo para refratar (edge-to-edge, atrás de tudo) */}
      <LinearGradient
        colors={ambientColors}
        locations={[0, 0.5, 1]}
        style={styles.ambientBackground}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyState}>
            <AvatarBadge size={64} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Oi, eu sou o Norte
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Pergunte sobre saldo, fluxo de caixa, contas a pagar e gastos do mês.
            </Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => handleSuggestion(suggestion)}
                  style={({ pressed }) => [pressed && styles.pressedScale]}
                >
                  {/* Chip em material frosted (camada de conteúdo) */}
                  <GlassSurface variant="material" style={styles.suggestionChip}>
                    <Text style={[styles.suggestionText, { color: colors.text }]}>
                      {suggestion}
                    </Text>
                  </GlassSurface>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="interactive"
            onScroll={(event) => {
              scrollY.value = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
          />
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
            <IconSymbol name="exclamationmark.circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            <Pressable
              onPress={retryLast}
              accessibilityRole="button"
              accessibilityLabel="Tentar enviar novamente"
              style={({ pressed }) => [pressed && styles.pressedScale]}
            >
              <Text style={[styles.retryText, { color: colors.danger }]}>
                Tentar novamente
              </Text>
            </Pressable>
          </View>
        )}

        {/* Input bar: controles flutuando sobre o gradiente, sem borda sólida */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(insets.bottom, Spacing.md) },
          ]}
        >
          {/* Campo de texto em cápsula de material frosted; o anel "IA"
              acende no foco e enquanto o Norte responde */}
          <AIRing
            width={RING_WIDTH}
            borderRadius={24 + RING_WIDTH}
            active={inputFocused || isLoading}
            style={styles.inputRing}
          >
            <GlassSurface variant="material" style={styles.inputCapsule}>
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={input}
                onChangeText={setInput}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Pergunte sobre suas finanças..."
                placeholderTextColor={colors.textSecondary}
                maxLength={MAX_MESSAGE_LENGTH}
                multiline
                editable={!isLoading}
                onSubmitEditing={handleSend}
                submitBehavior="submit"
                returnKeyType="send"
              />
              {input.length >= MAX_MESSAGE_LENGTH - 100 && (
                <Text style={[styles.charCounter, { color: colors.textSecondary }]}>
                  {input.length}/{MAX_MESSAGE_LENGTH}
                </Text>
              )}
            </GlassSurface>
          </AIRing>
          {/* Enviar vira Parar durante o streaming (recurso padrão de chat IA) */}
          {isLoading ? (
            <Button
              iconOnly
              icon="stop"
              size="md"
              onPress={stopStreaming}
              accessibilityLabel="Parar resposta"
            />
          ) : (
            <Button
              iconOnly
              icon="arrow-up"
              size="md"
              onPress={handleSend}
              disabled={!canSend}
              accessibilityLabel="Enviar mensagem"
            />
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Header integrado ao corpo: transparente em repouso, um corpo só com
          o conteúdo. Renderizado por último para o material de sistema se
          materializar atrás dele (blur no header todo) quando a conversa
          rola por baixo. */}
      <View style={styles.header}>
        <ScrollEdgeEffect scrollY={scrollY} />
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <AvatarBadge size={34} />
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Norte</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Seu norte financeiro
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {messages.length > 0 && (
              <Pressable
                onPress={() => setConfirmClearVisible(true)}
                accessibilityLabel="Limpar conversa"
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.pressedScale,
                ]}
              >
                <IconSymbol name="trash" size={20} color={colors.text} />
              </Pressable>
            )}
            <Pressable
              onPress={() => router.back()}
              accessibilityLabel="Fechar chat"
              style={({ pressed }) => [
                styles.headerButton,
                pressed && styles.pressedScale,
              ]}
            >
              <IconSymbol name="xmark" size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* Limpar é destrutivo e irreversível: sempre passa pelo alerta */}
      <ConfirmDialog
        visible={confirmClearVisible}
        title="Limpar conversa?"
        message="Todas as mensagens desta conversa serão apagadas. Essa ação não pode ser desfeita."
        confirmLabel="Limpar"
        icon="trash"
        onConfirm={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          clearMessages();
          setConfirmClearVisible(false);
        }}
        onCancel={() => setConfirmClearVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  ambientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 380,
  },
  header: {
    // Flutua sobre o conteúdo: transparente em repouso, o ScrollEdgeEffect
    // (absoluteFill) materializa o blur atrás dele durante o scroll
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEADER_BAR_HEIGHT,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedScale: {
    // Feedback de toque por escala (opacity quebraria o Liquid Glass)
    transform: [{ scale: 0.94 }],
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
    // Começa abaixo do header flutuante; ao rolar, passa por baixo do blur
    paddingTop: HEADER_BAR_HEIGHT + Spacing.sm * 2 + Spacing.md,
    gap: Spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
  },
  userBubble: {
    borderBottomRightRadius: BorderRadius.sm,
  },
  assistantBubble: {
    borderBottomLeftRadius: BorderRadius.sm,
  },
  bubbleText: {
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['2xl'],
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    marginTop: Spacing.md,
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  suggestions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
    alignSelf: 'stretch',
  },
  suggestionChip: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  suggestionText: {
    fontSize: FontSize.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  inputRing: {
    flex: 1,
  },
  inputCapsule: {
    // Cápsula: radius = altura mínima / 2 (48, casando com o botão de enviar)
    borderRadius: 24,
    justifyContent: 'center',
  },
  input: {
    // Mesma altura do botão de enviar (Buttons.heightMd)
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: Spacing.lg,
    paddingTop: 13,
    paddingBottom: 13,
    fontSize: FontSize.md,
  },
  charCounter: {
    fontSize: FontSize.xs,
    textAlign: 'right',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
});
