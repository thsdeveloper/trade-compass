import type { AnalysisResponse, AssetSummary, CandlesResponse } from '@/types/market';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new Error(error.message);
    }

    return response.json();
  }

  async getAssets(): Promise<Array<{ ticker: string; name: string }>> {
    return this.fetch('/assets');
  }

  async getAssetSummary(ticker: string): Promise<AssetSummary> {
    return this.fetch(`/assets/${ticker}/summary`);
  }

  async getAssetAnalysis(ticker: string): Promise<AnalysisResponse> {
    return this.fetch(`/assets/${ticker}/analysis`);
  }

  async getCandles(ticker: string, limit: number = 120): Promise<CandlesResponse> {
    return this.fetch(`/assets/${ticker}/candles?limit=${limit}`);
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.fetch('/health');
  }
}

export const api = new ApiClient(API_BASE_URL);
