'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { RecommendationCard } from '@/components/molecules/RecommendationCard';
import type { BudgetSummary, PlanningRecommendation, BudgetCategory, RecommendationType, RecommendationPriority } from '@/types/finance';
import { BUDGET_CATEGORY_IDEAL, BUDGET_CATEGORY_LABELS } from '@/types/finance';

interface PlanejamentoRecommendationsProps {
  budgetSummary: BudgetSummary;
}

function generateRecommendations(budgetSummary: BudgetSummary): PlanningRecommendation[] {
  const recommendations: PlanningRecommendation[] = [];

  budgetSummary.allocations.forEach((allocation) => {
    const idealPercentage = BUDGET_CATEGORY_IDEAL[allocation.category];
    const difference = allocation.actual_percentage - idealPercentage;
    const categoryLabel = BUDGET_CATEGORY_LABELS[allocation.category];

    if (allocation.status === 'over_budget') {
      if (allocation.category === 'ESSENCIAL') {
        recommendations.push({
          id: `warning-${allocation.category}`,
          category: allocation.category as BudgetCategory,
          type: 'warning' as RecommendationType,
          priority: 'high' as RecommendationPriority,
          title: `${categoryLabel} acima do limite`,
          description: `Seus gastos essenciais estao ${difference.toFixed(1)}% acima do ideal. Revise contratos de aluguel, contas de consumo ou transporte.`,
        });
      } else if (allocation.category === 'ESTILO_VIDA') {
        recommendations.push({
          id: `warning-${allocation.category}`,
          category: allocation.category as BudgetCategory,
          type: 'warning' as RecommendationType,
          priority: 'medium' as RecommendationPriority,
          title: `${categoryLabel} acima do limite`,
          description: `Gastos com lazer e desejos estao ${difference.toFixed(1)}% acima da meta. Considere reduzir assinaturas ou compras nao essenciais.`,
        });
      }
    }

    if (allocation.category === 'INVESTIMENTO') {
      if (allocation.actual_percentage < idealPercentage * 0.5) {
        recommendations.push({
          id: `suggestion-${allocation.category}`,
          category: allocation.category as BudgetCategory,
          type: 'suggestion' as RecommendationType,
          priority: 'high' as RecommendationPriority,
          title: 'Aumente seus investimentos',
          description: `Voce esta investindo apenas ${allocation.actual_percentage.toFixed(1)}% da sua renda. A meta e ${idealPercentage}%. Considere automatizar aportes.`,
        });
      } else if (allocation.actual_percentage >= idealPercentage * 0.9) {
        recommendations.push({
          id: `achievement-${allocation.category}`,
          category: allocation.category as BudgetCategory,
          type: 'achievement' as RecommendationType,
          priority: 'low' as RecommendationPriority,
          title: 'Parabens pelos investimentos!',
          description: `Voce esta investindo ${allocation.actual_percentage.toFixed(1)}% da sua renda, proximo ou acima da meta de ${idealPercentage}%. Continue assim!`,
        });
      }
    }

    if (allocation.status === 'on_track' || allocation.status === 'under_budget') {
      if (allocation.category !== 'INVESTIMENTO') {
        const underPercentage = idealPercentage - allocation.actual_percentage;
        if (underPercentage >= 10) {
          recommendations.push({
            id: `suggestion-redirect-${allocation.category}`,
            category: allocation.category as BudgetCategory,
            type: 'suggestion' as RecommendationType,
            priority: 'low' as RecommendationPriority,
            title: `Redirecione economia de ${categoryLabel}`,
            description: `Voce gastou ${underPercentage.toFixed(1)}% menos que o limite em ${categoryLabel.toLowerCase()}. Considere investir essa diferenca.`,
          });
        }
      }
    }
  });

  const essencial = budgetSummary.allocations.find(a => a.category === 'ESSENCIAL');
  const estiloVida = budgetSummary.allocations.find(a => a.category === 'ESTILO_VIDA');
  const investimento = budgetSummary.allocations.find(a => a.category === 'INVESTIMENTO');

  if (essencial && estiloVida && investimento) {
    const totalPercentage = essencial.actual_percentage + estiloVida.actual_percentage + investimento.actual_percentage;

    if (Math.abs(essencial.actual_percentage - 50) <= 5 &&
        Math.abs(estiloVida.actual_percentage - 30) <= 5 &&
        Math.abs(investimento.actual_percentage - 20) <= 5) {
      recommendations.unshift({
        id: 'achievement-balanced',
        category: 'ESSENCIAL',
        type: 'achievement' as RecommendationType,
        priority: 'low' as RecommendationPriority,
        title: 'Orcamento equilibrado!',
        description: 'Sua distribuicao esta muito proxima do ideal 50-30-20. Excelente gestao financeira!',
      });
    }
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const typeOrder = { warning: 0, suggestion: 1, achievement: 2 };

    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return typeOrder[a.type] - typeOrder[b.type];
  });
}

export function PlanejamentoRecommendations({ budgetSummary }: PlanejamentoRecommendationsProps) {
  const recommendations = useMemo(
    () => generateRecommendations(budgetSummary),
    [budgetSummary]
  );

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-medium text-slate-900">
          Recomendacoes Inteligentes
        </h2>
      </div>
      <div className="space-y-3">
        {recommendations.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
          />
        ))}
      </div>
    </div>
  );
}
