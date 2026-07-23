import type OpenAI from 'openai';
import { openai, OPENAI_MODEL } from '../lib/openai.js';
import type { CreditCardBrand } from '../domain/finance-types.js';
import { buildUserContent, mapOpenAIError } from './statement-import-service.js';

// Extração dos dados DO CARTÃO a partir de uma fatura (PDF/imagem). As
// transações da fatura ficam de fora de propósito: elas entram pelo fluxo de
// importação de extrato (/finance/import), que já cuida de categorias e dedup.

export interface ExtractCardInput {
  kind: 'pdf' | 'image';
  filename: string;
  /** Base64 sem prefixo data: */
  content: string;
  mimeType?: string;
}

export interface ExtractedCreditCard {
  name: string;
  brand: CreditCardBrand;
  /** Limite total em reais; null quando a fatura não informa */
  total_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  /** Emissor (banco) identificado, para a identidade visual no app */
  bank_name: string | null;
}

export interface CreditCardExtractionResult {
  found: boolean;
  /** Resposta curta em PT-BR: o que foi identificado ou o que faltou */
  message: string;
  card: ExtractedCreditCard | null;
}

const BRANDS: CreditCardBrand[] = [
  'VISA',
  'MASTERCARD',
  'ELO',
  'AMEX',
  'HIPERCARD',
  'OUTROS',
];

const EXTRACTION_SCHEMA = {
  name: 'credit_card_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      found: {
        type: 'boolean',
        description: 'true se o documento e uma fatura de cartao de credito',
      },
      message: {
        type: 'string',
        description:
          'Resposta curta em portugues ao usuario: o que foi identificado ou o que faltou',
      },
      name: {
        type: 'string',
        description:
          'Nome do cartao como o usuario o reconheceria (ex: "Nubank Ultravioleta", "Itaú Personnalité Visa Infinite"). Emissor + variante quando disponiveis',
      },
      brand: {
        type: 'string',
        enum: BRANDS,
        description: 'Bandeira do cartao; OUTROS se nao identificada',
      },
      total_limit: {
        type: ['number', 'null'],
        description:
          'Limite TOTAL do cartao em reais (nao o limite disponivel), null se a fatura nao informar',
      },
      closing_day: {
        type: ['integer', 'null'],
        description:
          'Dia do mes (1-31) do fechamento da fatura, extraido da data de fechamento; null se nao informado',
      },
      due_day: {
        type: ['integer', 'null'],
        description:
          'Dia do mes (1-31) do vencimento da fatura, extraido da data de vencimento; null se nao informado',
      },
      bank_name: {
        type: ['string', 'null'],
        description: 'Nome do banco/emissor do cartao (ex: "Nubank", "Itau"), null se nao identificado',
      },
    },
    required: ['found', 'message', 'name', 'brand', 'total_limit', 'closing_day', 'due_day', 'bank_name'],
  },
} as const;

const SYSTEM_PROMPT = `Voce e um extrator de dados de faturas de cartao de credito brasileiras do Money Compass. Sua tarefa e identificar os dados DO CARTAO (nao as transacoes) no documento fornecido.

REGRAS:
1. Extraia apenas o que estiver no documento, sem inventar nada. Campo nao encontrado fica null.
2. name: como o usuario reconheceria o cartao — emissor + variante (ex: "Nubank Ultravioleta", "Santander SX Visa"). Nunca inclua numero do cartao.
3. brand: a bandeira impressa na fatura (Visa, Mastercard, Elo, American Express = AMEX, Hipercard). Use OUTROS se nao aparecer.
4. total_limit: o limite TOTAL do cartao em reais. NAO confunda com limite disponivel, valor da fatura ou credito em conta. Se a fatura mostrar apenas o limite disponivel, deixe null.
5. closing_day / due_day: o DIA do mes das datas de fechamento e vencimento da fatura (ex: vencimento 12/08/2025 -> due_day = 12).
6. Se o documento nao for uma fatura de cartao de credito, retorne found=false e explique em message.
7. message: curta e amigavel, em portugues do Brasil, resumindo o que foi identificado ou o que faltou.`;

function clampDay(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  return value >= 1 && value <= 31 ? value : null;
}

export async function extractCreditCardFromInvoice(
  input: ExtractCardInput
): Promise<CreditCardExtractionResult> {
  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: buildUserContent(
            input,
            `Identifique os dados do cartao de credito na fatura anexa (arquivo: ${input.filename}).`
          ),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: EXTRACTION_SCHEMA as unknown as OpenAI.ResponseFormatJSONSchema['json_schema'],
      },
      max_tokens: 1_000,
      temperature: 0,
    });
  } catch (err) {
    throw mapOpenAIError(err);
  }

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('A IA nao retornou resposta. Tente novamente.');
  }

  let parsed: {
    found?: unknown;
    message?: unknown;
    name?: unknown;
    brand?: unknown;
    total_limit?: unknown;
    closing_day?: unknown;
    due_day?: unknown;
    bank_name?: unknown;
  };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('A IA retornou uma resposta invalida. Tente novamente.');
  }

  const message =
    typeof parsed.message === 'string' && parsed.message.trim()
      ? parsed.message.trim()
      : 'Nao foi possivel ler a fatura.';

  const name = typeof parsed.name === 'string' ? parsed.name.trim() : '';
  if (parsed.found !== true || name.length < 2) {
    return { found: false, message, card: null };
  }

  const totalLimit =
    typeof parsed.total_limit === 'number' &&
    Number.isFinite(parsed.total_limit) &&
    parsed.total_limit > 0
      ? parsed.total_limit
      : null;

  return {
    found: true,
    message,
    card: {
      name,
      brand: BRANDS.includes(parsed.brand as CreditCardBrand)
        ? (parsed.brand as CreditCardBrand)
        : 'OUTROS',
      total_limit: totalLimit,
      closing_day: clampDay(parsed.closing_day),
      due_day: clampDay(parsed.due_day),
      bank_name:
        typeof parsed.bank_name === 'string' && parsed.bank_name.trim()
          ? parsed.bank_name.trim()
          : null,
    },
  };
}
