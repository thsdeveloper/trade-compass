import { openai, OPENAI_MODEL } from '../lib/openai.js';
import type { FinanceCategory } from '../domain/finance-types.js';
import type { NfceQrInfo, CnpjInfo } from './nfce-parser.js';
import { formatCnpj, ufFromAccessKey } from './nfce-parser.js';

export interface ReceiptExtractionInput {
  text?: string;
  imageBase64?: string;
  qrInfo?: NfceQrInfo | null;
  merchant?: CnpjInfo | null;
  categories: FinanceCategory[];
}

export interface TransactionDraft {
  type: 'DESPESA' | 'RECEITA';
  description: string;
  amount: number | null;
  due_date: string | null;
  category_id: string | null;
  notes: string | null;
}

export interface ReceiptExtractionResult {
  message: string;
  draft: TransactionDraft | null;
}

const RESPONSE_SCHEMA = {
  name: 'receipt_extraction',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      message: {
        type: 'string',
        description:
          'Resposta curta em português ao usuário: o que foi identificado ou o que faltou',
      },
      found: {
        type: 'boolean',
        description: 'true se uma transação foi identificada nos dados',
      },
      type: { type: 'string', enum: ['DESPESA', 'RECEITA'] },
      description: {
        type: 'string',
        description: 'Descrição curta da transação (ex.: nome do estabelecimento)',
      },
      amount: {
        type: ['number', 'null'],
        description: 'Valor total em reais, null se não identificado',
      },
      due_date: {
        type: ['string', 'null'],
        description: 'Data da transação no formato YYYY-MM-DD, null se não identificada',
      },
      category_id: {
        type: ['string', 'null'],
        description: 'id de uma categoria da lista fornecida, null se nenhuma se aplica',
      },
      notes: {
        type: ['string', 'null'],
        description:
          'Observações: resumo dos itens, CNPJ e chave de acesso da nota quando disponíveis',
      },
    },
    required: ['message', 'found', 'type', 'description', 'amount', 'due_date', 'category_id', 'notes'],
  },
} as const;

function buildQrContext(qrInfo: NfceQrInfo, merchant: CnpjInfo | null): string {
  const lines = [
    'Dados extraídos do QR code da NFC-e:',
    `- Chave de acesso: ${qrInfo.accessKey}`,
    `- CNPJ do emissor: ${formatCnpj(qrInfo.cnpj)}`,
    `- UF: ${ufFromAccessKey(qrInfo.accessKey) ?? 'desconhecida'}`,
    `- Número da nota: ${qrInfo.invoiceNumber}`,
    `- Ano/mês de emissão: ${qrInfo.emissionYearMonth}`,
  ];
  if (qrInfo.emissionDate) lines.push(`- Data de emissão: ${qrInfo.emissionDate}`);
  if (qrInfo.totalAmount !== null) lines.push(`- Valor total: R$ ${qrInfo.totalAmount.toFixed(2)}`);
  if (merchant) {
    lines.push(`- Razão social: ${merchant.name}`);
    if (merchant.tradeName) lines.push(`- Nome fantasia: ${merchant.tradeName}`);
  }
  return lines.join('\n');
}

function buildSystemPrompt(categories: FinanceCategory[]): string {
  const today = new Date().toISOString().split('T')[0];
  const categoryList = categories
    .map((c) => `- ${c.id} | ${c.name} (${c.type})`)
    .join('\n');

  return `Você é um assistente que extrai transações financeiras de notas fiscais brasileiras (NFC-e/DANFE), comprovantes e descrições em texto livre.

Hoje é ${today}. Datas sem ano assumem o ano corrente. Valores são em reais (BRL).

Regras:
- Compras em estabelecimentos são DESPESA. Só use RECEITA se claramente for um recebimento.
- Dados de QR code de NFC-e SEMPRE representam uma compra real: retorne found=true mesmo sem valor total ou itens. Campos desconhecidos ficam null — a interface pede o que faltar ao usuário.
- Para a descrição prefira o nome fantasia do estabelecimento; senão a razão social sem sufixos societários (LTDA, S.A., EIRELI, ME); senão um resumo curto do que foi comprado.
- Escolha a categoria mais adequada da lista abaixo usando exatamente o id informado. Se nenhuma servir, use null.
- Se a imagem/texto não contiver uma transação identificável, retorne found=false e explique em "message" o que faltou.
- Em "notes" inclua um resumo dos itens (quando visíveis) e a chave de acesso da nota (quando disponível).
- "message" deve ser curta e amigável, em português do Brasil, resumindo o que foi identificado (estabelecimento, valor, data) SEM pedir confirmação de conta ou cartão — a interface cuida disso.

Categorias disponíveis (id | nome (tipo)):
${categoryList}`;
}

