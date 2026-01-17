import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        'fixed bottom-0 right-0 z-30 border-t border-sidebar-border bg-sidebar',
        'flex h-14 items-center px-4',
        className
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
        <p>MoneyCompass nao e recomendacao de investimento.</p>
      </div>
    </footer>
  );
}
