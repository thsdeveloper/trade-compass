import type {
  AnalysisResponse,
  AssetSummary,
  CandlesResponse,
  MysticPulseSeriesResponse,
  DecisionZone,
  SignalsResponse,
  SignalStats,
  BacktestResponse,
  BacktestSummary,
} from '@/types/market';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

// Auth types
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
  user: {
    id: string;
    email: string;
  };
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  session: AuthSession;
}

export interface PasswordRecoveryResponse {
  message: string;
}

// Watchlist types
export interface WatchlistItemResponse {
  id: string;
  ticker: string;
  name: string;
  name_pt?: string; // Optional name override
  notes: string | null;
  zone: DecisionZone;
  created_at: string;
}

export interface CreateWatchlistItemDTO {
  ticker: string;
  notes?: string;
}

export interface UpdateWatchlistItemDTO {
  notes?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }

  // Authenticated fetch
  private async authFetch<T>(
    endpoint: string,
    accessToken: string,
    options?: RequestInit
  ): Promise<T> {
    return this.fetch<T>(endpoint, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options?.headers,
      },
    });
  }

  // Public endpoints
  async getAssets(): Promise<Array<{ ticker: string; name: string }>> {
    return this.fetch('/assets');
  }

  async getAssetSummary(ticker: string): Promise<AssetSummary> {
    return this.fetch(`/assets/${ticker}/summary`);
  }

  async getAssetAnalysis(ticker: string, timeframe: string = '1d'): Promise<AnalysisResponse> {
    return this.fetch(`/assets/${ticker}/analysis?timeframe=${timeframe}`);
  }

  async getCandles(ticker: string, limit: number = 100, timeframe: string = '1d'): Promise<CandlesResponse> {
    return this.fetch(`/assets/${ticker}/candles?limit=${limit}&timeframe=${timeframe}`);
  }

  async getMysticPulseSeries(ticker: string): Promise<MysticPulseSeriesResponse> {
    return this.fetch(`/assets/${ticker}/mystic-pulse/series`);
  }

  async getSignals(ticker: string, limit: number = 100, timeframe: string = '1d'): Promise<SignalsResponse> {
    return this.fetch(`/assets/${ticker}/signals?limit=${limit}&timeframe=${timeframe}`);
  }

  async getSignalStats(ticker: string): Promise<{ ticker: string; stats: SignalStats }> {
    return this.fetch(`/assets/${ticker}/signals/stats`);
  }

  async getBacktest(options?: { limit?: number; ticker?: string; setupType?: string }): Promise<BacktestResponse> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.ticker) params.append('ticker', options.ticker);
    if (options?.setupType) params.append('setupType', options.setupType);
    const query = params.toString();
    return this.fetch(`/backtest${query ? `?${query}` : ''}`);
  }

  async getBacktestSummary(options?: { ticker?: string; setupType?: string }): Promise<{ summary: BacktestSummary }> {
    const params = new URLSearchParams();
    if (options?.ticker) params.append('ticker', options.ticker);
    if (options?.setupType) params.append('setupType', options.setupType);
    const query = params.toString();
    return this.fetch(`/backtest/summary${query ? `?${query}` : ''}`);
  }

  async generateBacktest(ticker: string): Promise<{
    ticker: string;
    success: boolean;
    signalsGenerated: number;
    stats: {
      total: number;
      success: number;
      failure: number;
      pending: number;
      expired: number;
      successRate: number;
    };
  }> {
    return this.fetch(`/backtest/generate/${ticker}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.fetch('/health');
  }

  // Auth endpoints
  async register(email: string, password: string): Promise<AuthResponse> {
    return this.fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    return this.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async recoverPassword(email: string): Promise<PasswordRecoveryResponse> {
    return this.fetch('/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(
    access_token: string,
    new_password: string
  ): Promise<{ message: string }> {
    return this.fetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ access_token, new_password }),
    });
  }

  async refreshToken(refresh_token: string): Promise<{ session: AuthSession }> {
    return this.fetch('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    });
  }

  async getCurrentUser(accessToken: string): Promise<{ user: { id: string; email: string; created_at: string } }> {
    return this.authFetch('/auth/me', accessToken);
  }

  async logout(accessToken: string): Promise<{ message: string }> {
    return this.authFetch<{ message: string }>('/auth/logout', accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).catch(() => ({ message: 'Logged out' })); // Ignore errors
  }

  async signInWithMagicLink(email: string): Promise<{ message: string }> {
    return this.fetch('/auth/magic-link', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Authenticated endpoints - Watchlist
  async getWatchlist(accessToken: string): Promise<WatchlistItemResponse[]> {
    return this.authFetch('/watchlist', accessToken);
  }

  async addToWatchlist(
    item: CreateWatchlistItemDTO,
    accessToken: string
  ): Promise<WatchlistItemResponse> {
    return this.authFetch('/watchlist', accessToken, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateWatchlistItem(
    id: string,
    updates: UpdateWatchlistItemDTO,
    accessToken: string
  ): Promise<WatchlistItemResponse> {
    return this.authFetch(`/watchlist/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async removeFromWatchlist(id: string, accessToken: string): Promise<void> {
    await this.authFetch(`/watchlist/${id}`, accessToken, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
