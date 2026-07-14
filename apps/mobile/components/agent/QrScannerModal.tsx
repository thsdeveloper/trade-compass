import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface QrScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: string) => void;
}

/**
 * Modal de tela cheia para escanear o QR code da NFC-e.
 * Dispara onScanned uma única vez por abertura para evitar leituras duplicadas.
 */
export function QrScannerModal({ visible, onClose, onScanned }: QrScannerModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
      setIsReady(false);
      if (permission && !permission.granted && permission.canAskAgain) {
        requestPermission();
      }
    }
  }, [visible, permission, requestPermission]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current || !data) return;
    scannedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScanned(data);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {permission?.granted ? (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
            onCameraReady={() => setIsReady(true)}
          />
        ) : (
          <View style={styles.permissionState}>
            <IconSymbol name="qrcode.viewfinder" size={48} color="#FFFFFF" />
            <Text style={styles.permissionText}>
              {permission?.canAskAgain === false
                ? 'Permissão de câmera negada. Habilite nas configurações do aparelho.'
                : 'Precisamos da câmera para escanear o QR code da nota.'}
            </Text>
            {permission?.canAskAgain !== false && (
              <Pressable
                onPress={requestPermission}
                style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.permissionButtonText}>Permitir câmera</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Moldura de mira */}
        {permission?.granted && (
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.frame} />
            <Text style={styles.hint}>
              {isReady
                ? 'Aponte para o QR code da nota fiscal'
                : 'Abrindo câmera...'}
            </Text>
          </View>
        )}

        <Pressable
          onPress={onClose}
          accessibilityLabel="Fechar scanner"
          style={styles.closeButton}
        >
          <IconSymbol name="xmark" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    textAlign: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing['2xl'],
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});
