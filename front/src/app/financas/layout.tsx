'use client';

import { FinanceDialogProvider } from '@/contexts/FinanceDialogContext';
import { FinanceDialogsContainer } from '@/components/organisms/finance/FinanceDialogsContainer';

export default function FinancasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <FinanceDialogProvider>
      {children}
      <FinanceDialogsContainer />
    </FinanceDialogProvider>
  );
}
