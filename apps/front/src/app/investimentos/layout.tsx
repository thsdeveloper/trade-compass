'use client';

import { FinanceDialogProvider } from '@/contexts/FinanceDialogContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export default function InvestimentosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FinanceDialogProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </FinanceDialogProvider>
  );
}
