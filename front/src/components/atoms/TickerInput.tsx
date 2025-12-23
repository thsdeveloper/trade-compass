'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface TickerInputProps {
  defaultValue?: string;
  onSubmit?: (ticker: string) => void;
}

export function TickerInput({ defaultValue = '', onSubmit }: TickerInputProps) {
  const [ticker, setTicker] = useState(defaultValue);
  const [error, setError] = useState('');
  const router = useRouter();

  const validateTicker = (value: string): boolean => {
    // Aceita letras e numeros, minimo 4 caracteres, maximo 6
    const regex = /^[A-Z]{4}[0-9]{1,2}$/;
    return regex.test(value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = ticker.trim().toUpperCase();

    if (!normalized) {
      setError('Digite um ticker');
      return;
    }

    if (!validateTicker(normalized)) {
      setError('Ticker invalido. Ex: PETR4, VALE3');
      return;
    }

    setError('');

    if (onSubmit) {
      onSubmit(normalized);
    } else {
      router.push(`/asset/${normalized}`);
    }
  };

  const handleChange = (value: string) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setTicker(normalized);
    if (error) setError('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="ex: PETR4"
          value={ticker}
          onChange={(e) => handleChange(e.target.value)}
          className="flex-1 text-lg uppercase"
          maxLength={6}
          aria-label="Codigo do ativo"
        />
        <Button type="submit" size="lg" disabled={!ticker.trim()}>
          <Search className="mr-2 h-4 w-4" />
          Analisar
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
