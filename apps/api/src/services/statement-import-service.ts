import type OpenAI from 'openai';
import { openai, OPENAI_MODEL } from '../lib/openai.js';
import { isOfxContent, parseOfx, type OfxTransaction } from './ofx-parser.js';
import type {
  AccountWithBank,
  FinanceCategory,
  FinanceCreditCard,
} from '../domain/finance-types.js';

export type StatementFileKind = 'text' | 'pdf' | 'image';

export type StatementTarget = 'account' | 'credit_card';

export type StatementLineKind =
  | 'NORMAL'
  | 'TRANSFERENCIA_INTERNA'
  | 'PAGAMENTO_FATURA';

export interface ParseStatementInput {
  kind: StatementFileKind;
  filename: string;
  /** Texto puro (csv/ofx/txt) ou base64 sem prefixo data: (pdf/imagem) */
  content: string;
  mimeType?: string;
  target: StatementTarget;
  /** Conta do extrato (para excluir da sugestao de conta contraparte) */
  targetAccountId?: string;
}

export interface ParseStatementContext {
  categories: FinanceCategory[];
  accounts: AccountWithBank[];
  creditCards: FinanceCreditCard[];
  /** Nome completo do titular das contas (perfil do usuario) — usado para
   * distinguir transferencia entre contas proprias de PIX para terceiros */
  ownerName: string | null;
}

export interface ParsedStatementTransaction {
  description: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  due_date: string; // YYYY-MM-DD
  category_id: string | null;
  notes: string | null;
  /** Classificacao da linha: transacao comum, transferencia entre contas proprias ou pagamento de fatura */
  line_kind: StatementLineKind;
  /** Conta contraparte sugerida quando line_kind = TRANSFERENCIA_INTERNA */
  suggested_transfer_account_id: string | null;
  /** Cartao sugerido quando line_kind = PAGAMENTO_FATURA */
  suggested_credit_card_id: string | null;
  /** Id unico da transacao no banco de origem (so OFX) — base do dedup exato */
  fitid: string | null;
}

const MAX_TEXT_CHARS = 150_000;

const EXTRACTION_SCHEMA = {
  name: 'statement_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      invoice_month: {
        type: ['string', 'null'],
        description:
          'SOMENTE fatura de cartao: mes de referencia da fatura no formato YYYY-MM (do cabecalho/vencimento). null para extrato de conta',
      },
      invoice_previous_balance: {
        type: ['number', 'null'],
        description:
          'SOMENTE fatura de cartao: valor liquido da secao "saldo fatura anterior e pagamentos" (total da fatura anterior menos pagamentos feitos pelo cliente). NEGATIVO quando e credito que abate esta fatura; POSITIVO quando e saldo devedor carregado. null se a secao nao existir ou for zero',
      },
      transactions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            description: {
              type: 'string',
              description: 'Descricao limpa e legivel da transacao (sem codigos internos do banco)',
            },
            amount: {
              type: 'number',
              description: 'Valor absoluto da transacao, sempre positivo',
            },
            type: {
              type: 'string',
              enum: ['RECEITA', 'DESPESA'],
              description: 'RECEITA para creditos/entradas, DESPESA para debitos/saidas',
            },
            due_date: {
              type: 'string',
              description: 'Data da transacao no formato YYYY-MM-DD',
            },
            category_index: {
              type: ['integer', 'null'],
              description: 'Indice da categoria mais adequada da lista fornecida, ou null se nenhuma se encaixar',
            },
            notes: {
              type: ['string', 'null'],
              description: 'Observacao adicional relevante (ex: parcela 2/10, estabelecimento original)',
            },
            line_kind: {
              type: 'string',
              enum: ['NORMAL', 'TRANSFERENCIA_INTERNA', 'PAGAMENTO_FATURA'],
              description:
                'NORMAL para transacao comum (incluindo PIX/TED para terceiros); TRANSFERENCIA_INTERNA SOMENTE quando ha evidencia explicita de que a contraparte e o proprio titular do extrato; PAGAMENTO_FATURA quando a linha e pagamento de fatura de cartao de credito',
            },
            transfer_account_index: {
              type: ['integer', 'null'],
              description:
                'Somente para TRANSFERENCIA_INTERNA: indice da conta contraparte na lista CONTAS DO USUARIO, ou null se nao tiver certeza',
            },
            payment_card_index: {
              type: ['integer', 'null'],
              description:
                'Somente para PAGAMENTO_FATURA: indice do cartao na lista CARTOES DO USUARIO, ou null se nao tiver certeza',
            },
          },
          required: [
            'description',
            'amount',
            'type',
            'due_date',
            'category_index',
            'notes',
            'line_kind',
            'transfer_account_index',
            'payment_card_index',
          ],
        },
      },
    },
    required: ['invoice_month', 'invoice_previous_balance', 'transactions'],
  },
} as const;

