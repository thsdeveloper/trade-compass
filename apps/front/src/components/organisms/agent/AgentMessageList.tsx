'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types/agent';
import { AgentMessageBubble } from './AgentMessageBubble';
import { Bot } from 'lucide-react';

interface AgentMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export function AgentMessageList({ messages, isLoading }: AgentMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Assistente Financeiro</h3>
          <p className="mt-1 text-sm text-slate-500">
            Pergunte sobre suas financas e receba respostas baseadas nos seus dados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto"
    >
      <div className="flex flex-col">
        {messages.map((message) => (
          <AgentMessageBubble key={message.id} message={message} />
        ))}
        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="flex gap-3 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2">
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