function buildDraftFromQr(
  qrInfo: NfceQrInfo,
  merchant: CnpjInfo | null
): ReceiptExtractionResult {
  const description =
    merchant?.tradeName ??
    merchant?.name ??
    `Compra NFC-e nº ${qrInfo.invoiceNumber}`;

  const hasAmount = qrInfo.totalAmount !== null;
  const message = hasAmount
    ? `Nota de ${description} identificada. Confira os dados e escolha a conta ou cartão.`
    : `Nota de ${description} identificada, mas o QR code não informa o valor total. Preencha o valor e escolha a conta ou cartão.`;

  return {
    message,
    draft: {
      type: 'DESPESA',
      description,
      amount: qrInfo.totalAmount,
      due_date: qrInfo.emissionDate?.slice(0, 10) ?? null,
      category_id: null,
      notes: `NFC-e nº ${qrInfo.invoiceNumber} | CNPJ ${formatCnpj(qrInfo.cnpj)} | Chave ${qrInfo.accessKey}`,
    },
  };
}

export async function extractReceipt(
  input: ReceiptExtractionInput
): Promise<ReceiptExtractionResult> {
  if (!openai) {
    throw new Error('OpenAI nao configurado. Verifique a variavel OPENAI_API_KEY.');
  }

  const parts: string[] = [];
  if (input.qrInfo) {
    parts.push(buildQrContext(input.qrInfo, input.merchant ?? null));
  }
  if (input.text) {
    parts.push(`Mensagem do usuário: ${input.text}`);
  }
  if (input.imageBase64 && parts.length === 0) {
    parts.push('Extraia a transação da imagem anexada (nota fiscal ou comprovante).');
  }

  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  > = [{ type: 'text', text: parts.join('\n\n') }];

  if (input.imageBase64) {
    userContent.push({
      type: 'image_url',
      image_url: { url: `data:image/jpeg;base64,${input.imageBase64}` },
    });
  }

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: 800,
    temperature: 0.2,
    messages: [
      { role: 'system', content: buildSystemPrompt(input.categories) },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error('Resposta vazia do modelo');
  }

  const parsed = JSON.parse(raw) as {
    message: string;
    found: boolean;
    type: 'DESPESA' | 'RECEITA';
    description: string;
    amount: number | null;
    due_date: string | null;
    category_id: string | null;
    notes: string | null;
  };

  if (!parsed.found) {
    // Com QR de NFC-e válido a compra existe por definição; monta o rascunho
    // deterministicamente mesmo que o modelo não tenha reconhecido a transação
    if (input.qrInfo) {
      return buildDraftFromQr(input.qrInfo, input.merchant ?? null);
    }
    return { message: parsed.message, draft: null };
  }

  // O modelo às vezes inventa ids; valida contra a lista real
  const categoryId =
    parsed.category_id && input.categories.some((c) => c.id === parsed.category_id)
      ? parsed.category_id
      : null;

  // Dados determinísticos do QR têm precedência sobre a leitura do modelo
  const amount = input.qrInfo?.totalAmount ?? parsed.amount;
  const dueDate = input.qrInfo?.emissionDate?.slice(0, 10) ?? parsed.due_date;

  return {
    message: parsed.message,
    draft: {
      type: parsed.type,
      description: parsed.description,
      amount: typeof amount === 'number' && amount > 0 ? amount : null,
      due_date: dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : null,
      category_id: categoryId,
      notes: parsed.notes,
    },
  };
}