function buildContextLists(context: ParseStatementContext) {
  return {
    categoryList: context.categories
      .map((c, i) => `[${i}] ${c.name} (${c.type})`)
      .join('\n'),
    accountList: context.accounts
      .map((a, i) => `[${i}] ${a.name}${a.bank?.name ? ` (${a.bank.name})` : ''}`)
      .join('\n'),
    cardList: context.creditCards
      .map((c, i) => `[${i}] ${c.name} (${c.brand})`)
      .join('\n'),
  };
}

function buildSystemPrompt(context: ParseStatementContext, target: StatementTarget): string {
  const { categoryList, accountList, cardList } = buildContextLists(context);

  const targetRules =
    target === 'credit_card'
      ? `O arquivo e uma FATURA DE CARTAO DE CREDITO:
- Extraia TODOS os lancamentos que compoem a fatura (type sempre DESPESA, line_kind sempre NORMAL):
  * compras nacionais e internacionais, uma transacao por linha de compra
  * juros e encargos cobrados na fatura (mora, encargos por atraso, IOF, multa) — cada linha vira uma transacao separada
  * mensalidade/anuidade, tarifas, seguros e "outros lancamentos" cobrados do cliente
- Compra internacional: use o valor JA CONVERTIDO em reais (linha "Conversao para Real"), nunca o valor em moeda estrangeira nem a cotacao
- NUNCA junte linhas: cada linha do documento vira no maximo uma transacao, com o valor exato daquela linha. Confira que nenhum valor extraido seja a juncao de dois valores vizinhos
- IGNORE linhas de pagamento de fatura ("pagamento recebido", "pgto debito automatico", etc.)
- IGNORE estornos/creditos e o saldo da fatura anterior
- IGNORE linhas de resumo e totais (ex: "Total de compras e despesas", "Total do cartao", "Total a pagar", "Pagamento minimo", limites do cartao)
- Compras parceladas: extraia apenas a parcela presente na fatura e anote em notes (ex: "Parcela 3/10")
- Preencha invoice_month com o mes de referencia da fatura (YYYY-MM), lido do cabecalho ou do vencimento
- Preencha invoice_previous_balance com o valor liquido da secao "saldo fatura anterior e pagamentos" (total da fatura anterior MENOS pagamentos feitos pelo cliente). Ex: fatura anterior 399,70 e pagamentos de 526,70 => -127,00 (credito). Use null se a fatura nao tiver essa secao ou o valor for zero. Esse valor NAO vira transacao — apenas o campo`
      : `O arquivo e um EXTRATO DE CONTA BANCARIA (invoice_month e invoice_previous_balance devem ser null):
- Creditos/entradas = RECEITA, debitos/saidas = DESPESA
- IGNORE linhas de saldo (saldo anterior, saldo do dia, saldo disponivel)
- IGNORE aplicacoes/resgates automaticos de rendimento da propria conta (ex: "aplicacao RDB automatica")
- Pagamento de fatura de cartao, PIX, TED, boletos e compras no debito DEVEM ser extraidos

CLASSIFICACAO DA LINHA (line_kind):
- TRANSFERENCIA_INTERNA: SOMENTE quando ha evidencia explicita de que a transferencia (PIX/TED/DOC) e entre contas do MESMO titular. Evidencias aceitas:
  * o nome da contraparte que aparece na linha e o proprio TITULAR DO EXTRATO (abaixo); ou
  * a linha diz explicitamente que e movimentacao entre contas proprias (ex: "transferencia entre contas", "mesma titularidade")
  Nesses casos preencha transfer_account_index com o indice da conta contraparte, ou null se nao souber qual conta
- PIX/TED/DOC para OUTRA pessoa ou empresa (nome da contraparte diferente do titular) NUNCA e TRANSFERENCIA_INTERNA: classifique como NORMAL e escolha a categoria mais adequada (se o usuario tiver uma categoria de transferencia/PIX, use-a)
- Se a linha NAO mostra o nome da contraparte, use NORMAL. NAO deduza transferencia interna so porque a linha parece uma transferencia
- PAGAMENTO_FATURA: pagamento de fatura de cartao de credito ("PGTO FATURA", "pagamento cartao", debito automatico de fatura). Preencha payment_card_index com o indice do cartao, ou null se nao souber qual
- NORMAL: todo o resto (compras, salario, PIX para terceiros, boletos, etc.)
- Na duvida entre NORMAL e os outros tipos, use NORMAL`;

  const ownerSection = context.ownerName
    ? `TITULAR DO EXTRATO (dono das contas):
${context.ownerName}
Compare o nome da contraparte de cada transferencia com este nome (ignore diferencas de caixa, acentos e abreviacoes). So e transferencia interna se for a MESMA pessoa.`
    : `TITULAR DO EXTRATO (dono das contas):
(nao informado)
Sem o nome do titular, so classifique TRANSFERENCIA_INTERNA quando a linha disser explicitamente que e movimentacao entre contas proprias.`;

  return `Voce e um extrator de transacoes financeiras do Money Compass. Sua tarefa e ler o extrato bancario fornecido e extrair TODAS as transacoes reais em JSON estruturado.

${targetRules}

REGRAS GERAIS:
1. Extraia TODAS as transacoes reais, sem inventar nenhuma
2. amount sempre POSITIVO (o sinal e representado pelo type)
3. due_date sempre YYYY-MM-DD; se o ano nao aparecer na linha, deduza pelo contexto do extrato (periodo/cabecalho)
4. description limpa e legivel em portugues (ex: "Supermercado Zaffari" em vez de "COMPRA CARTAO DEB 3421 ZAFFARI POA")
5. Para cada transacao escolha a categoria mais adequada da lista abaixo pelo indice (category_index). Respeite o tipo: categoria RECEITA para transacoes RECEITA, categoria DESPESA para DESPESA. Se nenhuma se encaixar bem, use null
6. Nao duplique transacoes
7. Se o documento nao parecer um extrato bancario ou fatura, retorne transactions vazio

${ownerSection}

CATEGORIAS DISPONIVEIS DO USUARIO:
${categoryList || '(nenhuma categoria cadastrada)'}

CONTAS DO USUARIO:
${accountList || '(nenhuma conta cadastrada)'}

CARTOES DO USUARIO:
${cardList || '(nenhum cartao cadastrado)'}`;
}

