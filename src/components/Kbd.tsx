import type { ReactNode } from 'react';

interface KbdProps {
  children: ReactNode;
  className?: string;
}

export function Kbd({ children, className = '' }: KbdProps) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[10px] leading-none text-ink-dim ${className}`}
    >
      {children}
    </kbd>
  );
}
