import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing state that persists to localStorage with proper SSR/hydration handling.
 *
 * @param key - localStorage key
 * @param defaultValue - default value before hydration
 * @returns [state, setState, isHydrated] - state, setter function, and hydration status
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) {
        setState(JSON.parse(stored));
      }
    } catch (e) {
      console.warn(`Error reading localStorage key "${key}":`, e);
    }
    setIsHydrated(true);
  }, [key]);

  // Persist to localStorage when state changes (after hydration)
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value;
      try {
        localStorage.setItem(key, JSON.stringify(newValue));
      } catch (e) {
        console.warn(`Error writing localStorage key "${key}":`, e);
      }
      return newValue;
    });
  }, [key]);

  return [state, setValue, isHydrated];
}