export function buildUserContent(
  input: Pick<ParseStatementInput, 'kind' | 'filename' | 'content' | 'mimeType'>,
  instruction?: string
): OpenAI.Chat.Completions.ChatCompletionContentPart[] {
  if (input.kind === 'text') {
    return [
      {
        type: 'text',
        text: `Arquivo: ${input.filename}\n\nConteudo do extrato:\n\n${input.content}`,
      },
    ];
  }

  if (input.kind === 'pdf') {
    return [
      {
        type: 'text',
        text:
          instruction ??
          `Extraia as transacoes do extrato em PDF anexo (arquivo: ${input.filename}).`,
      },
      {
        type: 'file',
        file: {
          filename: input.filename,
          file_data: `data:application/pdf;base64,${input.content}`,
        },
      },
    ];
  }

  // image
  return [
    {
      type: 'text',
      text:
        instruction ??
        `Extraia as transacoes do extrato na imagem anexa (arquivo: ${input.filename}).`,
    },
    {
      type: 'image_url',
      image_url: {
        url: `data:${input.mimeType || 'image/png'};base64,${input.content}`,
        detail: 'high',
      },
    },
  ];
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime());
}

export function mapOpenAIError(err: unknown): Error {
  const apiError = err as { status?: number; code?: string; message?: string };
  if (apiError.status === 429 || apiError.code === 'insufficient_quota') {
    return new Error(
      'A conta OpenAI esta sem creditos de API. Adicione creditos em platform.openai.com/settings/organization/billing e tente novamente.'
    );
  }
  if (apiError.status === 401) {
    return new Error('Chave da OpenAI invalida. Verifique a variavel OPENAI_API_KEY.');
  }
  return new Error(
    `Erro ao chamar a IA: ${apiError.message || 'erro desconhecido'}. Tente novamente.`
  );
}

