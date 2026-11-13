import { DaedalabsMark } from '@/components/icons/DaedalabsMark';

interface FooterProps {
  siteName?: string;
  authorName?: string;
  authorUrl?: string;
  year: number;
}

export function Footer({
  siteName = 'daedalabs',
  authorName = 'juhenes',
  authorUrl = 'https://github.com/juhenes',
  year,
}: FooterProps) {
  return (
    <footer className="sticky bottom-0 z-30 h-10 border-t border-line bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-5xl items-center justify-between gap-x-4 px-5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim sm:px-8">
        <span className="flex items-center gap-2">
          <DaedalabsMark className="h-3 w-3 text-ink-dim" />
          <span className="lowercase tracking-[-0.01em] text-ink-muted">{siteName}</span>
          <span aria-hidden="true" className="text-line-strong">
            /
          </span>
          <span>© {year}</span>
        </span>

        <span>
          made by{' '}
          <a
            href={authorUrl}
            target="_blank"
            rel="noreferrer"
            className="text-ink-muted underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
          >
            {authorName}
          </a>
        </span>
      </div>
    </footer>
  );
}
