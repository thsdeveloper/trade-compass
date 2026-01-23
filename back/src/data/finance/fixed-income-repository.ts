import { createUserClient } from '../../lib/supabase.js';
import type {
  FinanceFixedIncome,
  FixedIncomeWithYield,
  CreateFixedIncomeDTO,
  UpdateFixedIncomeDTO,
  FixedIncomeFilters,
  FixedIncomeSummary,
  FixedIncomeContribution,
  CreateFixedIncomeContributionDTO,
  UpdateFixedIncomeContributionDTO,
  FixedIncomeWithContributions,
} from '../../domain/finance-types.js';

const TABLE = 'finance_fixed_income';
const CONTRIBUTIONS_TABLE = 'finance_fixed_income_contributions';

// Calculate yield for pre-fixed investments
function calculatePreFixedYield(
  amountInvested: number,
  annualRate: number,
  purchaseDate: string,
  maturityDate: string
): {
  daysElapsed: number;
  totalDays: number;
  daysToMaturity: number;
  grossYield: number;
  grossYieldPercentage: number;
  estimatedFinalValue: number;
  estimatedCurrentValue: number;
  progressPercentage: number;
} {
  const today = new Date();
  const purchase = new Date(purchaseDate);
  const maturity = new Date(maturityDate);

  // Calculate days (using calendar days for simplicity, could use business days for more accuracy)
  const totalDays = Math.ceil((maturity.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24)));
  const daysToMaturity = Math.max(0, Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Daily rate (252 business days convention)
  const dailyRate = Math.pow(1 + annualRate / 100, 1 / 252) - 1;

  // Estimated current value (using business days approximation: calendar days * 252/365)
  const businessDaysElapsed = Math.floor(daysElapsed * (252 / 365));
  const estimatedCurrentValue = amountInvested * Math.pow(1 + dailyRate, businessDaysElapsed);

  // Estimated final value
  const businessDaysTotal = Math.floor(totalDays * (252 / 365));
  const estimatedFinalValue = amountInvested * Math.pow(1 + dailyRate, businessDaysTotal);

  // Gross yield
  const grossYield = estimatedCurrentValue - amountInvested;
  const grossYieldPercentage = (grossYield / amountInvested) * 100;

  // Progress percentage
  const progressPercentage = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;

  return {
    daysElapsed,
    totalDays,
    daysToMaturity,
    grossYield,
    grossYieldPercentage,
    estimatedFinalValue,
    estimatedCurrentValue,
    progressPercentage,
  };
}