export interface ParseStatementResult {
  transactions: ParsedStatementTransaction[];
  /** Mes de referencia da fatura (YYYY-MM) — so para fatura de cartao */
  invoice_month: string | null;
  /** Saldo liquido "fatura anterior e pagamentos" (negativo = credito) — so fatura */
  invoice_previous_balance: number | null;
}

export async function parseStatement(
  input: ParseStatementInput,
  context: ParseStatementContext
): Promise<ParseStatementResult> {
  const { categories, accounts, creditCards } = context;

  if (input.kind === 'text' && input.content.length > MAX_TEXT_CHARS) {
    throw new Error(
      'Arquivo muito grande. Exporte um periodo menor do extrato e tente novamente.'
    );
  }

  // OFX: valores, datas, sinais e FITIDs saem do parser deterministico;
  // a IA fica so com descricao, categoria e classificacao da linha
  if (input.kind === 'text' && isOfxContent(input.content)) {
    const ofx = parseOfx(input.content);
    if (ofx && ofx.transactions.length > 0) {
      return {
        transactions: await enrichOfxTransactions(ofx.transactions, input, context),
        invoice_month: null,
        invoice_previous_balance: null,
      };
    }
  }

  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(context, input.target) },
        { role: 'user', content: buildUserContent(input) },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: EXTRACTION_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
      },
      max_tokens: 16_000,
      temperature: 0,
    });
  } catch (err) {
    throw mapOpenAIError(err);
  }

  const choice = response.choices[0];
  const raw = choice?.message?.content;
  if (!raw) {
    throw new Error('A IA nao retornou resposta. Tente novamente.');
  }
  if (choice.finish_reason === 'length') {
    throw new Error(
      'O extrato e muito extenso para processar de uma vez. Exporte um periodo menor e tente novamente.'
    );
  }

  let parsed: {
    transactions?: unknown;
    invoice_month?: unknown;
    invoice_previous_balance?: unknown;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('A IA retornou uma resposta invalida. Tente novamente.');
  }

  const items = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const result: ParsedStatementTransaction[] = [];

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const tx = item as Record<string, unknown>;

    const description = typeof tx.description === 'string' ? tx.description.trim() : '';
    const amount = typeof tx.amount === 'number' ? Math.abs(tx.amount) : NaN;
    const type = tx.type === 'RECEITA' || tx.type === 'DESPESA' ? tx.type : null;
    const dueDate = typeof tx.due_date === 'string' ? tx.due_date : '';

    if (!description || !Number.isFinite(amount) || amount <= 0 || !type || !isValidDate(dueDate)) {
      continue;
    }

    // Fatura de cartao so aceita despesas
    if (input.target === 'credit_card' && type !== 'DESPESA') continue;

    const categoryIndex =
      typeof tx.category_index === 'number' && Number.isInteger(tx.category_index)
        ? tx.category_index
        : null;
    const category =
      categoryIndex !== null && categoryIndex >= 0 && categoryIndex < categories.length
        ? categories[categoryIndex]
        : null;

    // Classificacao da linha (so faz sentido para extrato de conta)
    let lineKind: StatementLineKind = 'NORMAL';
    if (
      input.target === 'account' &&
      (tx.line_kind === 'TRANSFERENCIA_INTERNA' || tx.line_kind === 'PAGAMENTO_FATURA')
    ) {
      lineKind = tx.line_kind;
    }

    // Conta contraparte sugerida (nunca a propria conta do extrato)
    let suggestedTransferAccountId: string | null = null;
    if (lineKind === 'TRANSFERENCIA_INTERNA') {
      const accountIndex =
        typeof tx.transfer_account_index === 'number' && Number.isInteger(tx.transfer_account_index)
          ? tx.transfer_account_index
          : null;
      const account =
        accountIndex !== null && accountIndex >= 0 && accountIndex < accounts.length
          ? accounts[accountIndex]
          : null;
      if (account && account.id !== input.targetAccountId) {
        suggestedTransferAccountId = account.id;
      }
    }

    // Cartao sugerido para pagamento de fatura
    let suggestedCreditCardId: string | null = null;
    if (lineKind === 'PAGAMENTO_FATURA') {
      const cardIndex =
        typeof tx.payment_card_index === 'number' && Number.isInteger(tx.payment_card_index)
          ? tx.payment_card_index
          : null;
      const card =
        cardIndex !== null && cardIndex >= 0 && cardIndex < creditCards.length
          ? creditCards[cardIndex]
          : null;
      if (card) {
        suggestedCreditCardId = card.id;
      }
    }

    result.push({
      description,
      amount: Math.round(amount * 100) / 100,
      type,
      due_date: dueDate,
      // Categoria precisa ser compativel com o tipo da transacao
      category_id: category && category.type === type ? category.id : null,
      notes: typeof tx.notes === 'string' && tx.notes.trim() ? tx.notes.trim() : null,
      line_kind: lineKind,
      suggested_transfer_account_id: suggestedTransferAccountId,
      suggested_credit_card_id: suggestedCreditCardId,
      fitid: null,
    });
  }

  // Campos exclusivos de fatura de cartao, validados antes de repassar
  const invoiceMonth =
    input.target === 'credit_card' &&
    typeof parsed.invoice_month === 'string' &&
    /^\d{4}-\d{2}$/.test(parsed.invoice_month)
      ? parsed.invoice_month
      : null;
  const invoicePreviousBalance =
    input.target === 'credit_card' &&
    typeof parsed.invoice_previous_balance === 'number' &&
    Number.isFinite(parsed.invoice_previous_balance) &&
    parsed.invoice_previous_balance !== 0
      ? Math.round(parsed.invoice_previous_balance * 100) / 100
      : null;

  return {
    transactions: result,
    invoice_month: invoiceMonth,
    invoice_previous_balance: invoicePreviousBalance,
  };
}

