import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { extractReceipt } from '@/lib/agent-api';
import { useAuth } from '@/contexts/AuthContext';
import type { TransactionDraft } from '@/types/agent';

type UseReceiptScannerOptions = {
  /** Chamado quando o agente devolve um rascunho de transação. */
  onDraft: (draft: TransactionDraft, message: string) => void;
  /** Erro amigável; se ausente, mostra um Alert padrão. */
  onError?: (message: string) => void;
};

/**
 * Encapsula a leitura de nota fiscal: captura (foto/galeria/QR de NFC-e),
 * compressão da imagem e chamada ao endpoint de extração, devolvendo um
 * `TransactionDraft`. Reutilizável em qualquer tela (nova transação, chat…).
 */
export function useReceiptScanner({ onDraft, onError }: UseReceiptScannerOptions) {
  const { session } = useAuth();
  const [isScanning, setIsScanning] = useState(false);

  const fail = useCallback(
    (message: string) => {
      if (onError) onError(message);
      else Alert.alert('Não consegui ler a nota', message);
    },
    [onError],
  );

  const runExtraction = useCallback(
    async (payload: { imageUri?: string; qrData?: string }) => {
      if (!session?.access_token) {
        fail('Sua sessão expirou. Entre novamente para escanear notas.');
        return;
      }
      setIsScanning(true);
      try {
        let imageBase64: string | undefined;
        if (payload.imageUri) {
          // Reduz a foto p/ caber no limite do endpoint e baratear a visão
          const manipulated = await manipulateAsync(
            payload.imageUri,
            [{ resize: { width: 1280 } }],
            { compress: 0.7, format: SaveFormat.JPEG, base64: true },
          );
          imageBase64 = manipulated.base64 ?? undefined;
        }

        const result = await extractReceipt({
          accessToken: session.access_token,
          qrData: payload.qrData,
          imageBase64,
        });

        if (result.draft) {
          onDraft(result.draft, result.message);
        } else {
          fail(
            result.message ||
              'Não identifiquei os dados da nota. Tente uma foto mais nítida ou o QR code.',
          );
        }
      } catch (err) {
        fail(err instanceof Error ? err.message : 'Erro ao interpretar a nota.');
      } finally {
        setIsScanning(false);
      }
    },
    [session?.access_token, onDraft, fail],
  );

  const scanFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      fail('Permissão de câmera negada.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      runExtraction({ imageUri: result.assets[0].uri });
    }
  }, [runExtraction, fail]);

  const scanFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      runExtraction({ imageUri: result.assets[0].uri });
    }
  }, [runExtraction]);

  const scanFromQr = useCallback(
    (qrData: string) => runExtraction({ qrData }),
    [runExtraction],
  );

  return { isScanning, scanFromCamera, scanFromGallery, scanFromQr };
}
