import { getWatchlistByUser } from '../../data/watchlist-repository.js';
import {
  getFixedIncomeByUser,
  getFixedIncomeSummary,
} from '../../data/finance/fixed-income-repository.js';
import type { AgentDefinition } from './types.js';

const SYSTEM_PROMPT = `Voce e o Polaris, o analista de carteira do Money Compass, um aplicativo de gestao financeira e investimentos. Seu nome vem da Estrela Polar, que guiou navegadores por seculos: voce orienta o usuario nas travessias longas dos investimentos.

REGRAS IMPORTANTES:
1. Responda APENAS com base nos dados da carteira fornecidos abaixo
2. Use moeda brasileira (R$) formatada corretamente
3. Seja conciso mas informativo
4. Se nao tiver informacao suficiente nos dados, diga claramente
5. NAO recomende compra ou venda de ativos especificos. Voce pode explicar conceitos
   (liquidez, marcacao a mercado, tipos de indexador, diversificacao) e descrever
   objetivamente a carteira do usuario, mas a decisao e sempre dele
6. Ao falar de rentabilidade, deixe claro que valores sao estimativas brutas
   (antes de impostos e taxas)
7. Responda sempre em portugues brasileiro
8. Use formatacao simples (sem markdown complexo)

CARTEIRA DO USUARIO:
{context}`;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

async function getInvestmentContext(
  userId: string,
  accessToken: string
): Promise<string> {
  const [summary, investments, watchlist] = await Promise.all([
    getFixedIncomeSummary(userId, accessToken),
    getFixedIncomeByUser(userId, { status: 'ATIVO', limit: 20 }, accessToken),
    getWatchlistByUser(userId, accessToken),
  ]);

  const lines: string[] = [];

  lines.push('=== RESUMO RENDA FIXA ===');
  lines.push(`Investimentos ativos: ${summary.active_investments}`);
  lines.push(`Total investido: ${formatCurrency(summary.total_invested)}`);
  lines.push(`Valor atual estimado: ${formatCurrency(summary.total_current_value)}`);
  lines.push(
    `Rendimento bruto estimado: ${formatCurrency(summary.total_gross_yield)} ` +
      `(${summary.total_yield_percentage.toFixed(2)}%)`
  );
  lines.push('');

  if (summary.by_type.length > 0) {
    lines.push('=== POR TIPO ===');
    for (const t of summary.by_type) {
      lines.push(
        `- ${t.type}: ${t.count} ativo(s), investido ${formatCurrency(t.total_invested)}, ` +
          `valor atual ${formatCurrency(t.total_current_value)}`
      );
    }
    lines.push('');
  }

  if (summary.upcoming_maturities.length > 0) {
    lines.push('=== VENCIMENTOS PROXIMOS (90 dias) ===');
    for (const m of summary.upcoming_maturities) {
      lines.push(
        `- ${m.name}: vence em ${m.days_to_maturity} dias (${m.maturity_date}), ` +
          `investido ${formatCurrency(m.amount_invested)}, ` +
          `valor final estimado ${formatCurrency(m.estimated_final_value)}`
      );
    }
    lines.push('');
  }

  if (investments.length > 0) {
    lines.push('=== INVESTIMENTOS ATIVOS ===');
    for (const inv of investments) {
      const rate =
        inv.rate_type === 'PRE_FIXADO'
          ? `${inv.rate_value}% a.a.`
          : `${inv.rate_value}% ${inv.rate_index}${inv.rate_spread ? ` + ${inv.rate_spread}%` : ''}`;
      lines.push(
        `- ${inv.name} (${inv.investment_type}, ${inv.issuer}): ` +
          `investido ${formatCurrency(inv.amount_invested)}, ` +
          `atual ${formatCurrency(inv.current_value ?? inv.amount_invested)}, ` +
          `rendimento ${formatCurrency(inv.gross_yield)} (${inv.gross_yield_percentage.toFixed(2)}%), ` +
          `taxa ${rate}, liquidez ${inv.liquidity_type}, ` +
          `vencimento ${inv.maturity_date} (${inv.days_to_maturity} dias)`
      );
    }
    lines.push('');
  }

  if (watchlist.length > 0) {
    lines.push('=== WATCHLIST (renda variavel acompanhada) ===');
    for (const item of watchlist) {
      lines.push(`- ${item.ticker}${item.notes ? `: ${item.notes}` : ''}`);
    }
    lines.push('');
  }

  if (investments.length === 0 && watchlist.length === 0) {
    lines.push('O usuario ainda nao cadastrou investimentos nem ativos na watchlist.');
  }

  return lines.join('\n');
}

export const investimentosAgent: AgentDefinition = {
  id: 'investimentos',
  name: 'Polaris',
  description: 'Sua estrela-guia de investimentos: renda fixa, rentabilidade, vencimentos e watchlist',
  systemPrompt: SYSTEM_PROMPT,
  maxTokens: 1000,
  temperature: 0.5,
  getContext: getInvestmentContext,
};
