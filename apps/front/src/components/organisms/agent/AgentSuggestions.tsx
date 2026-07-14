'use client';

import { Button } from '@/components/ui/button';
import type { AgentSuggestion } from '@/types/agent';

interface AgentSuggestionsProps {
  suggestions: AgentSuggestion[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function AgentSuggestions({
  suggestions,
  onSelect,
  disabled,
}: AgentSuggestionsProps) {
  return (
    <div className="flex flex-wrap gap-2 p-3 border-t border-slate-100">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion.label}
          variant="outline"
          size="sm"
          onClick={() => onSelect(suggestion.prompt)}
          disabled={disabled}
          className="text-xs"
        >
          {suggestion.label}
        </Button>
      ))}
    </div>
  );
}
