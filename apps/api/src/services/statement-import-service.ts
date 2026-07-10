import type OpenAI from 'openai';
import { openai, OPENAI_MODEL } from '../lib/openai.js';
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
}

const MAX_TEXT_CHARS = 150_000;

const EXTRACTION_SCHEMA = {
  name: 'statement_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
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
                'NORMAL para transacao comum; TRANSFERENCIA_INTERNA quando o dinheiro foi movido entre contas do proprio usuario; PAGAMENTO_FATURA quando a linha e pagamento de fatura de cartao de credito',
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
    required: ['transactions'],
  },
} as const;

function buildSystemPrompt(context: ParseStatementContext, target: StatementTarget): string {
  const categoryList = context.categories
    .map((c, i) => `[${i}] ${c.name} (${c.type})`)
    .join('\n');

  const accountList = context.accounts
    .map((a, i) => `[${i}] ${a.name}${a.bank?.name ? ` (${a.bank.name})` : ''}`)
    .join('\n');

  const cardList = context.creditCards
    .map((c, i) => `[${i}] ${c.name} (${c.brand})`)
    .join('\n');

  const targetRules =
    target === 'credit_card'
      ? `O arquivo e uma FATURA DE CARTAO DE CREDITO:
- Extraia apenas as compras/despesas (type sempre DESPESA, line_kind sempre NORMAL)
- IGNORE linhas de pagamento de fatura ("pagamento recebido", "pgto debito automatico", etc.)
- IGNORE estornos/creditos na fatura
- Compras parceladas: extraia apenas a parcela presente na fatura e anote em notes (ex: "Parcela 3/10")`
      : `O arquivo e um EXTRATO DE CONTA BANCARIA:
- Creditos/entradas = RECEITA, debitos/saidas = DESPESA
- IGNORE linhas de saldo (saldo anterior, saldo do dia, saldo disponivel)
- IGNORE aplicacoes/resgates automaticos de rendimento da propria conta (ex: "aplicacao RDB automatica")
- Pagamento de fatura de cartao, PIX, TED, boletos e compras no debito DEVEM ser extraidos

CLASSIFICACAO DA LINHA (line_kind):
- TRANSFERENCIA_INTERNA: PIX/TED/DOC/transferencia em que a contraparte e claramente uma das CONTAS DO USUARIO listadas abaixo (mesmo titular movendo dinheiro entre as proprias contas). Preencha transfer_account_index com o indice da conta contraparte, ou null se identificar que e transferencia propria mas nao souber qual conta
- PAGAMENTO_FATURA: pagamento de fatura de cartao de credito ("PGTO FATURA", "pagamento cartao", debito automatico de fatura). Preencha payment_card_index com o indice do cartao, ou null se nao souber qual
- NORMAL: todo o resto (compras, salario, PIX para terceiros, boletos, etc.)
- Na duvida entre NORMAL e os outros tipos, use NORMAL`;

  return `Voce e um extrator de transacoes financeiras do Trade Compass. Sua tarefa e ler o extrato bancario fornecido e extrair TODAS as transacoes reais em JSON estruturado.

${targetRules}

REGRAS GERAIS:
1. Extraia TODAS as transacoes reais, sem inventar nenhuma
2. amount sempre POSITIVO (o sinal e representado pelo type)
3. due_date sempre YYYY-MM-DD; se o ano nao aparecer na linha, deduza pelo contexto do extrato (periodo/cabecalho)
4. description limpa e legivel em portugues (ex: "Supermercado Zaffari" em vez de "COMPRA CARTAO DEB 3421 ZAFFARI POA")
5. Para cada transacao escolha a categoria mais adequada da lista abaixo pelo indice (category_index). Respeite o tipo: categoria RECEITA para transacoes RECEITA, categoria DESPESA para DESPESA. Se nenhuma se encaixar bem, use null
6. Nao duplique transacoes
7. Se o documento nao parecer um extrato bancario ou fatura, retorne transactions vazio

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

function mapOpenAIError(err: unknown): Error {
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

export async function parseStatement(
  input: ParseStatementInput,
  context: ParseStatementContext
): Promise<ParsedStatementTransaction[]> {
  const { categories, accounts, creditCards } = context;
  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  if (input.kind === 'text' && input.content.length > MAX_TEXT_CHARS) {
    throw new Error(
      'Arquivo muito grande. Exporte um periodo menor do extrato e tente novamente.'
    );
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

  let parsed: { transactions?: unknown };
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
    });
  }

  return result;
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

  return `Voce e um classificador de documentos financeiros do Trade Compass. Analise o documento fornecido e responda:

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
