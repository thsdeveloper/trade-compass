import type { ConfirmImportResult } from './import';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

/** Rascunho de transação extraído de uma nota fiscal pelo agente */
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

/** Card-resumo de uma importação de extrato dentro do chat da Nota */
export interface StatementImportPayload {
  fileName: string;
  /** "Conta Nubank" | "Cartão XP" */
  targetLabel: string;
  transactionCount: number;
  /** Resultado após o commit; ausente = revisão pendente */
  result?: ConfirmImportResult;
}

/** Mensagem do chat de notas: além de texto, pode carregar imagem e rascunho */
export interface ReceiptChatMessage extends ChatMessage {
  imageUri?: string;
  draft?: TransactionDraft;
  /** id da transação criada a partir do rascunho (quando confirmada) */
  savedTransactionId?: string;
  statementImport?: StatementImportPayload;
}

export interface AgentApiMessage {
  role: 'user' | 'assistant';
  content: string;
}