// ============================================================================
// ENRIQUECIMENTO DE OFX (parser deterministico + IA so para semantica)
// ============================================================================

/** Itens por chamada de enriquecimento (mantem a resposta longe do teto de tokens) */
const ENRICH_CHUNK_SIZE = 150;

interface EnrichedLine {
  description: string;
  category_index: number | null;
  notes: string | null;
  line_kind: StatementLineKind;
  transfer_account_index: number | null;
  payment_card_index: number | null;
}

const ENRICHMENT_SCHEMA = {
  name: 'statement_enrichment',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            index: {
              type: 'integer',
              description: 'Indice da transacao na lista fornecida (obrigatorio, sem pular nenhuma)',
            },
            description: {
              type: 'string',
              description: 'Descricao limpa e legivel em portugues (sem codigos internos do banco)',
            },
            category_index: {
              type: ['integer', 'null'],
              description: 'Indice da categoria mais adequada da lista fornecida, ou null',
            },
            notes: {
              type: ['string', 'null'],
              description: 'Observacao relevante (ex: parcela 2/10), ou null',
            },
            line_kind: {
              type: 'string',
              enum: ['NORMAL', 'TRANSFERENCIA_INTERNA', 'PAGAMENTO_FATURA'],
              description: 'Mesmas regras de classificacao do extrato',
            },
            transfer_account_index: {
              type: ['integer', 'null'],
              description: 'Somente TRANSFERENCIA_INTERNA: indice da conta contraparte, ou null',
            },
            payment_card_index: {
              type: ['integer', 'null'],
              description: 'Somente PAGAMENTO_FATURA: indice do cartao, ou null',
            },
          },
          required: [
            'index',
            'description',
            'category_index',
            'notes',
            'line_kind',
            'transfer_account_index',
            'payment_card_index',
          ],
        },
      },
    },
    required: ['items'],
  },
} as const;

