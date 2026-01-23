import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceMortgage,
  MortgageWithBank,
  MortgageWithProgress,
  MortgageInstallment,
  MortgageExtraPayment,
  MortgageDocument,
  CreateMortgageDTO,
  UpdateMortgageDTO,
  PayInstallmentDTO,
  CreateExtraPaymentDTO,
  CreateMortgageDocumentDTO,
  MortgageFilters,
  MortgageInstallmentFilters,
  MortgageSummary,
  ExtraPaymentSimulation,
  EarlyPayoffSimulation,
  AnnualMortgageReport,
  CalculatedInstallment,
  AmortizationSimulationRequest,
  AmortizationSimulationResponse,
} from '../../domain/finance-types.js';
import {
  calculateMortgageInstallments,
  simulateExtraPayment,
  simulateEarlyPayoff,
  simulateMultipleExtraPayments,
} from '../../services/mortgage-calculator.js';

const MORTGAGES_TABLE = 'finance_mortgages';
const INSTALLMENTS_TABLE = 'finance_mortgage_installments';
const EXTRA_PAYMENTS_TABLE = 'finance_mortgage_extra_payments';
const DOCUMENTS_TABLE = 'finance_mortgage_documents';

// ==================== MORTGAGE CRUD ====================

export async function getMortgagesByUser(
  userId: string,
  filters: MortgageFilters,
  accessToken: string
): Promise<MortgageWithBank[]> {
  const client = createUserClient(accessToken);

  let query = client
    .from(MORTGAGES_TABLE)
    .select(
      `
      *,
      institution_bank:banks!institution_bank_id(*)
    `
    )
    .eq('user_id', userId)
    .neq('status', 'CANCELADO');

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  query = query.order('created_at', { ascending: false });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar financiamentos: ${error.message}`);
  }

  return data || [];
}

export async function getMortgageById(
  mortgageId: string,
  userId: string,
  accessToken: string
): Promise<MortgageWithBank | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(MORTGAGES_TABLE)
    .select(
      `
      *,
      institution_bank:banks!institution_bank_id(*)
    `
    )
    .eq('id', mortgageId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar financiamento: ${error.message}`);
  }

  return data;
}

export async function getMortgageWithProgress(
  mortgageId: string,
  userId: string,
  accessToken: string
): Promise<MortgageWithProgress | null> {
  const mortgage = await getMortgageById(mortgageId, userId, accessToken);
  if (!mortgage) return null;

  const client = createUserClient(accessToken);

  // Buscar parcelas pagas
  const { data: paidInstallments, error: instError } = await client
    .from(INSTALLMENTS_TABLE)
    .select('amortization_amount, interest_amount, total_amount')
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId)
    .eq('status', 'PAGA');

  if (instError) {
    throw new Error(`Erro ao buscar parcelas: ${instError.message}`);
  }

  // Buscar próxima parcela pendente
  const { data: nextInstallment, error: nextError } = await client
    .from(INSTALLMENTS_TABLE)
    .select('*')
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId)
    .eq('status', 'PENDENTE')
    .order('installment_number', { ascending: true })
    .limit(1)
    .single();

  if (nextError && nextError.code !== 'PGRST116') {
    throw new Error(`Erro ao buscar próxima parcela: ${nextError.message}`);
  }

  const totalPaid = paidInstallments?.reduce((sum, inst) => sum + inst.total_amount, 0) || 0;
  const totalInterestPaid = paidInstallments?.reduce((sum, inst) => sum + inst.interest_amount, 0) || 0;
  const totalAmortizationPaid =
    paidInstallments?.reduce((sum, inst) => sum + inst.amortization_amount, 0) || 0;
  const paidCount = paidInstallments?.length || 0;
  const remainingInstallments = mortgage.total_installments - paidCount;
  const progressPercentage = (paidCount / mortgage.total_installments) * 100;

  return {
    ...mortgage,
    remaining_installments: remainingInstallments,
    progress_percentage: Math.round(progressPercentage * 100) / 100,
    next_installment: nextInstallment || null,
    total_paid: totalPaid,
    total_interest_paid: totalInterestPaid,
    total_amortization_paid: totalAmortizationPaid,
  };
}

