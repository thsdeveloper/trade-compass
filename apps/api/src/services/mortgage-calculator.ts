/**
 * Calculadora de financiamento imobiliário
 * Suporta sistemas SAC, PRICE e SACRE
 */

import type {
  CalculatedInstallment,
  MortgageAmortizationSystem,
  ExtraPaymentConfig,
  AmortizationScenario,
  AmortizationSimulationResponse,
} from '../domain/finance-types.js';

export interface MortgageCalculatorParams {
  financedAmount: number;
  totalInstallments: number;
  annualRate: number;
  rateIndex: 'TR' | 'IPCA' | 'IGPM' | 'FIXO';
  amortizationSystem: MortgageAmortizationSystem;
  firstInstallmentDate: string;
  propertyValue: number;
  mipRate?: number; // Taxa MIP mensal (percentual sobre saldo devedor)
  dfiRate?: number; // Taxa DFI mensal (percentual sobre valor do imóvel / 12)
  adminFee?: number; // Tarifa administrativa fixa
  startingInstallment?: number; // Para recálculo após amortização
  startingBalance?: number; // Para recálculo após amortização
}

export interface MortgageProjection {
  installments: CalculatedInstallment[];
  totalPaid: number;
  totalInterest: number;
  totalAmortization: number;
  totalInsurance: number;
  totalAdminFee: number;
  averageInstallment: number;
  firstInstallment: number;
  lastInstallment: number;
}

/**
 * Converte taxa anual para taxa mensal equivalente
 * Fórmula: (1 + taxaAnual)^(1/12) - 1
 */
