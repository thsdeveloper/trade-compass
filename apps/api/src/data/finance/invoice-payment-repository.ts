import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceInvoicePayment,
  PayInvoiceDTO,
  InvoicePaymentResult,
  InvoicePaymentWithDetails,
  FinanceAccount,
  FinanceCreditCard,
} from '../../domain/finance-types.js';
import { getAccountById, updateAccountBalance } from './account-repository.js';
import {
  getCreditCardById,
  updateCreditCardAvailableLimit,
} from './credit-card-repository.js';
import { getTransactionsByCreditCardAndPeriod } from './transaction-repository.js';

const TABLE = 'finance_invoice_payments';
const TRANSACTIONS_TABLE = 'finance_transactions';

export async function getInvoicePaymentsByCard(
  creditCardId: string,
  userId: string,
  accessToken: string
): Promise<InvoicePaymentWithDetails[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select(`
      *,
      account:finance_accounts(*),
      credit_card:finance_credit_cards(*)
    `)
    .eq('credit_card_id', creditCardId)
    .eq('user_id', userId)
    .order('payment_date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar pagamentos de fatura: ${error.message}`);
  }

  return data || [];
}

export async function getInvoicePaymentsByMonth(
  creditCardId: string,
  invoiceMonth: string,
  userId: string,
  accessToken: string
): Promise<FinanceInvoicePayment[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('credit_card_id', creditCardId)
    .eq('invoice_month', invoiceMonth)
    .eq('user_id', userId)
    .order('payment_date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar pagamentos de fatura por mes: ${error.message}`);
  }

  return data || [];
}

export async function getInvoicePaymentById(
  paymentId: string,
  userId: string,
  accessToken: string
): Promise<FinanceInvoicePayment | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', paymentId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar pagamento de fatura: ${error.message}`);
  }

  return data;
}

/**
 * Registra o "saldo fatura anterior e pagamentos" de uma fatura importada
 * como ajuste. `adjustment` é o valor líquido da linha na fatura: negativo
 * quando é crédito (abate o valor a pagar), positivo quando é saldo devedor
 * carregado. Armazenado como pagamento AJUSTE com amount = -adjustment, o
 * restante da fatura fica: total das transações - pagamentos - ajuste.
 * Idempotente por (cartão, mês): reimportar a mesma fatura atualiza o ajuste
 * em vez de duplicá-lo.
 */
export async function registerInvoiceAdjustment(
  userId: string,
  creditCardId: string,
  invoiceMonth: string,
  adjustment: number,
  accessToken: string
): Promise<FinanceInvoicePayment> {
  const client = createUserClient(accessToken);
  const amount = Math.round(-adjustment * 100) / 100;
  const notes = 'Saldo da fatura anterior e pagamentos (importado da fatura)';
  const paymentDate = new Date().toISOString().split('T')[0];

  const existing = (
    await getInvoicePaymentsByMonth(creditCardId, invoiceMonth, userId, accessToken)
  ).find((p) => p.payment_type === 'AJUSTE');

  const previousAmount = existing ? Number(existing.amount) : 0;

  const { data, error } = existing
    ? await client
        .from(TABLE)
        .update({ amount, payment_date: paymentDate, notes })
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single()
    : await client
        .from(TABLE)
        .insert({
          user_id: userId,
          credit_card_id: creditCardId,
          account_id: null,
          invoice_month: invoiceMonth,
          amount,
          payment_date: paymentDate,
          payment_type: 'AJUSTE',
          notes,
        })
        .select()
        .single();

  if (error) {
    throw new Error(`Erro ao registrar ajuste de fatura: ${error.message}`);
  }

  // Crédito devolve limite; saldo devedor consome (delta só da diferença
  // quando o ajuste é atualizado). Clamp em [0, total_limit] no repositório.
  const limitDelta = amount - previousAmount;
  if (limitDelta !== 0) {
    await updateCreditCardAvailableLimit(creditCardId, userId, limitDelta, accessToken);
  }

  return data;
}

export async function payInvoice(
  userId: string,
  creditCardId: string,
  payment: PayInvoiceDTO,
  accessToken: string
): Promise<InvoicePaymentResult> {
  const client = createUserClient(accessToken);

  // 1. Buscar cartao e conta para validacao
  const card = await getCreditCardById(creditCardId, userId, accessToken);
  if (!card) {
    throw new Error('Cartao nao encontrado');
  }

  const account = await getAccountById(payment.account_id, userId, accessToken);
  if (!account) {
    throw new Error('Conta nao encontrada');
  }

  const paymentDate = payment.payment_date || new Date().toISOString().split('T')[0];

  // 2. Criar registro de pagamento de fatura
  const { data: invoicePayment, error: paymentError } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      credit_card_id: creditCardId,
      account_id: payment.account_id,
      invoice_month: payment.invoice_month,
      amount: payment.amount,
      payment_date: paymentDate,
      payment_type: payment.payment_type,
      notes: payment.notes || null,
    })
    .select()
    .single();

  if (paymentError) {
    throw new Error(`Erro ao registrar pagamento de fatura: ${paymentError.message}`);
  }

  // 3. Debitar saldo da conta
  const newAccountBalance = account.current_balance - payment.amount;
  await updateAccountBalance(payment.account_id, userId, newAccountBalance, accessToken);

  // 4. Restaurar limite disponivel do cartao
  const updatedCard = await updateCreditCardAvailableLimit(
    creditCardId,
    userId,
    payment.amount,
    accessToken
  );

  // 5. Se pagamento TOTAL, marcar transacoes da fatura como PAGAS
  if (payment.payment_type === 'TOTAL') {
    // Calcular periodo da fatura
    const [year, month] = payment.invoice_month.split('-').map(Number);
    const closingDay = card.closing_day;

    // Data de fechamento do mes anterior
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(closingDay + 1).padStart(2, '0')}`;

    // Data de fechamento do mes atual
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(closingDay).padStart(2, '0')}`;

    // Buscar transacoes da fatura
    const invoiceTransactions = await getTransactionsByCreditCardAndPeriod(
      creditCardId,
      userId,
      startDate,
      endDate,
      accessToken
    );

    // Marcar como PAGAS
    for (const tx of invoiceTransactions) {
      if (tx.status === 'PENDENTE') {
        await client
          .from(TRANSACTIONS_TABLE)
          .update({
            status: 'PAGO',
            paid_amount: tx.amount,
            payment_date: paymentDate,
          })
          .eq('id', tx.id)
          .eq('user_id', userId);
      }
    }
  }

  // Buscar conta atualizada
  const updatedAccount = await getAccountById(payment.account_id, userId, accessToken);

  return {
    invoice_payment: invoicePayment,
    updated_card: updatedCard,
    updated_account: updatedAccount!,
  };
}
