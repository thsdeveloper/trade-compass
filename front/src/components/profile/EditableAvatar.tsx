'use client';

import { useState, useRef } from 'react';
import { User, Camera, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

interface EditableAvatarProps {
  avatarUrl: string | null;
  onAvatarChange: (newUrl: string | null) => void;
  accessToken: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

const iconSizes = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

export function EditableAvatar({
  avatarUrl,
  onAvatarChange,
  accessToken,
  size = 'lg',
}: EditableAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Formato invalido. Use JPG, PNG ou WebP.');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem muito grande. Maximo 2MB.');
      return;
    }

    setIsUploading(true);

    try {
      // Get file extension
      const extension = file.name.split('.').pop()?.toLowerCase() as 'jpg' | 'jpeg' | 'png' | 'webp';
      const validExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(extension) ? extension : 'jpg';

      // Get signed upload URL
      const { signedUrl, publicUrl } = await api.getUploadUrl(validExtension, accessToken);

      // Upload file
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Erro ao fazer upload');
      }

      // Update avatar URL in profile
      await api.updateAvatarUrl(publicUrl, accessToken);

      onAvatarChange(publicUrl);
      toast.success('Foto atualizada com sucesso!');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Erro ao atualizar foto. Tente novamente.');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);

    try {
      await api.deleteAvatar(accessToken);
      onAvatarChange(null);
      toast.success('Foto removida com sucesso!');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Erro ao remover foto. Tente novamente.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={isUploading}>
          <button
            className={cn(
              'relative rounded-full overflow-hidden transition-all',
              'ring-2 ring-border hover:ring-primary/50',
              'focus:outline-none focus:ring-primary',
              sizeClasses[size]
            )}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-muted flex items-center justify-center">
                <User className={cn('text-muted-foreground', iconSizes[size])} />
              </div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              </div>
            )}

            <div className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full shadow-lg">
              <Camera className="h-4 w-4 text-primary-foreground" />
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" />
            Escolher foto
          </DropdownMenuItem>
          {avatarUrl && (
            <DropdownMenuItem
              onClick={handleRemoveAvatar}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remover foto
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