// Enrich investment with yield calculations
function enrichWithYield(investment: FinanceFixedIncome): FixedIncomeWithYield {
  // For pre-fixed, calculate yield
  if (investment.rate_type === 'PRE_FIXADO') {
    const yieldData = calculatePreFixedYield(
      investment.amount_invested,
      investment.rate_value,
      investment.purchase_date,
      investment.maturity_date
    );

    return {
      ...investment,
      days_to_maturity: yieldData.daysToMaturity,
      days_elapsed: yieldData.daysElapsed,
      total_days: yieldData.totalDays,
      gross_yield: yieldData.grossYield,
      gross_yield_percentage: yieldData.grossYieldPercentage,
      estimated_final_value: yieldData.estimatedFinalValue,
      progress_percentage: yieldData.progressPercentage,
      // Use calculated value if no manual current_value
      current_value: investment.current_value ?? yieldData.estimatedCurrentValue,
    };
  }

  // For pos-fixed and hybrid, use manual current_value or estimate based on invested amount
  const today = new Date();
  const purchase = new Date(investment.purchase_date);
  const maturity = new Date(investment.maturity_date);

  const totalDays = Math.ceil((maturity.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(0, Math.ceil((today.getTime() - purchase.getTime()) / (1000 * 60 * 60 * 24)));
  const daysToMaturity = Math.max(0, Math.ceil((maturity.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  const progressPercentage = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;

  const currentValue = investment.current_value ?? investment.amount_invested;
  const grossYield = currentValue - investment.amount_invested;
  const grossYieldPercentage = (grossYield / investment.amount_invested) * 100;

  return {
    ...investment,
    days_to_maturity: daysToMaturity,
    days_elapsed: daysElapsed,
    total_days: totalDays,
    gross_yield: grossYield,
    gross_yield_percentage: grossYieldPercentage,
    estimated_final_value: currentValue, // For pos-fixed, we don't estimate final value
    progress_percentage: progressPercentage,
    current_value: currentValue,
  };
}

export async function getFixedIncomeByUser(
  userId: string,
  filters: FixedIncomeFilters,
  accessToken: string
): Promise<FixedIncomeWithYield[]> {
  const client = createUserClient(accessToken);

  let query = client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'CANCELADO');

  if (filters.investment_type) {
    query = query.eq('investment_type', filters.investment_type);
  }
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.rate_type) {
    query = query.eq('rate_type', filters.rate_type);
  }
  if (filters.search && filters.search.trim().length >= 2) {
    query = query.or(`name.ilike.%${filters.search.trim()}%,issuer.ilike.%${filters.search.trim()}%`);
  }

  query = query.order('maturity_date', { ascending: true });

  if (filters.limit) {
    query = query.limit(filters.limit);
  }
  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Erro ao buscar investimentos: ${error.message}`);
  }

  return (data || []).map(enrichWithYield);
}

export async function getFixedIncomeById(
  id: string,
  userId: string,
  accessToken: string
): Promise<FixedIncomeWithYield | null> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Erro ao buscar investimento: ${error.message}`);
  }

  if (!data) return null;

  return enrichWithYield(data);
}

export async function createFixedIncome(
  userId: string,
  data: CreateFixedIncomeDTO,
  accessToken: string
): Promise<FinanceFixedIncome> {
  const client = createUserClient(accessToken);

  const { data: created, error } = await client
    .from(TABLE)
    .insert({
      user_id: userId,
      investment_type: data.investment_type,
      name: data.name,
      issuer: data.issuer,
      rate_type: data.rate_type,
      rate_value: data.rate_value,
      rate_index: data.rate_index ?? 'NENHUM',
      rate_spread: data.rate_spread ?? 0,
      amount_invested: data.amount_invested,
      current_value: data.current_value ?? null,
      minimum_investment: data.minimum_investment ?? null,
      purchase_date: data.purchase_date,
      maturity_date: data.maturity_date,
      liquidity_type: data.liquidity_type ?? 'NO_VENCIMENTO',
      market: data.market ?? 'PRIMARIO',
      status: 'ATIVO',
      broker: data.broker ?? null,
      custody_account: data.custody_account ?? null,
      notes: data.notes ?? null,
      goal_id: data.goal_id ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao criar investimento: ${error.message}`);
  }

  return created;
}

export async function updateFixedIncome(
  id: string,
  userId: string,
  updates: UpdateFixedIncomeDTO,
  accessToken: string
): Promise<FinanceFixedIncome> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao atualizar investimento: ${error.message}`);
  }

  if (!data) {
    throw new Error('Investimento nao encontrado');
  }

  return data;
}

export async function deleteFixedIncome(
  id: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Soft delete - change status to CANCELADO
  const { error } = await client
    .from(TABLE)
    .update({
      status: 'CANCELADO',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao excluir investimento: ${error.message}`);
  }
}

export async function getFixedIncomeSummary(
  userId: string,
  accessToken: string
): Promise<FixedIncomeSummary> {
  const client = createUserClient(accessToken);

  // Get all active investments
  const { data: investments, error } = await client
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'ATIVO');

  if (error) {
    throw new Error(`Erro ao buscar resumo: ${error.message}`);
  }

  const enrichedInvestments = (investments || []).map(enrichWithYield);

  // Calculate totals
  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalGrossYield = 0;

  const byTypeMap = new Map<string, { count: number; total_invested: number; total_current_value: number }>();
  const byRateTypeMap = new Map<string, { count: number; total_invested: number }>();

  for (const inv of enrichedInvestments) {
    totalInvested += inv.amount_invested;
    totalCurrentValue += inv.current_value ?? inv.amount_invested;
    totalGrossYield += inv.gross_yield;

    // By type
    const typeData = byTypeMap.get(inv.investment_type) ?? { count: 0, total_invested: 0, total_current_value: 0 };
    typeData.count += 1;
    typeData.total_invested += inv.amount_invested;
    typeData.total_current_value += inv.current_value ?? inv.amount_invested;
    byTypeMap.set(inv.investment_type, typeData);

    // By rate type
    const rateData = byRateTypeMap.get(inv.rate_type) ?? { count: 0, total_invested: 0 };
    rateData.count += 1;
    rateData.total_invested += inv.amount_invested;
    byRateTypeMap.set(inv.rate_type, rateData);
  }

  // Get upcoming maturities (next 90 days)
  const today = new Date();
  const ninetyDaysFromNow = new Date();
  ninetyDaysFromNow.setDate(today.getDate() + 90);

  const upcomingMaturities = enrichedInvestments
    .filter((inv) => {
      const maturityDate = new Date(inv.maturity_date);
      return maturityDate >= today && maturityDate <= ninetyDaysFromNow;
    })
    .sort((a, b) => new Date(a.maturity_date).getTime() - new Date(b.maturity_date).getTime())
    .slice(0, 5)
    .map((inv) => ({
      id: inv.id,
      name: inv.name,
      maturity_date: inv.maturity_date,
      days_to_maturity: inv.days_to_maturity,
      amount_invested: inv.amount_invested,
      estimated_final_value: inv.estimated_final_value,
    }));

  const totalYieldPercentage = totalInvested > 0 ? (totalGrossYield / totalInvested) * 100 : 0;

  return {
    total_invested: totalInvested,
    total_current_value: totalCurrentValue,
    total_gross_yield: totalGrossYield,
    total_yield_percentage: totalYieldPercentage,
    active_investments: enrichedInvestments.length,
    by_type: Array.from(byTypeMap.entries()).map(([type, data]) => ({
      type: type as FixedIncomeWithYield['investment_type'],
      ...data,
    })),
    by_rate_type: Array.from(byRateTypeMap.entries()).map(([rate_type, data]) => ({
      rate_type: rate_type as FixedIncomeWithYield['rate_type'],
      ...data,
    })),
    upcoming_maturities: upcomingMaturities,
  };
}

// ==================== CONTRIBUTIONS ====================

export async function getContributionsByFixedIncome(
  fixedIncomeId: string,
  userId: string,
  accessToken: string
): Promise<FixedIncomeContribution[]> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(CONTRIBUTIONS_TABLE)
    .select('*')
    .eq('fixed_income_id', fixedIncomeId)
    .eq('user_id', userId)
    .order('contribution_date', { ascending: false });

  if (error) {
    throw new Error(`Erro ao buscar aportes: ${error.message}`);
  }

  return data || [];
}

export async function getContributionStats(
  fixedIncomeId: string,
  userId: string,
  accessToken: string
): Promise<{ count: number; total: number }> {
  const client = createUserClient(accessToken);

  const { data, error } = await client
    .from(CONTRIBUTIONS_TABLE)
    .select('amount')
    .eq('fixed_income_id', fixedIncomeId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Erro ao buscar estatisticas de aportes: ${error.message}`);
  }

  const contributions = data || [];
  const total = contributions.reduce((sum, c) => sum + Number(c.amount), 0);

  return {
    count: contributions.length,
    total,
  };
}

export async function createContribution(
  fixedIncomeId: string,
  userId: string,
  data: CreateFixedIncomeContributionDTO,
  accessToken: string
): Promise<FixedIncomeContribution> {
  const client = createUserClient(accessToken);

  // Verify the investment exists and belongs to the user
  const investment = await getFixedIncomeById(fixedIncomeId, userId, accessToken);
  if (!investment) {
    throw new Error('Investimento nao encontrado');
  }

  // Create the contribution
  const { data: contribution, error: contributionError } = await client
    .from(CONTRIBUTIONS_TABLE)
    .insert({
      user_id: userId,
      fixed_income_id: fixedIncomeId,
      amount: data.amount,
      contribution_date: data.contribution_date,
      description: data.description ?? null,
    })
    .select()
    .single();

  if (contributionError) {
    throw new Error(`Erro ao criar aporte: ${contributionError.message}`);
  }

  // Update the investment's amount_invested
  const newAmountInvested = investment.amount_invested + data.amount;
  await client
    .from(TABLE)
    .update({
      amount_invested: newAmountInvested,
      updated_at: new Date().toISOString(),
    })
    .eq('id', fixedIncomeId)
    .eq('user_id', userId);

  return contribution;
}

export async function updateContribution(
  contributionId: string,
  fixedIncomeId: string,
  userId: string,
  updates: UpdateFixedIncomeContributionDTO,
  accessToken: string
): Promise<FixedIncomeContribution> {
  const client = createUserClient(accessToken);

  // Get current contribution to calculate difference
  const { data: currentContribution, error: fetchError } = await client
    .from(CONTRIBUTIONS_TABLE)
    .select('*')
    .eq('id', contributionId)
    .eq('fixed_income_id', fixedIncomeId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !currentContribution) {
    throw new Error('Aporte nao encontrado');
  }

  // Update the contribution
  const { data: updated, error: updateError } = await client
    .from(CONTRIBUTIONS_TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contributionId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Erro ao atualizar aporte: ${updateError.message}`);
  }

  // If amount changed, update the investment's amount_invested
  if (updates.amount !== undefined && updates.amount !== currentContribution.amount) {
    const difference = updates.amount - currentContribution.amount;
    const investment = await getFixedIncomeById(fixedIncomeId, userId, accessToken);
    if (investment) {
      const newAmountInvested = investment.amount_invested + difference;
      await client
        .from(TABLE)
        .update({
          amount_invested: newAmountInvested,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fixedIncomeId)
        .eq('user_id', userId);
    }
  }

  return updated;
}

export async function deleteContribution(
  contributionId: string,
  fixedIncomeId: string,
  userId: string,
  accessToken: string
): Promise<void> {
  const client = createUserClient(accessToken);

  // Get the contribution to know the amount
  const { data: contribution, error: fetchError } = await client
    .from(CONTRIBUTIONS_TABLE)
    .select('amount')
    .eq('id', contributionId)
    .eq('fixed_income_id', fixedIncomeId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !contribution) {
    throw new Error('Aporte nao encontrado');
  }

  // Delete the contribution
  const { error: deleteError } = await client
    .from(CONTRIBUTIONS_TABLE)
    .delete()
    .eq('id', contributionId)
    .eq('user_id', userId);

  if (deleteError) {
    throw new Error(`Erro ao excluir aporte: ${deleteError.message}`);
  }

  // Update the investment's amount_invested
  const investment = await getFixedIncomeById(fixedIncomeId, userId, accessToken);
  if (investment) {
    const newAmountInvested = Math.max(0, investment.amount_invested - contribution.amount);
    await client
      .from(TABLE)
      .update({
        amount_invested: newAmountInvested,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fixedIncomeId)
      .eq('user_id', userId);
  }
}

// Get investments with contribution stats
export async function getFixedIncomeWithContributions(
  userId: string,
  filters: FixedIncomeFilters,
  accessToken: string
): Promise<FixedIncomeWithContributions[]> {
  const investments = await getFixedIncomeByUser(userId, filters, accessToken);

  // Get contribution stats for each investment
  const investmentsWithContributions = await Promise.all(
    investments.map(async (inv) => {
      const stats = await getContributionStats(inv.id, userId, accessToken);
      return {
        ...inv,
        contributions_count: stats.count,
        total_contributions: stats.total,
      };
    })
  );

  return investmentsWithContributions;
}
