'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAgent } from '@/contexts/AgentContext';
import { AgentMessageList } from './AgentMessageList';
import { AgentChatInput } from './AgentChatInput';
import { AgentSuggestions } from './AgentSuggestions';
import { Trash2, AlertCircle } from 'lucide-react';

export function AgentChatSheet() {
  const {
    isOpen,
    closeChat,
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  } = useAgent();

  const handleSuggestionSelect = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeChat()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col p-0 sm:max-w-md"
        showCloseButton={true}
      >
        <SheetHeader className="border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between pr-8">
            <div>
              <SheetTitle className="text-base">Agent Flow IA</SheetTitle>
              <SheetDescription className="text-xs">
                Assistente financeiro inteligente
              </SheetDescription>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={clearMessages}
                title="Limpar conversa"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </SheetHeader>

        {error && (
          <div className="mx-4 mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <AgentMessageList messages={messages} isLoading={isLoading} />

        {messages.length === 0 && (
          <AgentSuggestions
            onSelect={handleSuggestionSelect}
            disabled={isLoading}
          />
        )}

        <AgentChatInput onSend={sendMessage} disabled={isLoading} />
      </SheetContent>
    </Sheet>
  );
}
