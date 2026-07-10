import type { StatementFileKind } from '@/types/finance';

// Utilitários compartilhados pelos fluxos de importação de extrato
// (ImportStatementDialog e ImportMultiStatementDialog)

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const TEXT_EXTENSIONS = ['csv', 'txt', 'ofx', 'qfx', 'qif'];
export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

export const ACCEPT =
  '.csv,.txt,.ofx,.qfx,.qif,.pdf,.jpg,.jpeg,.png,.webp,application/pdf,text/csv,text/plain,image/jpeg,image/png,image/webp';

export function getFileKind(file: File): StatementFileKind | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  if (ext === 'pdf' || file.type === 'application/pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext) || file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('text/')) return 'text';
  return null;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo data:...;base64,
      resolve(result.substring(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function formatStatementDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/** Lê o conteúdo do arquivo no formato esperado pela API (texto puro ou base64) */
export async function readStatementContent(
  file: File,
  kind: StatementFileKind
): Promise<string> {
  return kind === 'text' ? file.text() : readFileAsBase64(file);
}
