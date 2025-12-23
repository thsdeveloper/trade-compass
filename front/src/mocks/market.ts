import type {
  AssetSummary,
  AssetContext,
  DecisionZoneResult,
  Setup,
  WatchlistItem,
  Alert,
  HistoryEvent,
  Trend,
  Volume,
  Volatility,
  DecisionZone,
} from '@/types/market';

// Base de dados de ativos mockados
const assetDatabase: Record<
  string,
  {
    name: string;
    price: number;
    trend: Trend;
    volume: Volume;
    volatility: Volatility;
  }
> = {
  PETR4: {
    name: 'Petrobras PN',
    price: 38.45,
    trend: 'Alta',
    volume: 'Acima',
    volatility: 'Media',
  },
  VALE3: {
    name: 'Vale ON',
    price: 62.3,
    trend: 'Lateral',
    volume: 'Normal',
    volatility: 'Baixa',
  },
  ITUB4: {
    name: 'Itau Unibanco PN',
    price: 32.15,
    trend: 'Alta',
    volume: 'Normal',
    volatility: 'Baixa',
  },
  BBDC4: {
    name: 'Bradesco PN',
    price: 14.8,
    trend: 'Baixa',
    volume: 'Abaixo',
    volatility: 'Media',
  },
  ABEV3: {
    name: 'Ambev ON',
    price: 12.65,
    trend: 'Lateral',
    volume: 'Normal',
    volatility: 'Baixa',
  },
  WEGE3: {
    name: 'WEG ON',
    price: 41.2,
    trend: 'Alta',
    volume: 'Acima',
    volatility: 'Media',
  },
  MGLU3: {
    name: 'Magazine Luiza ON',
    price: 2.15,
    trend: 'Baixa',
    volume: 'Acima',
    volatility: 'Alta',
  },
  RENT3: {
    name: 'Localiza ON',
    price: 45.8,
    trend: 'Lateral',
    volume: 'Normal',
    volatility: 'Media',
  },
};

