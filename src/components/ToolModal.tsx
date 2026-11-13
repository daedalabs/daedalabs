'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ExternalLink, GitFork, Star, X } from 'lucide-react';
import { ToolItem, categoryLabels } from './ToolCard';
import { CloneCommand } from './CloneCommand';
import { CodeBlockEnhancer } from './CodeBlockEnhancer';
import { GithubIcon } from './icons/GithubIcon';
import { Kbd } from './Kbd';

interface ToolModalProps {
  tool: ToolItem | null;
  onClose: () => void;
}

export function ToolModal({ tool, onClose }: ToolModalProps) {
  const [fetchedHtml, setFetchedHtml] = useState<Record<string, string>>({});
  const [fetchErrors, setFetchErrors] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Close on Escape, trap focus, and lock background scroll while open.
  useEffect(() => {
    if (!tool) return;

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;

    const focusTimer = setTimeout(() => {
      modalContainerRef.current?.focus();
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab' && modalContainerRef.current) {
        const focusableElements = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];

          if (document.activeElement === modalContainerRef.current) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          } else if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement?.focus?.();
    };
  }, [tool]);

  // Load README content on demand when it is not already available locally.
  useEffect(() => {
    if (
      !tool ||
      tool.readmeHtml ||
      tool.slug in fetchedHtml ||
      fetchErrors.has(tool.slug)
    ) {
      return;
    }

    const toolSlug = tool.slug;
    let isCancelled = false;

    const timer = setTimeout(() => {
      if (!isCancelled) setIsLoading(true);
    }, 60);

    fetch(`/api/tools/${toolSlug}`)
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load readme');
        return response.json();
      })
      .then((data) => {
        if (isCancelled) return;
        setFetchedHtml((previous) => ({
          ...previous,
          [toolSlug]:
            data.readmeHtml ||
            '<p class="text-ink-dim">No documentation available for this project yet.</p>',
        }));
        setIsLoading(false);
      })
      .catch(() => {
        if (isCancelled) return;
        setFetchErrors((previous) => new Set(previous).add(toolSlug));
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [tool, fetchedHtml, fetchErrors]);

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [tool?.slug]);

  if (!tool) return null;

  const activeReadmeHtml = tool.readmeHtml || fetchedHtml[tool.slug] || null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-tool-title"
      aria-describedby="modal-tool-tagline"
    >
      <div
        ref={modalContainerRef}
        tabIndex={-1}
        className="relative flex max-h-[92svh] w-full max-w-3xl flex-col overflow-hidden rounded-t-xl border border-line bg-canvas shadow-2xl shadow-black/60 focus:outline-none sm:max-h-[90vh] sm:rounded-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="border-b border-line px-5 pb-5 pt-5 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
              <span>{categoryLabels[tool.category] ?? categoryLabels.other}</span>
              {tool.releaseDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{tool.releaseDate}</span>
                </>
              )}
              {typeof tool.stargazersCount === 'number' && tool.stargazersCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <Star
                      className="h-3 w-3 fill-accent text-accent"
                      aria-hidden="true"
                    />
                    {tool.stargazersCount}
                    <span className="sr-only">stars</span>
                  </span>
                </>
              )}
              {typeof tool.forksCount === 'number' && tool.forksCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3 w-3" aria-hidden="true" />
                    {tool.forksCount}
                    <span className="sr-only">forks</span>
                  </span>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {tool.githubUrl && (
                <a
                  href={tool.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="View repository on GitHub"
                  aria-label="View repository on GitHub"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-surface hover:text-ink"
                >
                  <GithubIcon className="h-4 w-4" />
                </a>
              )}

              {tool.demoUrl && (
                <a
                  href={tool.demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open live demo"
                  aria-label="Open live demo"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-surface hover:text-ink"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                title="Close (Esc)"
                aria-label="Close modal"
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-md text-ink-dim transition-colors hover:bg-surface hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <h2
            id="modal-tool-title"
            className="mt-4 text-[22px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-2xl"
          >
            {tool.name}
          </h2>

          <p
            id="modal-tool-tagline"
            className="mt-1.5 text-[13px] leading-relaxed text-ink-muted sm:text-sm"
          >
            {tool.tagline}
          </p>

          {tool.githubUrl && (
            <div className="mt-4 max-w-xl">
              <CloneCommand repoUrl={tool.githubUrl} />
            </div>
          )}

          {tool.tags && tool.tags.length > 0 && (
            <p className="mt-3.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-dim">
              {tool.tags.join(' · ')}
            </p>
          )}
        </header>

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-5 py-6 sm:px-7 sm:py-7"
        >
          <CodeBlockEnhancer />

          {isLoading && !activeReadmeHtml ? (
            <div
              role="status"
              aria-live="polite"
              aria-busy="true"
              aria-label="Loading documentation"
            >
              <div className="space-y-3">
                <div className="h-3.5 w-2/5 animate-pulse rounded bg-surface" />
                <div className="h-3 w-full animate-pulse rounded bg-surface" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-surface" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-surface" />
                <div className="pt-3">
                  <div className="h-3 w-1/3 animate-pulse rounded bg-surface" />
                  <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-surface" />
                </div>
              </div>
              <span className="sr-only">Loading documentation</span>
            </div>
          ) : fetchErrors.has(tool.slug) ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              role="alert"
            >
              <p className="text-sm text-ink-muted">
                Could not load this repository&apos;s documentation.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFetchErrors((previous) => {
                    const next = new Set(previous);
                    next.delete(tool.slug);
                    return next;
                  });
                }}
                className="mt-4 inline-flex h-9 items-center rounded-md border border-line px-3 text-[12px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
              >
                Try again
              </button>
            </div>
          ) : activeReadmeHtml ? (
            <div
              className="prose-dl max-w-[68ch]"
              dangerouslySetInnerHTML={{ __html: activeReadmeHtml }}
            />
          ) : (
            <p className="py-12 text-center text-sm text-ink-dim">
              No documentation has been written for this project yet.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-line px-5 py-3 sm:px-7">
          <Link
            href={`/tools/${tool.slug}`}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <span>Open full page</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <span className="hidden items-center gap-1.5 text-[11px] text-ink-dim sm:flex">
            <Kbd>esc</Kbd>
            <span>to close</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
