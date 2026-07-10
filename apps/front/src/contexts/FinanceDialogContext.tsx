'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

export type FinanceDialogType =
  | 'transaction'
  | 'debt'
  | 'account'
  | 'creditCard'
  | 'category'
  | 'goal';

interface FinanceDialogContextType {
  /** Estado de cada dialog */
  dialogs: Record<FinanceDialogType, boolean>;
  /** Abre um dialog especifico */
  openDialog: (type: FinanceDialogType) => void;
  /** Fecha um dialog especifico */
  closeDialog: (type: FinanceDialogType) => void;
  /** Versao dos dados (incrementa a cada mudanca) */
  dataVersion: number;
  /** Notifica que dados mudaram */
  notifyDataChanged: () => void;
}

const FinanceDialogContext = createContext<FinanceDialogContextType | undefined>(undefined);

const initialDialogs: Record<FinanceDialogType, boolean> = {
  transaction: false,
  debt: false,
  account: false,
  creditCard: false,
  category: false,
  goal: false,
};

export function FinanceDialogProvider({ children }: { children: ReactNode }) {
  const [dialogs, setDialogs] = useState<Record<FinanceDialogType, boolean>>(initialDialogs);
  const [dataVersion, setDataVersion] = useState(0);

  const openDialog = useCallback((type: FinanceDialogType) => {
    setDialogs((prev) => ({ ...prev, [type]: true }));
  }, []);

  const closeDialog = useCallback((type: FinanceDialogType) => {
    setDialogs((prev) => ({ ...prev, [type]: false }));
  }, []);

  const notifyDataChanged = useCallback(() => {
    setDataVersion((prev) => prev + 1);
  }, []);

  const value = useMemo(
    () => ({
      dialogs,
      openDialog,
      closeDialog,
      dataVersion,
      notifyDataChanged,
    }),
    [dialogs, openDialog, closeDialog, dataVersion, notifyDataChanged]
  );

  return (
    <FinanceDialogContext.Provider value={value}>
      {children}
    </FinanceDialogContext.Provider>
  );
}

export function useFinanceDialogs() {
  const context = useContext(FinanceDialogContext);
  if (context === undefined) {
    throw new Error('useFinanceDialogs must be used within a FinanceDialogProvider');
  }
  return context;
}
