'use client';

import { FinanceDialogProvider } from '@/contexts/FinanceDialogContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { AgentProvider } from '@/contexts/AgentContext';
import { GlobalSearchProvider } from '@/contexts/GlobalSearchContext';
import { AlgoliaProvider } from '@/providers/AlgoliaProvider';
import { FinanceDialogsContainer } from '@/components/organisms/finance/FinanceDialogsContainer';
import { AgentChatSheet } from '@/components/organisms/agent';
import { AgentChatButton } from '@/components/molecules/AgentChatButton';
import { GlobalSearchCommand } from '@/components/organisms/search';

export default function FinancasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FinanceDialogProvider>
      <NotificationProvider>
        <AgentProvider>
          <GlobalSearchProvider>
            <AlgoliaProvider>
              {children}
              <FinanceDialogsContainer />
              <AgentChatButton />
              <AgentChatSheet />
              <GlobalSearchCommand />
            </AlgoliaProvider>
          </GlobalSearchProvider>
        </AgentProvider>
      </NotificationProvider>
    </FinanceDialogProvider>
  );
}