export async function createMortgage(
  userId: string,
  mortgage: CreateMortgageDTO,
  accessToken: string
): Promise<FinanceMortgage> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(MORTGAGES_TABLE)
    .insert({
      user_id: userId,
      contract_number: mortgage.contract_number,
      institution_name: mortgage.institution_name,
      institution_bank_id: mortgage.institution_bank_id || null,
      modality: mortgage.modality || 'SFH',
      amortization_system: mortgage.amortization_system || 'SAC',
      property_value: mortgage.property_value,
      financed_amount: mortgage.financed_amount,
      down_payment: mortgage.down_payment || 0,
      current_balance: mortgage.financed_amount,
      base_annual_rate: mortgage.base_annual_rate,
      reduced_annual_rate: mortgage.reduced_annual_rate || null,
      rate_index: mortgage.rate_index || 'TR',
      is_reduced_rate_active: mortgage.is_reduced_rate_active || false,
      total_installments: mortgage.total_installments,
      paid_installments: 0,
      contract_start_date: mortgage.contract_start_date,
      first_installment_date: mortgage.first_installment_date,
      mip_rate: mortgage.mip_rate || null,
      dfi_rate: mortgage.dfi_rate || null,
      admin_fee: mortgage.admin_fee || 25,
      status: 'ATIVO',
      alert_days_before: mortgage.alert_days_before || 5,
      notes: mortgage.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar financiamento: ${error.message}`);
  }

  return data;
}

export async function updateMortgage(
  mortgageId: string,
  userId: string,
  updates: UpdateMortgageDTO,
  accessToken: string
): Promise<FinanceMortgage> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(MORTGAGES_TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mortgageId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar financiamento: ${error.message}`);
  }

  if (!data) {
    throw new Error('Financiamento não encontrado');
  }

  return data;
}

export async function deleteMortgage(mortgageId: string, userId: string, accessToken: string): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(MORTGAGES_TABLE)
    .update({ status: 'CANCELADO', updated_at: new Date().toISOString() })
    .eq('id', mortgageId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao cancelar financiamento: ${error.message}`);
  }
}

// ==================== INSTALLMENTS ====================

export async function getInstallmentsByMortgage(
  mortgageId: string,
  userId: string,
  filters: MortgageInstallmentFilters,
  accessToken: string
): Promise<MortgageInstallment[]> {
  const client = createUserClient(accessToken);

  let query = client
    .from(INSTALLMENTS_TABLE)
    .select('*')
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.start_date) {
    query = query.gte('due_date', filters.start_date);
  }
  if (filters.end_date) {
    query = query.lte('due_date', filters.end_date);
  }

  query = query.order('installment_number', { ascending: true });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 500) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar parcelas: ${error.message}`);
  }

  return data || [];
}

export async function generateInstallments(
  mortgageId: string,
  userId: string,
  accessToken: string
): Promise<MortgageInstallment[]> {
  const client = createUserClient(accessToken);

  // Buscar financiamento
  const mortgage = await getMortgageById(mortgageId, userId, accessToken);
  if (!mortgage) {
    throw new Error('Financiamento não encontrado');
  }

  // Verificar se já existem parcelas
  const { count } = await client
    .from(INSTALLMENTS_TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId);

  if (count && count > 0) {
    throw new Error('Parcelas já foram geradas para este financiamento');
  }

  // Calcular parcelas
  const annualRate = mortgage.is_reduced_rate_active
    ? (mortgage.reduced_annual_rate ?? mortgage.base_annual_rate)
    : mortgage.base_annual_rate;

  const projection = calculateMortgageInstallments({
    financedAmount: mortgage.financed_amount,
    totalInstallments: mortgage.total_installments,
    annualRate,
    rateIndex: mortgage.rate_index,
    amortizationSystem: mortgage.amortization_system,
    firstInstallmentDate: mortgage.first_installment_date,
    propertyValue: mortgage.property_value,
    mipRate: mortgage.mip_rate || 0,
    dfiRate: mortgage.dfi_rate || 0,
    adminFee: mortgage.admin_fee || 0,
  });

  // Inserir parcelas
  const installmentsToInsert = projection.installments.map((inst: CalculatedInstallment) => ({
    user_id: userId,
    mortgage_id: mortgageId,
    installment_number: inst.installment_number,
    due_date: inst.due_date,
    amortization_amount: inst.amortization_amount,
    interest_amount: inst.interest_amount,
    mip_insurance: inst.mip_insurance,
    dfi_insurance: inst.dfi_insurance,
    admin_fee: inst.admin_fee,
    tr_adjustment: inst.tr_adjustment,
    total_amount: inst.total_amount,
    balance_before: inst.balance_before,
    balance_after: inst.balance_after,
    status: 'PENDENTE',
  }));

  const { data, error } = await client.from(INSTALLMENTS_TABLE).insert(installmentsToInsert).select();

  if (error) {
    throw new Error(`Erro ao gerar parcelas: ${error.message}`);
  }

  return data || [];
}