// Setups por ativo
const setupsDatabase: Record<string, Setup[]> = {
  PETR4: [
    {
      id: 'petr4-1',
      title: 'Rompimento de Resistencia',
      status: 'ATIVO',
      successRate: 72,
      risk: 'Moderado',
      stopSuggestion: 'R$ 36,80 (abaixo da media de 21 periodos)',
      targetNote: 'Alvo em R$ 42,00, proximo a maxima historica recente',
      explanation:
        'O ativo esta testando uma zona de resistencia importante. Caso rompa com volume, historicamente apresenta continuidade do movimento.',
      signals: ['Rompimento confirmado', 'Volume acima da media'],
      meta: { resistencia: 38.20, atr: 1.15 },
    },
    {
      id: 'petr4-2',
      title: 'Pullback na Media de 9',
      status: 'EM_FORMACAO',
      successRate: 65,
      risk: 'Baixo',
      stopSuggestion: 'R$ 37,20 (abaixo do candle de sinal)',
      targetNote: 'Alvo parcial em R$ 40,50, final em R$ 42,00',
      explanation:
        'Preco recuando para teste da media movel de 9 periodos em tendencia de alta. Setup comum de continuacao.',
      signals: ['Preco proximo da MM9'],
      meta: { mm9: 37.50 },
    },
  ],
  VALE3: [
    {
      id: 'vale3-1',
      title: 'Consolidacao em Suporte',
      status: 'EM_FORMACAO',
      successRate: 58,
      risk: 'Moderado',
      stopSuggestion: 'R$ 59,50 (abaixo do suporte)',
      targetNote: 'Alvo em R$ 68,00, resistencia anterior',
      explanation:
        'Ativo em consolidacao sobre regiao de suporte historico. Aguardando definicao direcional.',
      signals: ['Teste de suporte em andamento'],
      meta: { suporte: 60.00 },
    },
  ],
  ITUB4: [
    {
      id: 'itub4-1',
      title: 'Tendencia de Alta Saudavel',
      status: 'ATIVO',
      successRate: 70,
      risk: 'Baixo',
      stopSuggestion: 'R$ 30,50 (abaixo da MM21)',
      targetNote: 'Alvo em R$ 35,00, proximo nivel de resistencia',
      explanation:
        'Ativo em tendencia de alta com topos e fundos ascendentes. Volume confirmando o movimento.',
      signals: ['Tendencia de alta confirmada', 'Volume adequado'],
      meta: { mm21: 31.00 },
    },
  ],
  BBDC4: [
    {
      id: 'bbdc4-1',
      title: 'Possivel Fundo em Suporte',
      status: 'EM_FORMACAO',
      successRate: 52,
      risk: 'Alto',
      stopSuggestion: 'R$ 13,80 (abaixo do suporte critico)',
      targetNote: 'Alvo conservador em R$ 16,50',
      explanation:
        'Ativo proximo a regiao de suporte. Aguardando sinais de reversao para confirmacao.',
      signals: ['Proximo ao suporte'],
      meta: { suporte: 14.00 },
    },
  ],
  WEGE3: [
    {
      id: 'wege3-1',
      title: 'Continuacao de Tendencia',
      status: 'ATIVO',
      successRate: 75,
      risk: 'Baixo',
      stopSuggestion: 'R$ 39,00 (abaixo do ultimo fundo)',
      targetNote: 'Alvo projetado em R$ 46,00',
      explanation:
        'Empresa de qualidade em tendencia de alta consistente. Setup de continuacao bem definido.',
      signals: ['Tendencia forte', 'Padrao de continuacao'],
      meta: { ultimoFundo: 39.50 },
    },
  ],
  MGLU3: [
    {
      id: 'mglu3-1',
      title: 'Alta Volatilidade - Cautela',
      status: 'INVALIDO',
      successRate: 35,
      risk: 'Alto',
      stopSuggestion: 'Nao recomendado operar no momento',
      targetNote: 'Sem alvo definido devido a volatilidade',
      explanation:
        'Ativo em forte tendencia de baixa com volatilidade elevada. Momento de observacao.',
      signals: ['Volatilidade elevada', 'Tendencia de baixa'],
      meta: { atr: 0.35 },
    },
  ],
};

// Funcao para determinar a zona de decisao baseada no contexto
function calculateZone(context: AssetContext): DecisionZone {
  const { trend, volume, volatility } = context;

  // Zona Favoravel: tendencia de alta + volume bom + volatilidade controlada
  if (trend === 'Alta' && volume !== 'Abaixo' && volatility !== 'Alta') {
    return 'FAVORAVEL';
  }

  // Zona de Risco: tendencia de baixa + volatilidade alta ou volume fraco
  if (trend === 'Baixa' && (volatility === 'Alta' || volume === 'Abaixo')) {
    return 'RISCO';
  }

  // Zona de Risco: qualquer ativo com volatilidade alta
  if (volatility === 'Alta') {
    return 'RISCO';
  }

  return 'NEUTRA';
}

// Mensagens por zona
function getZoneMessage(zone: DecisionZone): string {
  const messages: Record<DecisionZone, string[]> = {
    FAVORAVEL: [
      'O contexto atual apresenta caracteristicas favoraveis. Tendencia alinhada com volume adequado.',
      'Condicoes de mercado parecem propicias. Importante manter disciplina no gerenciamento de risco.',
      'Indicadores apontam momento potencialmente oportuno. Avalie os setups disponiveis.',
    ],
    NEUTRA: [
      'Mercado em consolidacao. Aguardar definicao pode ser prudente.',
      'Contexto sem direcao clara. Momento de observacao e planejamento.',
      'Sinais mistos no momento. Considere reduzir exposicao ate melhor definicao.',
    ],
    RISCO: [
      'Cautela recomendada. Volatilidade elevada ou tendencia contraria.',
      'Momento desfavoravel para novas posicoes. Priorize protecao do capital.',
      'Indicadores sugerem aumento de risco. Avalie posicoes existentes.',
    ],
  };

  const options = messages[zone];
  return options[Math.floor(Math.random() * options.length)];
}

