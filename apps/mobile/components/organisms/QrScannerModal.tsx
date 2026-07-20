import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';

import { Spacing, BorderRadius, FontSize, FontWeight } from '@/constants/theme';
import { IconSymbol } from '@/components/atoms/icon-symbol';
import { Button } from '@/components/atoms/Button';

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
  const [permission, requestPermission] = useCameraPermissions();
  const insets = useSafeAreaInsets();
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
              <Button
                label="Permitir câmera"
                onPress={requestPermission}
                variant="primary"
                fullWidth={false}
              />
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

        <Button
          iconOnly
          icon="close"
          variant="secondary"
          size="md"
          onPress={onClose}
          accessibilityLabel="Fechar scanner"
          style={[styles.closeButton, { top: insets.top + Spacing.sm }]}
        />
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
    right: Spacing.lg,
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
});
