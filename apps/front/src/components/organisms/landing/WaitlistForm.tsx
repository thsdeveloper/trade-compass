'use client';

import { useId, useState } from 'react';
import { Check, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type WaitlistSource = 'landing_hero' | 'landing_mobile' | 'landing_footer';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

interface WaitlistFormProps {
  source: WaitlistSource;
  className?: string;
}

function collectUtmParams(): Record<string, string> | undefined {
  if (typeof window === 'undefined') return undefined;
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key.startsWith('utm_')) utm[key] = value;
  });
  return Object.keys(utm).length > 0 ? utm : undefined;
}

export function WaitlistForm({ source, className }: WaitlistFormProps) {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === 'loading') return;

    // Honeypot: bots preenchem o campo oculto; humanos nunca o veem
    const honeypot = new FormData(event.currentTarget).get('website');
    if (typeof honeypot === 'string' && honeypot.length > 0) {
      setStatus('success');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          source,
          utm: collectUtmParams(),
        }),
      });

      if (response.ok) {
        setStatus('success');
        return;
      }

      const body = await response.json().catch(() => null);
      setErrorMessage(
        body?.message ?? 'Não foi possível concluir a inscrição. Tente novamente.'
      );
      setStatus('error');
    } catch {
      setErrorMessage('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-3 rounded-3xl border border-emerald-400/30 bg-emerald-500/10 px-6 py-3.5 min-h-14 backdrop-blur-sm',
          className
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-4 w-4 text-emerald-300" aria-hidden />
        </span>
        <p className="text-sm sm:text-base font-medium text-white">
          Você está na lista. Avisaremos por e-mail quando chegar a sua vez.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false} className={className}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor={inputId} className="sr-only">
            Seu melhor e-mail
          </label>
          <input
            id={inputId}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            placeholder="Seu melhor e-mail"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            aria-invalid={status === 'error'}
            aria-describedby={status === 'error' ? `${inputId}-error` : undefined}
            className={cn(
              'w-full h-12 rounded-full px-5 text-base text-white bg-white/10 backdrop-blur-sm',
              'border placeholder:text-slate-300',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:border-transparent',
              status === 'error' ? 'border-red-400/60' : 'border-white/25'
            )}
          />
        </div>

        {/* Honeypot anti-bot: invisível e fora da ordem de tabulação */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />

        <button
          type="submit"
          disabled={status === 'loading'}
          className={cn(
            'inline-flex items-center justify-center gap-2 h-12 rounded-full px-7 text-base font-semibold',
            'bg-blue-600 text-white shadow-xl shadow-blue-950/40 transition-colors',
            'hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300',
            'disabled:opacity-70 disabled:cursor-not-allowed'
          )}
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              Enviando…
            </>
          ) : (
            <>
              Entrar na lista
              <ArrowRight className="h-5 w-5" aria-hidden />
            </>
          )}
        </button>
      </div>

      <div aria-live="assertive">
        {status === 'error' && (
          <p id={`${inputId}-error`} className="mt-3 text-sm text-red-300">
            {errorMessage}
          </p>
        )}
      </div>
    </form>
  );
}