function buildEnrichmentPrompt(
  context: ParseStatementContext,
  target: StatementTarget
): string {
  const { categoryList, accountList, cardList } = buildContextLists(context);

  const classificationRules =
    target === 'credit_card'
      ? `As linhas vem de uma FATURA DE CARTAO DE CREDITO: use sempre line_kind NORMAL.`
      : `CLASSIFICACAO DA LINHA (line_kind), mesmas regras do extrato:
- TRANSFERENCIA_INTERNA: SOMENTE com evidencia explicita de que a contraparte e o proprio titular (nome igual ao titular abaixo, ou a linha diz "entre contas proprias"/"mesma titularidade"). Preencha transfer_account_index ou null.
- PIX/TED/DOC para OUTRA pessoa ou empresa NUNCA e TRANSFERENCIA_INTERNA: use NORMAL.
- PAGAMENTO_FATURA: pagamento de fatura de cartao de credito. Preencha payment_card_index ou null.
- NORMAL: todo o resto. Na duvida, NORMAL.`;

  const ownerSection = context.ownerName
    ? `TITULAR DO EXTRATO (dono das contas):\n${context.ownerName}`
    : `TITULAR DO EXTRATO (dono das contas):\n(nao informado — so classifique TRANSFERENCIA_INTERNA quando a linha disser explicitamente que e entre contas proprias)`;

  return `Voce e um enriquecedor de transacoes do Money Compass. As transacoes abaixo ja foram extraidas de um arquivo OFX: DATA, TIPO e VALOR sao definitivos e NAO devem ser alterados. Sua tarefa, para CADA linha (todas, na ordem, usando o indice fornecido):

1. description: reescreva o texto bruto do banco como uma descricao limpa e legivel em portugues (ex: "COMPRA CARTAO DEB 3421 ZAFFARI POA" -> "Supermercado Zaffari"). Nao invente informacao que nao esteja no texto.
2. category_index: escolha a categoria mais adequada da lista (respeite o tipo: categoria RECEITA para linhas RECEITA, DESPESA para DESPESA), ou null.
3. notes: observacao util (ex: "Parcela 3/10"), ou null.
4. line_kind conforme as regras abaixo.

${classificationRules}

${ownerSection}

CATEGORIAS DISPONIVEIS DO USUARIO:
${categoryList || '(nenhuma categoria cadastrada)'}

CONTAS DO USUARIO:
${accountList || '(nenhuma conta cadastrada)'}

CARTOES DO USUARIO:
${cardList || '(nenhum cartao cadastrado)'}`;
}

/** Converte uma linha OFX sem enriquecimento (fallback quando a IA falha) */
function plainOfxTransaction(tx: OfxTransaction): ParsedStatementTransaction {
  return {
    description: tx.memo || 'Transacao importada',
    amount: tx.amount,
    type: tx.type,
    due_date: tx.date,
    category_id: null,
    notes: null,
    line_kind: 'NORMAL',
    suggested_transfer_account_id: null,
    suggested_credit_card_id: null,
    fitid: tx.fitid,
  };
}

/**
 * Monta as transacoes finais a partir do OFX deterministico + enriquecimento
 * da IA (descricao/categoria/classificacao). Se a IA falhar em um lote, as
 * linhas daquele lote entram sem enriquecimento — nunca se perde transacao.
 */
