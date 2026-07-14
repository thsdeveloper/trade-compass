'use client';

import { AIButton } from '@/components/ui/ai-button';
import { useAgent } from '@/contexts/AgentContext';

export function AgentChatButton() {
  const { openChat, isOpen } = useAgent();

  if (isOpen) {
    return null;
  }

  return (
    <AIButton
      onClick={openChat}
      size="icon-lg"
      className="fixed right-6 bottom-6 z-50 shadow-lg shadow-fuchsia-600/30"
      title="Norte & Polaris — assistentes IA"
      aria-label="Abrir o assistente de IA"
    />
  );
}
