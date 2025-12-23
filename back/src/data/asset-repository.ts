import type { Asset } from '../domain/types.js';
import { ASSETS } from '../domain/constants.js';

export function getAssets(): Asset[] {
  return ASSETS;
}

export function getAsset(ticker: string): Asset | null {
  const normalized = ticker.toUpperCase().trim();
  return ASSETS.find((a) => a.ticker === normalized) || null;
}

export function assetExists(ticker: string): boolean {
  return getAsset(ticker) !== null;
}
