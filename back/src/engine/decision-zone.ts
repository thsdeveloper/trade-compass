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
    'Contexto apresenta caracteristicas favoraveis. Tendencia e volume alinhados.',
    'Condicoes de mercado parecem propicias para operacoes alinhadas com a tendencia.',
    'Indicadores apontam momento potencialmente oportuno. Avalie os setups disponiveis.',
  ],
  NEUTRA: [
    'Mercado em consolidacao. Aguardar definicao pode ser prudente.',
    'Contexto sem direcao clara. Momento de observacao e planejamento.',
    'Sinais mistos no momento. Considere cautela ate melhor definicao.',
  ],
  RISCO: [
    'ATENCAO: Contexto indica momento de risco elevado. Priorize protecao do capital.',
    'Cautela recomendada. Indicadores sugerem aumento de risco.',
    'Momento desfavoravel para novas posicoes. Avalie exposicao atual.',
  ],
};

/**
 * Seleciona mensagem aleatoria (deterministico baseado em data)
 */
function selectMessage(zone: DecisionZoneType): string {
  const messages = ZONE_MESSAGES[zone];
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const index = dayOfYear % messages.length;
  return messages[index];
}

/**
 * Verifica se um setup especifico esta ativo
 */
function isSetupActive(setups: SetupResult[], setupId: string): boolean {
  return setups.some(
    (s) => s.id.startsWith(setupId) && s.status === 'ATIVO'
  );
}

/**
 * Conta quantos setups estao ativos
 */
function countActiveSetups(setups: SetupResult[]): number {
  return setups.filter((s) => s.status === 'ATIVO').length;
}

/**
 * Agrega contexto e setups para determinar a zona de decisao
 */
export function calculateDecisionZone(input: DecisionInput): DecisionZone {
  const { context, setups } = input;
  const reasons: string[] = [];

  // 1. Se Breakdown ATIVO → RISCO
  if (isSetupActive(setups, 'breakdown')) {
    reasons.push('Quebra de suporte detectada');
    reasons.push('Momento de protecao de capital');

    if (context.volatility === 'Alta') {
      reasons.push('Volatilidade elevada aumenta o risco');
    }

    return {
      zone: 'RISCO',
      message: selectMessage('RISCO'),
      reasons,
    };
  }

  // 2. Se Breakout ATIVO + trend Alta + volume Acima → FAVORAVEL
  if (
    isSetupActive(setups, 'breakout') &&
    context.trend === 'Alta' &&
    context.volume === 'Acima'
  ) {
    reasons.push('Rompimento de resistencia confirmado');
    reasons.push('Tendencia de alta');
    reasons.push('Volume acima da media');

    return {
      zone: 'FAVORAVEL',
      message: selectMessage('FAVORAVEL'),
      reasons,
    };
  }

  // 3. Se Pullback ATIVO + trend Alta → FAVORAVEL
  if (isSetupActive(setups, 'pullback') && context.trend === 'Alta') {
    reasons.push('Pullback em tendencia de alta');
    reasons.push('Teste de suporte dinamico na SMA20');

    if (context.volume !== 'Abaixo') {
      reasons.push('Volume adequado');
    }

    return {
      zone: 'FAVORAVEL',
      message: selectMessage('FAVORAVEL'),
      reasons,
    };
  }

  // 4. Se volatilidade Alta + nenhum setup ativo → NEUTRA (com aviso)
  if (context.volatility === 'Alta' && countActiveSetups(setups) === 0) {
    reasons.push('Volatilidade elevada');
    reasons.push('Nenhum setup ativo no momento');
    reasons.push('Aguardar reducao de volatilidade pode ser prudente');

    return {
      zone: 'NEUTRA',
      message: selectMessage('NEUTRA'),
      reasons,
    };
  }

  // 5. Tendencia de baixa sem setup de rompimento → NEUTRA tendendo a RISCO
  if (context.trend === 'Baixa') {
    reasons.push('Tendencia de baixa');

    if (context.volume === 'Acima') {
      reasons.push('Volume elevado pode indicar continuidade da queda');
      return {
        zone: 'RISCO',
        message: selectMessage('RISCO'),
        reasons,
      };
    }

    reasons.push('Momento de cautela');
    return {
      zone: 'NEUTRA',
      message: selectMessage('NEUTRA'),
      reasons,
    };
  }

  // 6. Default → NEUTRA
  reasons.push(`Tendencia: ${context.trend}`);
  reasons.push(`Volume: ${context.volume}`);
  reasons.push(`Volatilidade: ${context.volatility}`);

  if (countActiveSetups(setups) > 0) {
    reasons.push(`${countActiveSetups(setups)} setup(s) ativo(s)`);
  }

  return {
    zone: 'NEUTRA',
    message: selectMessage('NEUTRA'),
    reasons,
  };
}
