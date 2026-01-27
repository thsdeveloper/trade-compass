import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getUploadUrl, uploadAvatar, updateAvatarUrl, deleteAvatar } from '@/lib/profile-api';

interface EditableAvatarProps {
  avatarUrl: string | null;
  onAvatarChange: (newUrl: string | null) => void;
  size?: number;
}

export function EditableAvatar({ avatarUrl, onAvatarChange, size = 120 }: EditableAvatarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [isUploading, setIsUploading] = useState(false);

  const showActionSheet = () => {
    const options = avatarUrl
      ? ['Tirar Foto', 'Escolher da Galeria', 'Remover Foto', 'Cancelar']
      : ['Tirar Foto', 'Escolher da Galeria', 'Cancelar'];

    const destructiveButtonIndex = avatarUrl ? 2 : undefined;
    const cancelButtonIndex = avatarUrl ? 3 : 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
        },
        (buttonIndex) => {
          handleActionSheetPress(buttonIndex);
        }
      );
    } else {
      Alert.alert(
        'Alterar Foto',
        'Escolha uma opcao',
        options.map((option, index) => ({
          text: option,
          style:
            index === destructiveButtonIndex
              ? 'destructive'
              : index === cancelButtonIndex
                ? 'cancel'
                : 'default',
          onPress: () => handleActionSheetPress(index),
        }))
      );
    }
  };

  const handleActionSheetPress = async (buttonIndex: number) => {
    if (buttonIndex === 0) {
      await pickImage('camera');
    } else if (buttonIndex === 1) {
      await pickImage('gallery');
    } else if (buttonIndex === 2 && avatarUrl) {
      await handleRemoveAvatar();
    }
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    try {
      let result: ImagePicker.ImagePickerResult;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissao necessaria', 'Precisamos de acesso a camera para tirar fotos.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissao necessaria', 'Precisamos de acesso a galeria para selecionar fotos.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]) {
        await handleUpload(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel acessar a imagem');
    }
  };

  const handleUpload = async (imageUri: string) => {
    setIsUploading(true);

    try {
      // Compress and resize image
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 500, height: 500 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Get signed URL
      const uploadUrlResult = await getUploadUrl('jpg');
      if (uploadUrlResult.error || !uploadUrlResult.data) {
        Alert.alert('Erro', uploadUrlResult.error || 'Erro ao gerar URL de upload');
        return;
      }

      // Upload image
      const uploadResult = await uploadAvatar(
        uploadUrlResult.data.signedUrl,
        manipulatedImage.uri,
        'image/jpeg'
      );

      if (uploadResult.error) {
        Alert.alert('Erro', uploadResult.error);
        return;
      }

      // Update avatar URL in profile
      const updateResult = await updateAvatarUrl(uploadUrlResult.data.publicUrl);
      if (updateResult.error) {
        Alert.alert('Erro', updateResult.error);
        return;
      }

      onAvatarChange(uploadUrlResult.data.publicUrl);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao fazer upload da imagem');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);

    try {
      const result = await deleteAvatar();
      if (result.error) {
        Alert.alert('Erro', result.error);
        return;
      }

      onAvatarChange(null);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao remover avatar');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, { width: size, height: size }]}
      onPress={showActionSheet}
      disabled={isUploading}
      activeOpacity={0.8}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: colors.card,
            },
          ]}
        >
          <IconSymbol name="person.fill" size={size * 0.5} color={colors.textSecondary} />
        </View>
      )}

      {isUploading ? (
        <View style={[styles.overlay, { borderRadius: size / 2 }]}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <View
          style={[
            styles.editBadge,
            { backgroundColor: colors.primary },
          ]}
        >
          <IconSymbol name="camera.fill" size={16} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignSelf: 'center',
  },
  avatar: {
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
});
