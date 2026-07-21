import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import type { PickedStatementFile, StatementFileKind } from '@/types/import';

// Utilitários de arquivo da importação de extrato (porte mobile de
// apps/front/src/lib/statement-file-utils.ts)

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (backend aceita 15MB de body)

const TEXT_EXTENSIONS = ['csv', 'txt', 'ofx', 'qfx', 'qif'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

// OFX/QIF chegam como application/octet-stream: extensão decide primeiro
export function getFileKind(name: string, mimeType?: string): StatementFileKind | null {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const type = mimeType ?? '';
  if (TEXT_EXTENSIONS.includes(ext)) return 'text';
  if (ext === 'pdf' || type === 'application/pdf') return 'pdf';
  if (IMAGE_EXTENSIONS.includes(ext) || type.startsWith('image/')) return 'image';
  if (type.startsWith('text/')) return 'text';
  return null;
}

export function formatStatementDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Abre o seletor de arquivos e lê o extrato no formato esperado pela API
 * (texto puro para csv/ofx/txt, base64 para pdf/imagem).
 * Retorna null se o usuário cancelar; lança erro amigável em PT nos demais casos.
 */
export async function pickStatementFile(): Promise<PickedStatementFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      'text/csv',
      'text/plain',
      'text/*',
      'application/pdf',
      'image/*',
      'application/octet-stream',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const kind = getFileKind(asset.name, asset.mimeType);
  if (!kind) {
    throw new Error('Formato não suportado. Use CSV, OFX, TXT, PDF ou imagem.');
  }
  if ((asset.size ?? 0) > MAX_FILE_SIZE) {
    throw new Error('Arquivo muito grande. O máximo é 10MB — exporte um período menor.');
  }

  const content = await FileSystem.readAsStringAsync(asset.uri, {
    encoding:
      kind === 'text' ? FileSystem.EncodingType.UTF8 : FileSystem.EncodingType.Base64,
  });

  return {
    name: asset.name,
    kind,
    mimeType: asset.mimeType,
    content,
    sizeBytes: asset.size ?? content.length,
  };
}
