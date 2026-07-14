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
import { AGENTS, type AgentId } from '@/types/agent';
import { AgentMessageList } from './AgentMessageList';
import { AgentChatInput } from './AgentChatInput';
import { AgentSuggestions } from './AgentSuggestions';
import { Trash2, AlertCircle, Wallet, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';

const AGENT_ICONS: Record<AgentId, typeof Wallet> = {
  financeiro: Wallet,
  investimentos: LineChart,
};

export function AgentChatSheet() {
  const {
    isOpen,
    closeChat,
    activeAgentId,
    setActiveAgent,
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  } = useAgent();

  const activeAgent = AGENTS[activeAgentId];

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
              <SheetTitle className="text-base">{activeAgent.label}</SheetTitle>
              <SheetDescription className="text-xs">
                {activeAgent.description}
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

          {/* Seletor de agente — a conversa de cada um é preservada */}
          <div className="mt-2 flex gap-1.5">
            {Object.values(AGENTS).map((agent) => {
              const Icon = AGENT_ICONS[agent.id];
              const isActive = agent.id === activeAgentId;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setActiveAgent(agent.id)}
                  disabled={isLoading}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                    isActive
                      ? 'border-fuchsia-600 bg-fuchsia-50 text-fuchsia-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700',
                    isLoading && 'opacity-60'
                  )}
                  aria-pressed={isActive}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {agent.label}
                </button>
              );
            })}
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
            suggestions={activeAgent.suggestions}
            onSelect={handleSuggestionSelect}
            disabled={isLoading}
          />
        )}

        <AgentChatInput onSend={sendMessage} disabled={isLoading} />
      </SheetContent>
    </Sheet>
  );
}
