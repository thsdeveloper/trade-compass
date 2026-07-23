// Tipos da importação de extrato bancário — espelhos exatos do backend
// (apps/api: statement-import-service.ts, routes/finance/import.ts,
// import-validation-service.ts, routes/finance/import-multi.ts).

export type StatementFileKind = 'text' | 'pdf' | 'image';

export type StatementLineKind = 'NORMAL' | 'TRANSFERENCIA_INTERNA' | 'PAGAMENTO_FATURA';

export type DetectedDocumentKind = 'ACCOUNT_STATEMENT' | 'CREDIT_CARD_INVOICE' | 'OTHER';

export interface PickedStatementFile {
  name: string;
  kind: StatementFileKind;
  mimeType?: string;
  /** UTF-8 quando kind='text'; base64 sem prefixo data: para pdf/image */
  content: string;
  sizeBytes: number;
}

export interface DetectStatementResponse {
  document_kind: DetectedDocumentKind;
  detected_account_id: string | null;
  bank_name: string | null;
}

export interface ImportPreviewTransaction {
  description: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  due_date: string; // YYYY-MM-DD
  category_id: string | null;
  notes: string | null;
  line_kind: StatementLineKind;
  suggested_transfer_account_id: string | null;
  suggested_credit_card_id: string | null;
  possible_duplicate: boolean;
  /** Id único da transação no banco de origem (só OFX) */
  fitid: string | null;
  /** true quando o FITID já existe no destino: duplicata certa, não heurística */
  duplicate_exact: boolean;
}

/** Item aceito pelo POST /finance/import/confirm (PAGAMENTO_FATURA não é aceito) */
export interface ConfirmImportItem {
  kind: 'NORMAL' | 'TRANSFERENCIA_INTERNA';
  category_id: string;
  type: 'RECEITA' | 'DESPESA';
  description: string;
  amount: number;
  due_date: string;
  notes?: string;
  transfer_account_id?: string;
  /** FITID do OFX (gravado na transação para dedup exato em reimportações) */
  fitid?: string | null;
}

/** Ajuste "saldo fatura anterior e pagamentos" de uma fatura importada */
export interface InvoiceAdjustment {
  /** Mês de referência da fatura (YYYY-MM) */
  invoice_month: string;
  /** Negativo = crédito que abate a fatura; positivo = saldo devedor carregado */
  amount: number;
}

export interface ParseStatementResponse {
  transactions: ImportPreviewTransaction[];
  /** Mês de referência da fatura (YYYY-MM) — só fatura de cartão */
  invoice_month: string | null;
  /** Saldo líquido "fatura anterior e pagamentos" (negativo = crédito) — só fatura */
  invoice_previous_balance: number | null;
}

/** Destino da importação: conta OU cartão, nunca ambos (regra do backend) */
export type ImportTarget =
  | { account_id: string; credit_card_id?: undefined }
  | { credit_card_id: string; account_id?: undefined };

export interface ConfirmImportResult {
  transactions_created: number;
  transfers_created: number;
}

/** Linha editável da revisão (estado local do StatementReviewModal) */
export interface ReviewRow extends ImportPreviewTransaction {
  id: string;
  selected: boolean;
  /** Classificação editável: a IA sugere, o usuário corrige */
  kind: StatementLineKind;
  transferAccountId: string | null;
}