export function annualToMonthlyRate(annualRate: number): number {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

/**
 * Converte taxa mensal para taxa anual equivalente
 * Fórmula: (1 + taxaMensal)^12 - 1
 */
export function monthlyToAnnualRate(monthlyRate: number): number {
  return (Math.pow(1 + monthlyRate, 12) - 1) * 100;
}

/**
 * Adiciona meses a uma data
 */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Formata data para YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calcula parcela no sistema SAC (Sistema de Amortização Constante)
 * - Amortização constante
 * - Juros decrescentes
 * - Parcela decrescente
 */
function calculateSACInstallments(params: MortgageCalculatorParams): CalculatedInstallment[] {
  const {
    financedAmount,
    totalInstallments,
    annualRate,
    firstInstallmentDate,
    propertyValue,
    mipRate = 0,
    dfiRate = 0,
    adminFee = 0,
    startingInstallment = 1,
    startingBalance,
  } = params;

  const monthlyRate = annualToMonthlyRate(annualRate);
  const amortization = financedAmount / totalInstallments;
  const installments: CalculatedInstallment[] = [];

  let balance = startingBalance ?? financedAmount;
  const startDate = new Date(firstInstallmentDate);
  const remainingInstallments = totalInstallments - startingInstallment + 1;

  for (let i = 0; i < remainingInstallments; i++) {
    const installmentNumber = startingInstallment + i;
    const dueDate = addMonths(startDate, i);

    // Juros sobre saldo devedor
    const interest = balance * monthlyRate;

    // Seguro MIP (sobre saldo devedor)
    const mip = balance * (mipRate / 100);

    // Seguro DFI (sobre valor do imóvel, dividido por 12)
    const dfi = (propertyValue * (dfiRate / 100)) / 12;

    // Total da parcela
    const total = amortization + interest + mip + dfi + adminFee;

    // Saldo após amortização
    const balanceAfter = Math.max(0, balance - amortization);

    installments.push({
      installment_number: installmentNumber,
      due_date: formatDate(dueDate),
      amortization_amount: Math.round(amortization * 100) / 100,
      interest_amount: Math.round(interest * 100) / 100,
      mip_insurance: Math.round(mip * 100) / 100,
      dfi_insurance: Math.round(dfi * 100) / 100,
      admin_fee: adminFee,
      tr_adjustment: 0, // Será calculado posteriormente com dados reais da TR
      total_amount: Math.round(total * 100) / 100,
      balance_before: Math.round(balance * 100) / 100,
      balance_after: Math.round(balanceAfter * 100) / 100,
    });

    balance = balanceAfter;
  }

  return installments;
}

/**
 * Calcula parcela no sistema PRICE (Tabela Price / Sistema Francês)
 * - Parcela constante
 * - Amortização crescente
 * - Juros decrescentes
 */
function calculatePRICEInstallments(params: MortgageCalculatorParams): CalculatedInstallment[] {
  const {
    financedAmount,
    totalInstallments,
    annualRate,
    firstInstallmentDate,
    propertyValue,
    mipRate = 0,
    dfiRate = 0,
    adminFee = 0,
    startingInstallment = 1,
    startingBalance,
  } = params;

  const monthlyRate = annualToMonthlyRate(annualRate);
  const installments: CalculatedInstallment[] = [];

  let balance = startingBalance ?? financedAmount;
  const startDate = new Date(firstInstallmentDate);
  const remainingInstallments = totalInstallments - startingInstallment + 1;

  // Fórmula da parcela PRICE: PMT = PV * [i * (1+i)^n] / [(1+i)^n - 1]
  const pmt =
    balance *
    ((monthlyRate * Math.pow(1 + monthlyRate, remainingInstallments)) /
      (Math.pow(1 + monthlyRate, remainingInstallments) - 1));

  for (let i = 0; i < remainingInstallments; i++) {
    const installmentNumber = startingInstallment + i;
    const dueDate = addMonths(startDate, i);

    // Juros sobre saldo devedor
    const interest = balance * monthlyRate;

    // Amortização = parcela - juros
    const amortization = pmt - interest;

    // Seguro MIP (sobre saldo devedor)
    const mip = balance * (mipRate / 100);

    // Seguro DFI (sobre valor do imóvel, dividido por 12)
    const dfi = (propertyValue * (dfiRate / 100)) / 12;

    // Total da parcela (PMT base + seguros + tarifa)
    const total = pmt + mip + dfi + adminFee;

    // Saldo após amortização
    const balanceAfter = Math.max(0, balance - amortization);

    installments.push({
      installment_number: installmentNumber,
      due_date: formatDate(dueDate),
      amortization_amount: Math.round(amortization * 100) / 100,
      interest_amount: Math.round(interest * 100) / 100,
      mip_insurance: Math.round(mip * 100) / 100,
      dfi_insurance: Math.round(dfi * 100) / 100,
      admin_fee: adminFee,
      tr_adjustment: 0,
      total_amount: Math.round(total * 100) / 100,
      balance_before: Math.round(balance * 100) / 100,
      balance_after: Math.round(balanceAfter * 100) / 100,
    });

    balance = balanceAfter;
  }

  return installments;
}

/**
 * Calcula parcela no sistema SACRE (SAC com parcela decrescente e amortização crescente)
 * Similar ao SAC mas com correção pela TR integrada
 */
function calculateSACREInstallments(params: MortgageCalculatorParams): CalculatedInstallment[] {
  // SACRE é essencialmente SAC com correção monetária
  // A implementação básica é igual ao SAC
  return calculateSACInstallments(params);
}

/**
 * Calcula todas as parcelas do financiamento
 */
export function calculateMortgageInstallments(params: MortgageCalculatorParams): MortgageProjection {
  let installments: CalculatedInstallment[];

  switch (params.amortizationSystem) {
    case 'SAC':
      installments = calculateSACInstallments(params);
      break;
    case 'PRICE':
      installments = calculatePRICEInstallments(params);
      break;
    case 'SACRE':
      installments = calculateSACREInstallments(params);
      break;
    default:
      installments = calculateSACInstallments(params);
  }

  // Calcular totais
  const totals = installments.reduce(
    (acc, inst) => ({
      totalPaid: acc.totalPaid + inst.total_amount,
      totalInterest: acc.totalInterest + inst.interest_amount,
      totalAmortization: acc.totalAmortization + inst.amortization_amount,
      totalInsurance: acc.totalInsurance + inst.mip_insurance + inst.dfi_insurance,
      totalAdminFee: acc.totalAdminFee + inst.admin_fee,
    }),
    { totalPaid: 0, totalInterest: 0, totalAmortization: 0, totalInsurance: 0, totalAdminFee: 0 }
  );

  return {
    installments,
    ...totals,
    averageInstallment: totals.totalPaid / installments.length,
    firstInstallment: installments[0]?.total_amount ?? 0,
    lastInstallment: installments[installments.length - 1]?.total_amount ?? 0,
  };
}

/**
 * Simula amortização extraordinária
 */
export function simulateExtraPayment(
  currentBalance: number,
  remainingInstallments: number,
  currentInstallmentValue: number,
  extraPaymentAmount: number,
  paymentType: 'REDUCE_TERM' | 'REDUCE_INSTALLMENT',
  annualRate: number,
  propertyValue: number,
  mipRate: number = 0,
  dfiRate: number = 0,
  adminFee: number = 0,
  amortizationSystem: MortgageAmortizationSystem = 'SAC'
) {
  const newBalance = currentBalance - extraPaymentAmount;
  const monthlyRate = annualToMonthlyRate(annualRate);

  let newRemainingInstallments: number;
  let newInstallmentValue: number;
  let monthsReduced = 0;

  if (paymentType === 'REDUCE_TERM') {
    // Mantém o valor da amortização, reduz o prazo
    const currentAmortization = currentBalance / remainingInstallments;
    newRemainingInstallments = Math.ceil(newBalance / currentAmortization);
    monthsReduced = remainingInstallments - newRemainingInstallments;

    // Recalcular primeira parcela com novo saldo
    const interest = newBalance * monthlyRate;
    const mip = newBalance * (mipRate / 100);
    const dfi = (propertyValue * (dfiRate / 100)) / 12;
    newInstallmentValue = currentAmortization + interest + mip + dfi + adminFee;
  } else {
    // Mantém o prazo, reduz o valor da parcela
    newRemainingInstallments = remainingInstallments;
    const newAmortization = newBalance / remainingInstallments;
    const interest = newBalance * monthlyRate;
    const mip = newBalance * (mipRate / 100);
    const dfi = (propertyValue * (dfiRate / 100)) / 12;
    newInstallmentValue = newAmortization + interest + mip + dfi + adminFee;
  }

  // Calcular economia em juros
  // Juros que seriam pagos sem a amortização
  const originalProjection = calculateMortgageInstallments({
    financedAmount: currentBalance,
    totalInstallments: remainingInstallments,
    annualRate,
    rateIndex: 'TR',
    amortizationSystem,
    firstInstallmentDate: new Date().toISOString().split('T')[0],
    propertyValue,
    mipRate,
    dfiRate,
    adminFee,
  });

  // Juros que serão pagos com a amortização
  const newProjection = calculateMortgageInstallments({
    financedAmount: newBalance,
    totalInstallments: newRemainingInstallments,
    annualRate,
    rateIndex: 'TR',
    amortizationSystem,
    firstInstallmentDate: new Date().toISOString().split('T')[0],
    propertyValue,
    mipRate,
    dfiRate,
    adminFee,
  });

  const interestSaved = originalProjection.totalInterest - newProjection.totalInterest;
  const totalSaved = originalProjection.totalPaid - newProjection.totalPaid - extraPaymentAmount;

  return {
    payment_type: paymentType,
    amount: extraPaymentAmount,
    current_balance: currentBalance,
    new_balance: Math.round(newBalance * 100) / 100,
    current_remaining_installments: remainingInstallments,
    new_remaining_installments: newRemainingInstallments,
    current_installment_value: Math.round(currentInstallmentValue * 100) / 100,
    new_installment_value: Math.round(newInstallmentValue * 100) / 100,
    interest_saved: Math.round(interestSaved * 100) / 100,
    months_reduced: monthsReduced,
    total_saved: Math.round(totalSaved * 100) / 100,
  };
}

/**
 * Simula quitação antecipada
 */
export function simulateEarlyPayoff(
  currentBalance: number,
  remainingInstallments: number,
  annualRate: number,
  propertyValue: number,
  mipRate: number = 0,
  dfiRate: number = 0,
  adminFee: number = 0,
  amortizationSystem: MortgageAmortizationSystem = 'SAC'
) {
  // Calcular total que seria pago se continuar normalmente
  const projection = calculateMortgageInstallments({
    financedAmount: currentBalance,
    totalInstallments: remainingInstallments,
    annualRate,
    rateIndex: 'TR',
    amortizationSystem,
    firstInstallmentDate: new Date().toISOString().split('T')[0],
    propertyValue,
    mipRate,
    dfiRate,
    adminFee,
  });

  // Para quitação antecipada, paga-se apenas o saldo devedor
  const payoffAmount = currentBalance;
  const totalSavings = projection.totalPaid - payoffAmount;

  return {
    current_balance: Math.round(currentBalance * 100) / 100,
    remaining_installments: remainingInstallments,
    total_remaining_payments: Math.round(projection.totalPaid * 100) / 100,
    total_interest_remaining: Math.round(projection.totalInterest * 100) / 100,
    payoff_amount: Math.round(payoffAmount * 100) / 100,
    total_savings: Math.round(totalSavings * 100) / 100,
  };
}

/**
 * Simula múltiplos pagamentos extras (únicos ou recorrentes)
 * Retorna cenários comparativos
 */
export function simulateMultipleExtraPayments(
  currentBalance: number,
  remainingInstallments: number,
  annualRate: number,
  propertyValue: number,
  firstInstallmentDate: string,
  extraPayments: ExtraPaymentConfig[],
  amortizationSystem: MortgageAmortizationSystem = 'SAC',
  mipRate: number = 0,
  dfiRate: number = 0,
  adminFee: number = 0,
  includeOriginalSchedule: boolean = true
): AmortizationSimulationResponse {
  const scenarios: AmortizationScenario[] = [];

  // Calculate original schedule (without extra payments)
  const originalProjection = calculateMortgageInstallments({
    financedAmount: currentBalance,
    totalInstallments: remainingInstallments,
    annualRate,
    rateIndex: 'TR',
    amortizationSystem,
    firstInstallmentDate,
    propertyValue,
    mipRate,
    dfiRate,
    adminFee,
  });

  if (includeOriginalSchedule) {
    const lastInstallment = originalProjection.installments[originalProjection.installments.length - 1];
    scenarios.push({
      name: 'Original',
      installments: originalProjection.installments,
      summary: {
        total_paid: Math.round(originalProjection.totalPaid * 100) / 100,
        total_interest: Math.round(originalProjection.totalInterest * 100) / 100,
        total_amortization: Math.round(originalProjection.totalAmortization * 100) / 100,
        final_installment_number: remainingInstallments,
        estimated_end_date: lastInstallment?.due_date || firstInstallmentDate,
      },
    });
  }

  // If no extra payments configured, return original only
  if (!extraPayments || extraPayments.length === 0) {
    return { scenarios };
  }

  // Calculate scenario with extra payments
  const monthlyRate = annualToMonthlyRate(annualRate);
  const baseAmortization = currentBalance / remainingInstallments;
  const installmentsWithExtras: CalculatedInstallment[] = [];

  let balance = currentBalance;
  let totalExtraPayments = 0;
  const startDate = new Date(firstInstallmentDate);

  for (let i = 0; i < remainingInstallments && balance > 0.01; i++) {
    const installmentNumber = i + 1;
    const dueDate = addMonths(startDate, i);

    // Calculate regular installment
    const interest = balance * monthlyRate;
    const amortization = Math.min(baseAmortization, balance);
    const mip = balance * (mipRate / 100);
    const dfi = (propertyValue * (dfiRate / 100)) / 12;
    const regularTotal = amortization + interest + mip + dfi + adminFee;

    // Calculate extra payments for this month
    let extraPaymentThisMonth = 0;
    for (const extra of extraPayments) {
      const startMonth = extra.start_month ?? 1;
      const endMonth = extra.end_month ?? remainingInstallments;

      if (extra.type === 'ONE_TIME') {
        if (installmentNumber === startMonth) {
          extraPaymentThisMonth += extra.amount;
        }
      } else if (extra.type === 'RECURRING') {
        if (installmentNumber >= startMonth && installmentNumber <= endMonth) {
          extraPaymentThisMonth += extra.amount;
        }
      }
    }

    // Apply extra payment (cap at remaining balance after regular amortization)
    const effectiveExtra = Math.min(extraPaymentThisMonth, balance - amortization);
    totalExtraPayments += effectiveExtra;

    const totalAmortization = amortization + effectiveExtra;
    const balanceAfter = Math.max(0, balance - totalAmortization);

    installmentsWithExtras.push({
      installment_number: installmentNumber,
      due_date: formatDate(dueDate),
      amortization_amount: Math.round(totalAmortization * 100) / 100,
      interest_amount: Math.round(interest * 100) / 100,
      mip_insurance: Math.round(mip * 100) / 100,
      dfi_insurance: Math.round(dfi * 100) / 100,
      admin_fee: adminFee,
      tr_adjustment: 0,
      total_amount: Math.round((regularTotal + effectiveExtra) * 100) / 100,
      balance_before: Math.round(balance * 100) / 100,
      balance_after: Math.round(balanceAfter * 100) / 100,
    });

    balance = balanceAfter;

    // Stop if balance is paid off
    if (balance <= 0.01) {
      break;
    }
  }

  // Calculate summary for scenario with extra payments
  const totalsWithExtras = installmentsWithExtras.reduce(
    (acc, inst) => ({
      totalPaid: acc.totalPaid + inst.total_amount,
      totalInterest: acc.totalInterest + inst.interest_amount,
      totalAmortization: acc.totalAmortization + inst.amortization_amount,
    }),
    { totalPaid: 0, totalInterest: 0, totalAmortization: 0 }
  );

  const lastInstallmentWithExtras = installmentsWithExtras[installmentsWithExtras.length - 1];
  scenarios.push({
    name: 'Com Aportes',
    installments: installmentsWithExtras,
    summary: {
      total_paid: Math.round(totalsWithExtras.totalPaid * 100) / 100,
      total_interest: Math.round(totalsWithExtras.totalInterest * 100) / 100,
      total_amortization: Math.round(totalsWithExtras.totalAmortization * 100) / 100,
      final_installment_number: installmentsWithExtras.length,
      estimated_end_date: lastInstallmentWithExtras?.due_date || firstInstallmentDate,
    },
  });

  // Calculate comparison
  const interestSaved = originalProjection.totalInterest - totalsWithExtras.totalInterest;
  const monthsReduced = remainingInstallments - installmentsWithExtras.length;
  const totalSaved = originalProjection.totalPaid - totalsWithExtras.totalPaid;
  const roiPercentage = totalExtraPayments > 0 ? (interestSaved / totalExtraPayments) * 100 : 0;

  return {
    scenarios,
    comparison: {
      interest_saved: Math.round(interestSaved * 100) / 100,
      months_reduced: monthsReduced,
      total_saved: Math.round(totalSaved * 100) / 100,
      roi_percentage: Math.round(roiPercentage * 100) / 100,
    },
  };
}