// ==================== FUNCOES EXPORTADAS ====================

export function getAssetSummary(ticker: string): AssetSummary | null {
  const normalized = ticker.toUpperCase().trim();
  const asset = assetDatabase[normalized];

  if (!asset) return null;

  return {
    ticker: normalized,
    name: asset.name,
    price: asset.price,
    updatedAt: new Date().toISOString(),
  };
}

export function getAssetContext(ticker: string): AssetContext | null {
  const normalized = ticker.toUpperCase().trim();
  const asset = assetDatabase[normalized];

  if (!asset) return null;

  return {
    trend: asset.trend,
    volume: asset.volume,
    volatility: asset.volatility,
  };
}

export function getDecisionZone(ticker: string): DecisionZoneResult | null {
  const normalized = ticker.toUpperCase().trim();
  const context = getAssetContext(normalized);

  if (!context) return null;

  const zone = calculateZone(context);
  const message = getZoneMessage(zone);

  return { zone, message, reasons: [] };
}

export function getSetups(ticker: string): Setup[] {
  const normalized = ticker.toUpperCase().trim();
  return setupsDatabase[normalized] || [];
}

export function getWatchlist(): WatchlistItem[] {
  return [
    { ticker: 'PETR4', name: 'Petrobras PN', zone: 'FAVORAVEL' },
    { ticker: 'VALE3', name: 'Vale ON', zone: 'NEUTRA' },
    { ticker: 'ITUB4', name: 'Itau Unibanco PN', zone: 'FAVORAVEL' },
    { ticker: 'WEGE3', name: 'WEG ON', zone: 'FAVORAVEL' },
    { ticker: 'MGLU3', name: 'Magazine Luiza ON', zone: 'RISCO' },
  ];
}

export function getAlerts(): Alert[] {
  const now = new Date();

  return [
    {
      id: 'alert-1',
      ticker: 'PETR4',
      title: 'Setup "Rompimento de Resistencia" atingiu zona de entrada',
      createdAt: new Date(now.getTime() - 15 * 60 * 1000), // 15 min atras
    },
    {
      id: 'alert-2',
      ticker: 'WEGE3',
      title: 'Volume acima da media detectado',
      createdAt: new Date(now.getTime() - 45 * 60 * 1000), // 45 min atras
    },
    {
      id: 'alert-3',
      ticker: 'ITUB4',
      title: 'Zona de decisao alterada para FAVORAVEL',
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2h atras
    },
    {
      id: 'alert-4',
      ticker: 'MGLU3',
      title: 'Volatilidade elevada - cautela recomendada',
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4h atras
    },
  ];
}

export function getHistory(): HistoryEvent[] {
  const now = new Date();

  return [
    {
      id: 'hist-1',
      ticker: 'PETR4',
      event: 'Setup "Pullback na MM9" concluido',
      date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 dias atras
      outcomeNote: 'Alvo parcial atingido em R$ 39,50',
    },
    {
      id: 'hist-2',
      ticker: 'VALE3',
      event: 'Zona de decisao alterada de FAVORAVEL para NEUTRA',
      date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 dias atras
    },
    {
      id: 'hist-3',
      ticker: 'BBDC4',
      event: 'Setup invalidado por rompimento de suporte',
      date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 dias atras
      outcomeNote: 'Preco rompeu R$ 15,00 para baixo',
    },
    {
      id: 'hist-4',
      ticker: 'ITUB4',
      event: 'Novo setup identificado: Tendencia de Alta',
      date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 dias atras
    },
    {
      id: 'hist-5',
      ticker: 'WEGE3',
      event: 'Alvo final do setup atingido',
      date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 dias atras
      outcomeNote: 'Movimento de +12% desde a entrada',
    },
  ];
}