export async function payInstallment(
  mortgageId: string,
  installmentNumber: number,
  userId: string,
  payment: PayInstallmentDTO,
  accessToken: string
): Promise<MortgageInstallment> {
  const client = createUserClient(accessToken);

  // Buscar parcela
  const { data: installment, error: fetchError } = await client
    .from(INSTALLMENTS_TABLE)
    .select('*')
    .eq('mortgage_id', mortgageId)
    .eq('installment_number', installmentNumber)
    .eq('user_id', userId)
    .single();

  if (fetchError || !installment) {
    throw new Error('Parcela não encontrada');
  }

  const paidAmount = payment.paid_amount ?? installment.total_amount;
  const paymentDate = payment.payment_date ?? new Date().toISOString().split('T')[0];
  const isPaid = paidAmount >= installment.total_amount;

  // Atualizar parcela
  const { data, error } = await client
    .from(INSTALLMENTS_TABLE)
    .update({
      status: isPaid ? 'PAGA' : 'PARCIAL',
      paid_amount: paidAmount,
      payment_date: paymentDate,
      notes: payment.notes || installment.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', installment.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao pagar parcela: ${error.message}`);
  }

  // Atualizar saldo e contagem no financiamento
  if (isPaid) {
    await client
      .from(MORTGAGES_TABLE)
      .update({
        current_balance: installment.balance_after,
        paid_installments: installmentNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mortgageId)
      .eq('user_id', userId);
  }

  return data;
}

// ==================== EXTRA PAYMENTS ====================

export async function getExtraPaymentsByMortgage(
  mortgageId: string,
  userId: string,
  accessToken: string
): Promise<MortgageExtraPayment[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(EXTRA_PAYMENTS_TABLE)
    .select('*')
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId)
    .order('payment_date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar amortizações: ${error.message}`);
  }

  return data || [];
}

export async function createExtraPayment(
  mortgageId: string,
  userId: string,
  payment: CreateExtraPaymentDTO,
  accessToken: string
): Promise<MortgageExtraPayment> {
  const client = createUserClient(accessToken);

  // Buscar financiamento
  const mortgage = await getMortgageWithProgress(mortgageId, userId, accessToken);
  if (!mortgage) {
    throw new Error('Financiamento não encontrado');
  }

  // Calcular simulação
  const annualRate = mortgage.is_reduced_rate_active
    ? (mortgage.reduced_annual_rate ?? mortgage.base_annual_rate)
    : mortgage.base_annual_rate;

  const simulation = simulateExtraPayment(
    mortgage.current_balance || mortgage.financed_amount,
    mortgage.remaining_installments,
    mortgage.next_installment?.total_amount || 0,
    payment.amount,
    payment.payment_type,
    annualRate,
    mortgage.property_value,
    mortgage.mip_rate || 0,
    mortgage.dfi_rate || 0,
    mortgage.admin_fee || 0,
    mortgage.amortization_system
  );

  // Inserir amortização
  const { data, error } = await client
    .from(EXTRA_PAYMENTS_TABLE)
    .insert({
      user_id: userId,
      mortgage_id: mortgageId,
      payment_date: payment.payment_date,
      amount: payment.amount,
      payment_type: payment.payment_type,
      balance_before: simulation.current_balance,
      balance_after: simulation.new_balance,
      remaining_installments_before: simulation.current_remaining_installments,
      remaining_installments_after: simulation.new_remaining_installments,
      installment_value_before: simulation.current_installment_value,
      installment_value_after: simulation.new_installment_value,
      interest_saved: simulation.interest_saved,
      months_reduced: simulation.months_reduced,
      notes: payment.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao registrar amortização: ${error.message}`);
  }

  // Atualizar saldo do financiamento
  await client
    .from(MORTGAGES_TABLE)
    .update({
      current_balance: simulation.new_balance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mortgageId)
    .eq('user_id', userId);

  // Regenerar parcelas futuras se necessário
  if (payment.payment_type === 'REDUCE_TERM') {
    // Marcar parcelas excedentes como canceladas ou recalcular
    // Esta é uma simplificação - em produção seria mais complexo
  }

  return data;
}

export async function simulateExtraPaymentForMortgage(
  mortgageId: string,
  userId: string,
  amount: number,
  paymentType: 'REDUCE_TERM' | 'REDUCE_INSTALLMENT',
  accessToken: string
): Promise<ExtraPaymentSimulation> {
  const mortgage = await getMortgageWithProgress(mortgageId, userId, accessToken);
  if (!mortgage) {
    throw new Error('Financiamento não encontrado');
  }

  const annualRate = mortgage.is_reduced_rate_active
    ? (mortgage.reduced_annual_rate ?? mortgage.base_annual_rate)
    : mortgage.base_annual_rate;

  return simulateExtraPayment(
    mortgage.current_balance || mortgage.financed_amount,
    mortgage.remaining_installments,
    mortgage.next_installment?.total_amount || 0,
    amount,
    paymentType,
    annualRate,
    mortgage.property_value,
    mortgage.mip_rate || 0,
    mortgage.dfi_rate || 0,
    mortgage.admin_fee || 0,
    mortgage.amortization_system
  );
}

export async function simulateEarlyPayoffForMortgage(
  mortgageId: string,
  userId: string,
  accessToken: string
): Promise<EarlyPayoffSimulation> {
  const mortgage = await getMortgageWithProgress(mortgageId, userId, accessToken);
  if (!mortgage) {
    throw new Error('Financiamento não encontrado');
  }

  const annualRate = mortgage.is_reduced_rate_active
    ? (mortgage.reduced_annual_rate ?? mortgage.base_annual_rate)
    : mortgage.base_annual_rate;

  return simulateEarlyPayoff(
    mortgage.current_balance || mortgage.financed_amount,
    mortgage.remaining_installments,
    annualRate,
    mortgage.property_value,
    mortgage.mip_rate || 0,
    mortgage.dfi_rate || 0,
    mortgage.admin_fee || 0,
    mortgage.amortization_system
  );
}

export async function simulateAmortizationForMortgage(
  mortgageId: string,
  userId: string,
  request: AmortizationSimulationRequest,
  accessToken: string
): Promise<AmortizationSimulationResponse> {
  const mortgage = await getMortgageWithProgress(mortgageId, userId, accessToken);
  if (!mortgage) {
    throw new Error('Financiamento não encontrado');
  }

  const annualRate = mortgage.is_reduced_rate_active
    ? (mortgage.reduced_annual_rate ?? mortgage.base_annual_rate)
    : mortgage.base_annual_rate;

  // Get first unpaid installment date or use first_installment_date
  const startDate = mortgage.next_installment?.due_date || mortgage.first_installment_date;

  return simulateMultipleExtraPayments(
    mortgage.current_balance || mortgage.financed_amount,
    mortgage.remaining_installments,
    annualRate,
    mortgage.property_value,
    startDate,
    request.extra_payments || [],
    mortgage.amortization_system,
    mortgage.mip_rate || 0,
    mortgage.dfi_rate || 0,
    mortgage.admin_fee || 0,
    request.include_current_schedule ?? true
  );
}

// ==================== DOCUMENTS ====================

export async function getDocumentsByMortgage(
  mortgageId: string,
  userId: string,
  accessToken: string
): Promise<MortgageDocument[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar documentos: ${error.message}`);
  }

  return data || [];
}

export async function createDocument(
  mortgageId: string,
  userId: string,
  doc: CreateMortgageDocumentDTO,
  accessToken: string
): Promise<MortgageDocument> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(DOCUMENTS_TABLE)
    .insert({
      user_id: userId,
      mortgage_id: mortgageId,
      category: doc.category,
      name: doc.name,
      file_path: doc.file_path,
      file_size: doc.file_size || null,
      mime_type: doc.mime_type || null,
      reference_year: doc.reference_year || null,
      notes: doc.notes || null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar documento: ${error.message}`);
  }

  return data;
}

export async function deleteDocument(
  mortgageId: string,
  docId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  const { error } = await client
    .from(DOCUMENTS_TABLE)
    .delete()
    .eq('id', docId)
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao excluir documento: ${error.message}`);
  }
}