async function enrichOfxTransactions(
  ofxTransactions: OfxTransaction[],
  input: ParseStatementInput,
  context: ParseStatementContext
): Promise<ParsedStatementTransaction[]> {
  const { categories, accounts, creditCards } = context;
  const target = input.target;

  // Fatura de cartao: so despesas (estornos/pagamentos ficam de fora),
  // mesma regra do caminho via IA
  const transactions =
    target === 'credit_card'
      ? ofxTransactions.filter((tx) => tx.type === 'DESPESA')
      : ofxTransactions;

  const enrichedByIndex = new Map<number, EnrichedLine>();

  if (openai) {
    const systemPrompt = buildEnrichmentPrompt(context, target);

    for (let start = 0; start < transactions.length; start += ENRICH_CHUNK_SIZE) {
      const chunk = transactions.slice(start, start + ENRICH_CHUNK_SIZE);
      const lines = chunk
        .map(
          (tx, i) =>
            `[${start + i}] ${tx.date} | ${tx.type} | ${tx.amount.toFixed(2)} | ${tx.memo || '(sem descricao)'}`
        )
        .join('\n');

      try {
        const response = await openai.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Enriqueca as transacoes abaixo (arquivo: ${input.filename}):\n\n${lines}`,
            },
          ],
          response_format: {
            type: 'json_schema',
            json_schema:
              ENRICHMENT_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
          },
          max_tokens: 16_000,
          temperature: 0,
        });

        const raw = response.choices[0]?.message?.content;
        if (!raw || response.choices[0]?.finish_reason === 'length') continue;

        const parsed = JSON.parse(raw) as { items?: unknown };
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const line = item as Record<string, unknown>;
          const index =
            typeof line.index === 'number' && Number.isInteger(line.index)
              ? line.index
              : null;
          if (index === null || index < start || index >= start + chunk.length) continue;

          enrichedByIndex.set(index, {
            description:
              typeof line.description === 'string' && line.description.trim()
                ? line.description.trim()
                : '',
            category_index:
              typeof line.category_index === 'number' &&
              Number.isInteger(line.category_index)
                ? line.category_index
                : null,
            notes:
              typeof line.notes === 'string' && line.notes.trim()
                ? line.notes.trim()
                : null,
            line_kind:
              line.line_kind === 'TRANSFERENCIA_INTERNA' ||
              line.line_kind === 'PAGAMENTO_FATURA'
                ? line.line_kind
                : 'NORMAL',
            transfer_account_index:
              typeof line.transfer_account_index === 'number' &&
              Number.isInteger(line.transfer_account_index)
                ? line.transfer_account_index
                : null,
            payment_card_index:
              typeof line.payment_card_index === 'number' &&
              Number.isInteger(line.payment_card_index)
                ? line.payment_card_index
                : null,
          });
        }
      } catch {
        // Lote sem enriquecimento: as linhas entram com o memo bruto
      }
    }
  }

  return transactions.map((tx, index) => {
    const enriched = enrichedByIndex.get(index);
    if (!enriched) return plainOfxTransaction(tx);

    const category =
      enriched.category_index !== null &&
      enriched.category_index >= 0 &&
      enriched.category_index < categories.length
        ? categories[enriched.category_index]
        : null;

    // Classificacao so vale para extrato de conta (mesma regra do caminho IA)
    let lineKind: StatementLineKind = 'NORMAL';
    if (
      target === 'account' &&
      (enriched.line_kind === 'TRANSFERENCIA_INTERNA' ||
        enriched.line_kind === 'PAGAMENTO_FATURA')
    ) {
      lineKind = enriched.line_kind;
    }

    let suggestedTransferAccountId: string | null = null;
    if (lineKind === 'TRANSFERENCIA_INTERNA' && enriched.transfer_account_index !== null) {
      const account =
        enriched.transfer_account_index >= 0 &&
        enriched.transfer_account_index < accounts.length
          ? accounts[enriched.transfer_account_index]
          : null;
      if (account && account.id !== input.targetAccountId) {
        suggestedTransferAccountId = account.id;
      }
    }

    let suggestedCreditCardId: string | null = null;
    if (lineKind === 'PAGAMENTO_FATURA' && enriched.payment_card_index !== null) {
      const card =
        enriched.payment_card_index >= 0 &&
        enriched.payment_card_index < creditCards.length
          ? creditCards[enriched.payment_card_index]
          : null;
      if (card) suggestedCreditCardId = card.id;
    }

    return {
      description: enriched.description || tx.memo || 'Transacao importada',
      amount: tx.amount,
      type: tx.type,
      due_date: tx.date,
      category_id: category && category.type === tx.type ? category.id : null,
      notes: enriched.notes,
      line_kind: lineKind,
      suggested_transfer_account_id: suggestedTransferAccountId,
      suggested_credit_card_id: suggestedCreditCardId,
      fitid: tx.fitid,
    };
  });
}

// ============================================================================
// DETECCAO DE CONTA (importacao multi-arquivo)
// ============================================================================

export type DetectedDocumentKind = 'ACCOUNT_STATEMENT' | 'CREDIT_CARD_INVOICE' | 'OTHER';

export interface DetectAccountInput {
  kind: StatementFileKind;
  filename: string;
  /** Texto puro (csv/ofx/txt) ou base64 sem prefixo data: (pdf/imagem) */
  content: string;
  mimeType?: string;
}

export interface DetectAccountResult {
  documentKind: DetectedDocumentKind;
  /** Indice na lista de contas fornecida, ou null se nao identificou */
  detectedAccountIndex: number | null;
  /** Nome do banco lido no documento (para exibir quando nao casou com nenhuma conta) */
  bankName: string | null;
}

/** Para deteccao basta o cabecalho do arquivo — trunca texto para reduzir custo */
const DETECT_TEXT_CHARS = 5_000;

const DETECTION_SCHEMA = {
  name: 'statement_detection',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      document_kind: {
        type: 'string',
        enum: ['ACCOUNT_STATEMENT', 'CREDIT_CARD_INVOICE', 'OTHER'],
        description:
          'ACCOUNT_STATEMENT para extrato de conta bancaria; CREDIT_CARD_INVOICE para fatura de cartao de credito; OTHER se nao for nenhum dos dois',
      },
      detected_account_index: {
        type: ['integer', 'null'],
        description:
          'Indice da conta do usuario a que o documento pertence (lista CONTAS DO USUARIO), ou null se nao tiver certeza',
      },
      bank_name: {
        type: ['string', 'null'],
        description: 'Nome do banco/instituicao identificado no documento, ou null',
      },
    },
    required: ['document_kind', 'detected_account_index', 'bank_name'],
  },
} as const;

function buildDetectPrompt(accounts: AccountWithBank[]): string {
  const accountList = accounts
    .map((a, i) => `[${i}] ${a.name}${a.bank?.name ? ` (${a.bank.name})` : ''}`)
    .join('\n');

  return `Voce e um classificador de documentos financeiros do Money Compass. Analise o documento fornecido e responda:

1. document_kind: e um EXTRATO DE CONTA BANCARIA (ACCOUNT_STATEMENT), uma FATURA DE CARTAO DE CREDITO (CREDIT_CARD_INVOICE) ou outro tipo de documento (OTHER)?
   - Fatura de cartao: tem "fatura", data de vencimento da fatura, limite do cartao, lista de compras no credito
   - Extrato de conta: movimentacoes de entrada/saida, saldo, PIX/TED/debitos

2. detected_account_index: identifique pelo cabecalho, logotipo, nome do banco ou dados do titular a qual das contas do usuario abaixo o documento pertence. Use o indice da lista. Se nenhuma corresponder claramente, use null. NAO chute.

3. bank_name: o nome do banco/instituicao que aparece no documento (ex: "Nubank", "Itau", "Banco do Brasil"), ou null se nao aparecer.

CONTAS DO USUARIO:
${accountList || '(nenhuma conta cadastrada)'}`;
}

/**
 * Identifica de qual conta do usuario e o extrato e classifica o tipo de documento.
 * Chamada leve (max_tokens baixo; texto truncado ao cabecalho).
 */
export async function detectStatementAccount(
  input: DetectAccountInput,
  accounts: AccountWithBank[]
): Promise<DetectAccountResult> {
  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  const content =
    input.kind === 'text' ? input.content.slice(0, DETECT_TEXT_CHARS) : input.content;

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: buildDetectPrompt(accounts) },
        {
          role: 'user',
          content: buildUserContent(
            { ...input, content },
            `Classifique o documento anexo (arquivo: ${input.filename}) e identifique a conta do usuario.`
          ),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: DETECTION_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
      },
      max_tokens: 300,
      temperature: 0,
    });
  } catch (err) {
    throw mapOpenAIError(err);
  }

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('A IA nao retornou resposta. Tente novamente.');
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('A IA retornou uma resposta invalida. Tente novamente.');
  }

  const documentKind: DetectedDocumentKind =
    parsed.document_kind === 'ACCOUNT_STATEMENT' ||
    parsed.document_kind === 'CREDIT_CARD_INVOICE' ||
    parsed.document_kind === 'OTHER'
      ? parsed.document_kind
      : 'OTHER';

  const rawIndex = parsed.detected_account_index;
  const detectedAccountIndex =
    typeof rawIndex === 'number' &&
    Number.isInteger(rawIndex) &&
    rawIndex >= 0 &&
    rawIndex < accounts.length
      ? rawIndex
      : null;

  const bankName =
    typeof parsed.bank_name === 'string' && parsed.bank_name.trim()
      ? parsed.bank_name.trim()
      : null;

  return { documentKind, detectedAccountIndex, bankName };
}
