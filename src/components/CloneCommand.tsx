'use client';

import { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface CloneCommandProps {
  repoUrl: string;
}

export function CloneCommand({ repoUrl }: CloneCommandProps) {
  const [copied, setCopied] = useState(false);
  const command = `git clone ${repoUrl}.git`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy', error);
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface/60 py-1.5 pl-3 pr-1.5">
      <Terminal className="h-3.5 w-3.5 shrink-0 text-ink-dim" aria-hidden="true" />

      <code className="min-w-0 flex-1 select-all truncate font-mono text-[11px] text-ink-muted">
        {command}
      </code>

      <button
        type="button"
        onClick={handleCopy}
        title="Copy git clone command"
        className="flex shrink-0 items-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-medium text-ink-dim transition-colors duration-150 hover:bg-elevated hover:text-ink"
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 text-accent" aria-hidden="true" />
            <span className="text-accent">Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3 w-3" aria-hidden="true" />
            <span>Copy</span>
          </>
        )}
      </button>

      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Clone command copied to clipboard' : ''}
      </span>
    </div>
  );
}
