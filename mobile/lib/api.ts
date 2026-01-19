const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

interface MagicLinkResponse {
  message: string;
}

interface LoginResponse {
  user: {
    id: string;
    email: string;
  };
  session: {
    access_token: string;
    refresh_token: string;
  };
}

export async function sendMagicLink(
  email: string,
  platform: 'web' | 'mobile' = 'mobile'
): Promise<ApiResponse<MagicLinkResponse>> {
  try {
    const response = await fetch(`${API_URL}/auth/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, platform }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || 'Erro ao enviar magic link' };
    }

    return { data };
  } catch (error) {
    return { error: 'Erro de conexão. Verifique sua internet.' };
  }
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<ApiResponse<LoginResponse>> {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || 'Credenciais inválidas' };
    }

    return { data };
  } catch (error) {
    return { error: 'Erro de conexão. Verifique sua internet.' };
  }
}
