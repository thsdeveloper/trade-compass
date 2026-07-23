import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

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
  return readPickedAsset(asset, kind);
}

/**
 * Seletor restrito a PDF/imagem, para fluxos que leem um documento com IA
 * (ex.: identificar o cartão pela fatura). Mesmo contrato do pickStatementFile.
 */
export async function pickInvoiceFile(): Promise<PickedStatementFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const kind = getFileKind(asset.name, asset.mimeType);
  if (kind !== 'pdf' && kind !== 'image') {
    throw new Error('Formato não suportado. Envie o PDF ou uma foto da fatura.');
  }
  return readPickedAsset(asset, kind);
}

/**
 * Converte uma foto em PickedStatementFile: reduz e comprime (mesmo preset do
 * scanner de nota) para caber no limite do endpoint e baratear a visão da IA.
 */
async function imageAssetToPickedFile(uri: string): Promise<PickedStatementFile> {
  const manipulated = await manipulateAsync(uri, [{ resize: { width: 1280 } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!manipulated.base64) {
    throw new Error('Não foi possível processar a imagem. Tente outra foto.');
  }
  return {
    name: 'foto.jpg',
    kind: 'image',
    mimeType: 'image/jpeg',
    content: manipulated.base64,
    // Base64 ocupa ~4/3 do binário; a API só usa isto como referência
    sizeBytes: Math.ceil(manipulated.base64.length * 0.75),
  };
}

/** Escolhe uma imagem da galeria de fotos. Retorna null se o usuário cancelar. */
export async function pickImageFile(): Promise<PickedStatementFile | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
  });
  if (result.canceled || !result.assets[0]) return null;
  return imageAssetToPickedFile(result.assets[0].uri);
}

/** Tira uma foto com a câmera. Retorna null se o usuário cancelar. */
export async function captureImageFile(): Promise<PickedStatementFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permissão de câmera negada. Habilite nos ajustes do aparelho.');
  }
  const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  if (result.canceled || !result.assets[0]) return null;
  return imageAssetToPickedFile(result.assets[0].uri);
}

async function readPickedAsset(
  asset: DocumentPicker.DocumentPickerAsset,
  kind: StatementFileKind
): Promise<PickedStatementFile> {
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
