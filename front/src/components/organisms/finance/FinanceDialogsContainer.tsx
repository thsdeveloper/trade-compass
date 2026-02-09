'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinanceDialogs } from '@/contexts/FinanceDialogContext';
import { financeApi } from '@/lib/finance-api';
import { toast } from '@/lib/toast';

// Dialogs
import { TransactionDialog } from './TransactionDialog';
import { DebtDialog } from './DebtDialog';
import { AccountDialog } from './AccountDialog';
import { CreditCardDialog } from './CreditCardDialog';
import { CategoryDialog } from './CategoryDialog';
import { GoalDialog } from './GoalDialog';

// Types
import type {
  FinanceCategory,
  FinanceTag,
  AccountWithBank,
  FinanceCreditCard,
  Bank,
  TransactionFormData,
  RecurrenceFormData,
  DebtFormData,
  AccountFormData,
  CreditCardFormData,
  CategoryFormData,
  TagFormData,
  TransferFormData,
  GoalSelectItem,
  GoalFormData,
} from '@/types/finance';

export function FinanceDialogsContainer() {
  const { session } = useAuth();
  const { dialogs, closeDialog, notifyDataChanged } = useFinanceDialogs();

  // Data states
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [tags, setTags] = useState<FinanceTag[]>([]);
  const [accounts, setAccounts] = useState<AccountWithBank[]>([]);
  const [creditCards, setCreditCards] = useState<FinanceCreditCard[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [popularBanks, setPopularBanks] = useState<Bank[]>([]);
  const [goals, setGoals] = useState<GoalSelectItem[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data when any dialog opens
  const loadData = useCallback(async () => {
    if (!session?.access_token) return;

    try {
      const [categoriesData, tagsData, accountsData, cardsData, popularBanksData, goalsData] =
        await Promise.all([
          financeApi.getCategories(session.access_token),
          financeApi.getTags(session.access_token),
          financeApi.getAccounts(session.access_token),
          financeApi.getCreditCards(session.access_token),
          financeApi.getPopularBanks(session.access_token),
          financeApi.getGoalsForSelect(session.access_token),
        ]);

      setCategories(categoriesData);
      setTags(tagsData);
      setAccounts(accountsData);
      setCreditCards(cardsData);
      setPopularBanks(popularBanksData);
      setBanks(popularBanksData);
      setGoals(goalsData);
      setDataLoaded(true);
    } catch (err) {
      console.error('Error loading finance data:', err);
    }
  }, [session?.access_token]);

  // Load data when a dialog opens
  useEffect(() => {
    const anyDialogOpen = Object.values(dialogs).some(Boolean);
    if (anyDialogOpen && !dataLoaded) {
      loadData();
    }
  }, [dialogs, dataLoaded, loadData]);

  // Reload data when notified of changes
  useEffect(() => {
    if (dataLoaded) {
      loadData();
    }
  }, []);

  // Bank search
  const handleSearchBanks = useCallback(
    async (query: string): Promise<Bank[]> => {
      if (!session?.access_token) return [];
      return financeApi.getBanks(session.access_token, query);
    },
    [session?.access_token]
  );

  // Transaction handlers
  const handleSaveTransaction = async (data: TransactionFormData) => {
    if (!session?.access_token) return;

    if (data.is_installment && data.total_installments && data.total_installments > 1) {
      await financeApi.createInstallmentTransaction(
        {
          category_id: data.category_id,
          account_id: data.account_id,
          credit_card_id: data.credit_card_id,
          type: data.type,
          description: data.description,
          total_amount: data.amount,
          total_installments: data.total_installments,
          first_due_date: data.due_date,
          notes: data.notes,
          tag_ids: data.tag_ids,
        },
        session.access_token
      );
    } else {
      const created = await financeApi.createTransaction(
        {
          category_id: data.category_id,
          account_id: data.account_id,
          credit_card_id: data.credit_card_id,
          type: data.type,
          description: data.description,
          amount: data.amount,
          due_date: data.due_date,
          notes: data.notes,
          tag_ids: data.tag_ids,
        },
        session.access_token
      );

      if (data.execute_immediately) {
        await financeApi.payTransaction(
          created.id,
          { paid_amount: data.amount, payment_date: data.due_date },
          session.access_token
        );
      }
    }

    toast.success(
      data.execute_immediately
        ? 'Transacao criada e efetivada com sucesso'
        : 'Transacao criada com sucesso'
    );
    closeDialog('transaction');
    notifyDataChanged();
    loadData();
  };

  const handleCreateTransfer = async (data: TransferFormData) => {
    if (!session?.access_token) return;
    await financeApi.createTransfer(data, session.access_token);
    toast.success('Transferencia criada com sucesso');
    closeDialog('transaction');
    notifyDataChanged();
    loadData();
  };

  const handleCreateRecurrence = async (
    data: RecurrenceFormData,
    generateCount?: number
  ) => {
    if (!session?.access_token) return;

    const created = await financeApi.createRecurrence(data, session.access_token);
    if (generateCount && generateCount > 1) {
      await financeApi.generateRecurrenceOccurrences(
        created.id,
        generateCount - 1,
        session.access_token
      );
    }

    toast.success('Recorrencia criada com sucesso');
    closeDialog('transaction');
    notifyDataChanged();
    loadData();
  };

  const handleCreateCategory = async (data: CategoryFormData): Promise<FinanceCategory> => {
    if (!session?.access_token) throw new Error('Not authenticated');
    const created = await financeApi.createCategory(data, session.access_token);
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const handleCreateTag = async (data: TagFormData): Promise<FinanceTag> => {
    if (!session?.access_token) throw new Error('Not authenticated');
    const created = await financeApi.createTag(data, session.access_token);
    setTags((prev) => [...prev, created]);
    return created;
  };

  // Debt handlers
  const handleSaveDebt = async (data: DebtFormData) => {
    if (!session?.access_token) return;
    await financeApi.createDebt(data, session.access_token);
    toast.success('Divida criada com sucesso');
    closeDialog('debt');
    notifyDataChanged();
    loadData();
  };

  // Account handlers
  const handleSaveAccount = async (data: AccountFormData) => {
    if (!session?.access_token) return;
    await financeApi.createAccount(data, session.access_token);
    toast.success('Conta criada com sucesso');
    closeDialog('account');
    notifyDataChanged();
    loadData();
  };

  // Credit Card handlers
  const handleSaveCreditCard = async (data: CreditCardFormData) => {
    if (!session?.access_token) return;
    await financeApi.createCreditCard(data, session.access_token);
    toast.success('Cartao criado com sucesso');
    closeDialog('creditCard');
    notifyDataChanged();
    loadData();
  };

  // Category handlers
  const handleSaveCategory = async (data: CategoryFormData) => {
    if (!session?.access_token) return;
    await financeApi.createCategory(data, session.access_token);
    toast.success('Categoria criada com sucesso');
    closeDialog('category');
    notifyDataChanged();
    loadData();
  };

  // Goal handlers
  const handleSaveGoal = async (data: GoalFormData) => {
    if (!session?.access_token) return;
    await financeApi.createGoal(data, session.access_token);
    toast.success('Objetivo criado com sucesso');
    closeDialog('goal');
    notifyDataChanged();
    loadData();
  };

  return (
    <>
      {/* Transaction Dialog */}
      <TransactionDialog
        open={dialogs.transaction}
        onOpenChange={(open) => !open && closeDialog('transaction')}
        onSave={handleSaveTransaction}
        onCreateCategory={handleCreateCategory}
        onCreateTag={handleCreateTag}
        onCreateRecurrence={handleCreateRecurrence}
        onCreateTransfer={handleCreateTransfer}
        categories={categories}
        tags={tags}
        accounts={accounts}
        creditCards={creditCards}
        goals={goals}
      />

      {/* Debt Dialog */}
      <DebtDialog
        open={dialogs.debt}
        onOpenChange={(open) => !open && closeDialog('debt')}
        onSave={handleSaveDebt}
      />

      {/* Account Dialog */}
      <AccountDialog
        open={dialogs.account}
        onOpenChange={(open) => !open && closeDialog('account')}
        onSave={handleSaveAccount}
        onSearchBanks={handleSearchBanks}
        banks={banks}
        popularBanks={popularBanks}
      />

      {/* Credit Card Dialog */}
      <CreditCardDialog
        open={dialogs.creditCard}
        onOpenChange={(open) => !open && closeDialog('creditCard')}
        onSave={handleSaveCreditCard}
      />

      {/* Category Dialog */}
      <CategoryDialog
        open={dialogs.category}
        onOpenChange={(open) => !open && closeDialog('category')}
        onSave={handleSaveCategory}
      />

      {/* Goal Dialog */}
      <GoalDialog
        open={dialogs.goal}
        onOpenChange={(open) => !open && closeDialog('goal')}
        onSave={handleSaveGoal}
        accounts={accounts}
      />
    </>
  );
}