// ==================== SUMMARY & REPORTS ====================

export async function getMortgageSummary(userId: string, accessToken: string): Promise<MortgageSummary> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(MORTGAGES_TABLE)
    .select('status, financed_amount, current_balance, total_installments, paid_installments')
    .eq('user_id', userId)
    .neq('status', 'CANCELADO');

  if (error) {
    throw new Error(`Erro ao buscar resumo: ${error.message}`);
  }

  const mortgages = data || [];
  const activeMortgages = mortgages.filter((m) => m.status === 'ATIVO');

  const totalFinanced = mortgages.reduce((sum, m) => sum + m.financed_amount, 0);
  const totalCurrentBalance = mortgages.reduce((sum, m) => sum + (m.current_balance || m.financed_amount), 0);
  const totalPaid = totalFinanced - totalCurrentBalance;

  const totalInstallments = mortgages.reduce((sum, m) => sum + m.total_installments, 0);
  const totalPaidInstallments = mortgages.reduce((sum, m) => sum + m.paid_installments, 0);
  const overallProgress = totalInstallments > 0 ? (totalPaidInstallments / totalInstallments) * 100 : 0;

  return {
    total_mortgages: mortgages.length,
    active_mortgages: activeMortgages.length,
    total_financed: totalFinanced,
    total_current_balance: totalCurrentBalance,
    total_paid: totalPaid,
    overall_progress: Math.round(overallProgress * 100) / 100,
  };
}

