import type { Context, DecisionZone, DecisionZoneType, SetupResult } from '../domain/types.js';

interface DecisionInput {
  context: Context;
  setups: SetupResult[];
}

/**
 * Mensagens padrao por zona
 */
const ZONE_MESSAGES: Record<DecisionZoneType, string[]> = {
  FAVORAVEL: [
    'Contexto favoravel para operacoes na ponta compradora.',
    'Tendencia de alta confirmada por setups.',
    'Sinais de compra ativos no momento.',
  ],
  NEUTRA: [
    'Mercado sem direcao clara ou em transicao.',
    'Aguardar confirmacao de rompimentos.',
    'Observe a formacao de padroes 1-2-3.',
  ],
  RISCO: [
    'Tendencia de baixa predominante.',
    'Favorece operacoes de venda ou protecao de carteira.',
    'Cuidado com compras contra tendencia.',
  ],
};

function selectMessage(zone: DecisionZoneType): string {
  const messages = ZONE_MESSAGES[zone];
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const index = dayOfYear % messages.length;
  return messages[index];
}

function isSetupActive(setups: SetupResult[], setupId: string): boolean {
  return setups.some(
    (s) => s.id === setupId && s.status === 'ATIVO'
  );
}

function countActiveSetups(setups: SetupResult[]): number {
  return setups.filter((s) => s.status === 'ATIVO').length;
}

export function calculateDecisionZone(input: DecisionInput): DecisionZone {
  const { context, setups } = input;
  const reasons: string[] = [];

  // 1. Setup 123 Compra ATIVO -> FAVORAVEL
  if (isSetupActive(setups, '123-compra')) {
    reasons.push('Setup 123 de Compra Ativado');
    reasons.push('Tendencia de Alta (EMA8 > EMA80)');
    reasons.push('Rompimento de pivot confirmado');

    return {
      zone: 'FAVORAVEL',
      message: selectMessage('FAVORAVEL'),
      reasons,
    };
  }

  // 2. Setup 123 Venda ATIVO -> RISCO (Favorece Venda)
  if (isSetupActive(setups, '123-venda')) {
    reasons.push('Setup 123 de Venda Ativado');
    reasons.push('Tendencia de Baixa (EMA8 < EMA80)');
    reasons.push('Perda de suporte confirmada');

    return {
      zone: 'RISCO',
      message: selectMessage('RISCO'),
      reasons,
    };
  }

  // 3. Setups em formacao
  const setupsInFormation = setups.filter(s => s.status === 'EM_FORMACAO');
  if (setupsInFormation.length > 0) {
    const names = setupsInFormation.map(s => s.title).join(', ');
    reasons.push(`Setups em formacao: ${names}`);
    reasons.push('Aguardando rompimento dos pontos de entrada');

    return {
      zone: 'NEUTRA',
      message: selectMessage('NEUTRA'),
      reasons,
    };
  }

  // 4. Default baseado no contexto
  reasons.push(`Tendencia: ${context.trend}`);
  reasons.push(`Volatilidade: ${context.volatility}`);

  if (context.trend === 'Alta') {
    return {
      zone: 'NEUTRA', // Neutra pois nao tem setup ativo
      message: 'Tendencia de Alta mas sem setup de entrada confirmado.',
      reasons
    };
  } else if (context.trend === 'Baixa') {
    return {
      zone: 'RISCO',
      message: 'Mercado em baixa sem setup de venda confirmado.',
      reasons
    };
  }

  return {
    zone: 'NEUTRA',
    message: selectMessage('NEUTRA'),
    reasons,
  };
}
