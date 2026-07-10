'use client';

import { Button } from '@/components/ui/button';
import { useAgent } from '@/contexts/AgentContext';
import { Sparkles } from 'lucide-react';

export function AgentChatButton() {
  const { openChat, isOpen } = useAgent();

  if (isOpen) {
    return null;
  }

  return (
    <Button
      onClick={openChat}
      className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
      size="icon-lg"
      title="Agent Flow IA"
    >
      <Sparkles className="h-6 w-6" />
    </Button>
  );
}
