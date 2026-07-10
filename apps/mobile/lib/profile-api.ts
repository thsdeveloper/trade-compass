import { supabase } from './supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface Profile {
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();

  return {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
    ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
  };
}

export async function getProfile(): Promise<ApiResponse<Profile>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/profile/get`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || 'Erro ao buscar perfil' };
    }

    return { data };
  } catch (error) {
    return { error: 'Erro de conexao. Verifique sua internet.' };
  }
}

export async function updateProfile(updates: {
  full_name?: string | null;
  phone?: string | null;
}): Promise<ApiResponse<Profile>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/profile/update`, {
      method: 'POST',
      headers,
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || 'Erro ao atualizar perfil' };
    }

    return { data };
  } catch (error) {
    return { error: 'Erro de conexao. Verifique sua internet.' };
  }
}

export async function getUploadUrl(fileExtension: 'jpg' | 'jpeg' | 'png' | 'webp'): Promise<
  ApiResponse<{ signedUrl: string; publicUrl: string; path: string }>
> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/profile/getUploadUrl`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fileExtension }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || 'Erro ao gerar URL de upload' };
    }

    return { data };
  } catch (error) {
    return { error: 'Erro de conexao. Verifique sua internet.' };
  }
}

export async function updateAvatarUrl(avatar_url: string): Promise<ApiResponse<{ avatar_url: string }>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/profile/updateAvatarUrl`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ avatar_url }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || 'Erro ao atualizar avatar' };
    }

    return { data };
  } catch (error) {
    return { error: 'Erro de conexao. Verifique sua internet.' };
  }
}

export async function deleteAvatar(): Promise<ApiResponse<{ message: string }>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/profile/deleteAvatar`, {
      method: 'POST',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || 'Erro ao remover avatar' };
    }

    return { data };
  } catch (error) {
    return { error: 'Erro de conexao. Verifique sua internet.' };
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ApiResponse<{ message: string }>> {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/auth/changePassword`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || 'Erro ao alterar senha' };
    }

    return { data };
  } catch (error) {
    return { error: 'Erro de conexao. Verifique sua internet.' };
  }
}

export async function uploadAvatar(
  signedUrl: string,
  imageUri: string,
  mimeType: string
): Promise<ApiResponse<void>> {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();

    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': mimeType,
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      return { error: 'Erro ao fazer upload da imagem' };
    }

    return { data: undefined };
  } catch (error) {
    return { error: 'Erro ao fazer upload da imagem' };
  }
}
