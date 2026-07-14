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
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAgent } from '@/contexts/AgentContext';
import { MAX_MESSAGE_LENGTH } from '@/lib/agent-api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ChatMessage } from '@/types/agent';

const AI_GRADIENT = ['#7C3AED', '#A855F7', '#D946EF'] as const;

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
        <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color="#A855F7" />
        </View>
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
      <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.surface }]}>
        <Text style={[styles.bubbleText, { color: colors.text }]}>{message.content}</Text>
      </View>
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

  const { messages, isLoading, error, sendMessage, clearMessages } = useAgent();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
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
            <TouchableOpacity
              onPress={clearMessages}
              style={styles.headerButton}
              accessibilityLabel="Limpar conversa"
            >
              <IconSymbol name="trash" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerButton}
            accessibilityLabel="Fechar chat"
          >
            <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

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
                  style={({ pressed }) => [
                    styles.suggestionChip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.suggestionText, { color: colors.text }]}>
                    {suggestion}
                  </Text>
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
          />
        )}

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
            <IconSymbol name="exclamationmark.circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              paddingBottom: Math.max(insets.bottom, Spacing.md),
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surface, color: colors.text },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder="Pergunte sobre suas finanças..."
            placeholderTextColor={colors.textSecondary}
            maxLength={MAX_MESSAGE_LENGTH}
            multiline
            editable={!isLoading}
            onSubmitEditing={handleSend}
            submitBehavior="submit"
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={!canSend}
            accessibilityLabel="Enviar mensagem"
            style={({ pressed }) => [pressed && canSend && { opacity: 0.8 }]}
          >
            <LinearGradient
              colors={AI_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol name="arrow.up" size={20} color="#FFFFFF" />
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
    padding: Spacing.sm,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
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
    borderWidth: 1,
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
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    fontSize: FontSize.md,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
