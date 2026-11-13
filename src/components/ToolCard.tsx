import { ArrowUpRight, ExternalLink, Star } from 'lucide-react';
import { GithubIcon } from '@/components/icons/GithubIcon';

export interface ToolItem {
  slug: string;
  name: string;
  tagline: string;
  status: 'live' | 'beta' | 'experiment' | 'archived';
  category:
    | 'byox'
    | 'web'
    | 'cli'
    | 'library'
    | 'ai'
    | 'automation'
    | 'hardware'
    | 'microservice'
    | 'other';
  tags: readonly string[];
  githubUrl?: string | null;
  demoUrl?: string | null;
  npmUrl?: string | null;
  featured?: boolean;
  releaseDate?: string | null;
  stargazersCount?: number;
  forksCount?: number;
  isFromGithub?: boolean;
  readmeHtml?: string | null;
}

export const categoryLabels: Record<ToolItem['category'], string> = {
  byox: 'build your own',
  web: 'web',
  cli: 'cli',
  library: 'library',
  ai: 'ai',
  automation: 'automation',
  hardware: 'hardware',
  microservice: 'service',
  other: 'tool',
};

interface ToolCardProps {
  tool: ToolItem;
  onSelect?: (tool: ToolItem) => void;
}

export function ToolCard({ tool, onSelect }: ToolCardProps) {
  const category = categoryLabels[tool.category] ?? categoryLabels.other;
  const shownTags = tool.tags.slice(0, 2);
  const extraTags = tool.tags.length - shownTags.length;
  const tagsLabel =
    shownTags.length > 0
      ? `${shownTags.join(' · ')}${extraTags > 0 ? ` · +${extraTags}` : ''}`
      : '—';
  const stars = tool.stargazersCount ?? 0;

  return (
    <article className="group relative flex h-full flex-col rounded-lg border border-line bg-surface/40 p-4 transition-colors duration-200 hover:border-line-strong hover:bg-surface has-[button[data-card-trigger]:focus-visible]:border-line-strong has-[button[data-card-trigger]:focus-visible]:bg-surface has-[button[data-card-trigger]:focus-visible]:ring-1 has-[button[data-card-trigger]:focus-visible]:ring-accent/40">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-dim">
          {category}
        </span>

        <div className="relative z-20 flex items-center gap-0.5">
          {stars > 0 && (
            <span className="mr-1 flex items-center gap-1 font-mono text-[10px] text-ink-dim">
              <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
              <span>{stars}</span>
              <span className="sr-only">stars</span>
            </span>
          )}
          {tool.demoUrl && (
            <a
              href={tool.demoUrl}
              target="_blank"
              rel="noreferrer"
              title="Open live demo"
              aria-label={`Open ${tool.name} live demo`}
              className="rounded p-1.5 text-ink-dim transition-colors duration-150 hover:bg-elevated hover:text-ink"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {tool.githubUrl && (
            <a
              href={tool.githubUrl}
              target="_blank"
              rel="noreferrer"
              title="View source on GitHub"
              aria-label={`View ${tool.name} on GitHub`}
              className="rounded p-1.5 text-ink-dim transition-colors duration-150 hover:bg-elevated hover:text-ink"
            >
              <GithubIcon className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
        {onSelect ? (
          <button
            type="button"
            data-card-trigger
            onClick={() => onSelect(tool)}
            aria-label={`Read ${tool.name} documentation`}
            className="text-left font-semibold after:absolute after:inset-0 after:z-0 after:rounded-lg after:content-[''] focus-visible:outline-none"
          >
            {tool.name}
          </button>
        ) : (
          tool.name
        )}
      </h3>

      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-muted">
        {tool.tagline}
      </p>

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.08em] text-ink-dim">
            {tagsLabel}
          </span>

          {onSelect && (
            <span
              aria-hidden="true"
              className="flex shrink-0 items-center rounded p-1 text-ink-dim transition-colors duration-150 group-hover:text-ink"
            >
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
