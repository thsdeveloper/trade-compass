'use client';

import * as React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Botão para ações movidas a IA (recurso premium).
 *
 * Vocabulário visual único em todo o app: gradiente vibrante em pan contínuo,
 * ícone Sparkles pulsando em loop e brilho varrendo o botão. Use SOMENTE em
 * ações que disparam IA ("Analisar com IA", chat do agente, etc.) — em ações
 * comuns, use o <Button /> padrão. Animações respeitam prefers-reduced-motion
 * (definidas em globals.css: .btn-ai, .btn-ai-icon, .btn-ai-shine).
 */

const sizeClasses = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 gap-1.5 px-3',
  lg: 'h-10 px-6',
  'icon-lg': "size-14 rounded-full [&_svg:not([class*='size-'])]:size-6",
} as const;

interface AIButtonProps extends React.ComponentProps<'button'> {
  /** Troca o Sparkles animado por um spinner e desabilita o botão */
  loading?: boolean;
  size?: keyof typeof sizeClasses;
}

export function AIButton({
  loading = false,
  size = 'default',
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: AIButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      data-slot="ai-button"
      className={cn(
        'btn-ai relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-md text-sm font-medium whitespace-nowrap text-white shadow-md shadow-fuchsia-600/20 transition-all outline-none',
        'hover:shadow-lg hover:shadow-fuchsia-600/30 active:scale-[0.98]',
        'focus-visible:ring-[3px] focus-visible:ring-fuchsia-400/60',
        'disabled:pointer-events-none disabled:opacity-60',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className="btn-ai-shine pointer-events-none absolute" aria-hidden="true" />
      {loading ? (
        <Loader2 className="animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="btn-ai-icon" aria-hidden="true" />
      )}
      {children != null && <span className="relative">{children}</span>}
    </button>
  );
}