export async function getAnnualReport(
  mortgageId: string,
  year: number,
  userId: string,
  accessToken: string
): Promise<AnnualMortgageReport> {
  const client = createUserClient(accessToken);

  // Buscar financiamento
  const mortgage = await getMortgageById(mortgageId, userId, accessToken);
  if (!mortgage) {
    throw new Error('Financiamento não encontrado');
  }

  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  // Buscar parcelas pagas no ano
  const { data: installments, error: instError } = await client
    .from(INSTALLMENTS_TABLE)
    .select('*')
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId)
    .eq('status', 'PAGA')
    .gte('payment_date', startOfYear)
    .lte('payment_date', endOfYear)
    .order('installment_number', { ascending: true });

  if (instError) {
    throw new Error(`Erro ao buscar parcelas: ${instError.message}`);
  }

  // Buscar amortizações no ano
  const { data: extraPayments, error: extraError } = await client
    .from(EXTRA_PAYMENTS_TABLE)
    .select('*')
    .eq('mortgage_id', mortgageId)
    .eq('user_id', userId)
    .gte('payment_date', startOfYear)
    .lte('payment_date', endOfYear)
    .order('payment_date', { ascending: true });

  if (extraError) {
    throw new Error(`Erro ao buscar amortizações: ${extraError.message}`);
  }

  // Calcular totais
  const paidInstallments = installments || [];
  const extras = extraPayments || [];

  const balanceStartOfYear = paidInstallments[0]?.balance_before || mortgage.current_balance || 0;
  const balanceEndOfYear =
    paidInstallments[paidInstallments.length - 1]?.balance_after || mortgage.current_balance || 0;

  const totalPaid = paidInstallments.reduce((sum, i) => sum + (i.paid_amount || i.total_amount), 0);
  const totalAmortization = paidInstallments.reduce((sum, i) => sum + i.amortization_amount, 0);
  const totalInterest = paidInstallments.reduce((sum, i) => sum + i.interest_amount, 0);
  const totalInsurance = paidInstallments.reduce((sum, i) => sum + i.mip_insurance + i.dfi_insurance, 0);
  const totalAdminFee = paidInstallments.reduce((sum, i) => sum + i.admin_fee, 0);
  const extraPaymentsTotal = extras.reduce((sum, e) => sum + e.amount, 0);

  return {
    year,
    mortgage_id: mortgageId,
    mortgage_name: `Financiamento - ${mortgage.contract_number}`,
    institution_name: mortgage.institution_name,
    contract_number: mortgage.contract_number,
    balance_start_of_year: balanceStartOfYear,
    balance_end_of_year: balanceEndOfYear,
    total_paid: totalPaid,
    total_amortization: totalAmortization,
    total_interest: totalInterest,
    total_insurance: totalInsurance,
    total_admin_fee: totalAdminFee,
    extra_payments_total: extraPaymentsTotal,
    installments: paidInstallments,
    extra_payments: extras,
  };
}
