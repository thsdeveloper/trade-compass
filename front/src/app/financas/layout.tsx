'use client';

import { FinanceDialogProvider } from '@/contexts/FinanceDialogContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { FinanceDialogsContainer } from '@/components/organisms/finance/FinanceDialogsContainer';

export default function FinancasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FinanceDialogProvider>
      <NotificationProvider>
        {children}
        <FinanceDialogsContainer />
      </NotificationProvider>
    </FinanceDialogProvider>
  );
}
