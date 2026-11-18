'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import Link from 'next/link';
import { ArrowDown, LayoutGrid, List, Search, Shuffle, Star, X } from 'lucide-react';
import { ToolCard, ToolItem, categoryLabels } from './ToolCard';
import { ToolModal } from './ToolModal';
import { SiteHeader } from './SiteHeader';
import { ThemeToggle } from './ThemeToggle';
import { SortMenu, type SortOption } from './SortMenu';
import { Kbd } from './Kbd';
import { GithubIcon } from './icons/GithubIcon';

interface SiteInfo {
  name: string;
  headline: string;
  description: string;
  githubOrg: string;
  authorName: string;
  authorUrl: string;
}

interface ToolsExplorerProps {
  initialTools: ToolItem[];
  site?: SiteInfo;
  syncStatus?: 'fresh' | 'cached' | 'unavailable';
  isStale?: boolean;
}

const ALL_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'byox', label: 'Build your own' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'web', label: 'Web apps' },
  { id: 'cli', label: 'CLI tools' },
  { id: 'hardware', label: 'Hardware' },
  { id: 'microservice', label: 'Microservices' },
  { id: 'automation', label: 'Automation' },
  { id: 'ai', label: 'AI' },
  { id: 'library', label: 'Libraries' },
] as const;

type ViewMode = 'grid' | 'table';

const emptySubscribe = () => () => {};

/** Space between the viewport top and the tools section once docked. */
const HEADER_OFFSET = 58;

/** How far the hero shrinks as the catalog slides over it. */
const HERO_SCALE = 0.1;

const DEFAULT_SITE: SiteInfo = {
  name: 'daedalabs',
  headline: 'Capable open source tools.',
  description:
    'daedalabs is a repository of open tools, free for everyone to use and build on.',
  githubOrg: 'https://github.com/daedalabs',
  authorName: 'juhenes',
  authorUrl: 'https://github.com/juhenes',
};

interface SearchFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  compact?: boolean;
}

function SearchField({
  id,
  value,
  onChange,
  onEnter,
  inputRef,
  compact,
}: SearchFieldProps) {
  return (
    <div className="relative w-full">
      <label htmlFor={id} className="sr-only">
        Search projects
      </label>
      <Search
        aria-hidden="true"
        className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim ${
          compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
        }`}
      />
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onEnter();
        }}
        placeholder={compact ? 'Search' : 'Search projects'}
        autoComplete="off"
        spellCheck={false}
        className={`w-full rounded-md text-ink placeholder:text-ink-dim transition-colors duration-200 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/15 ${
          compact
            ? 'h-9 border border-transparent bg-elevated/60 pl-9 pr-10 text-[13px] hover:bg-elevated focus:bg-elevated'
            : 'h-11 border border-line bg-surface/60 pl-10 pr-12 text-sm hover:border-line-strong focus:border-line-strong focus:bg-surface'
        }`}
      />
      <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center">
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Clear search"
            aria-label="Clear search"
            className="rounded p-1 text-ink-dim transition-colors hover:text-ink"
          >
            <X className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </button>
        ) : (
          <Kbd className="hidden sm:inline-flex">/</Kbd>
        )}
      </div>
    </div>
  );
}

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

function ViewToggle({ value, onChange }: ViewToggleProps) {
  const buttonClass = (active: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded transition-colors duration-150 ${
      active ? 'bg-elevated text-ink' : 'text-ink-dim hover:text-ink'
    }`;

  return (
    <div
      role="group"
      aria-label="View mode"
      className="flex shrink-0 items-center rounded-md border border-line bg-surface/60 p-0.5"
    >
      <button
        type="button"
        onClick={() => onChange('grid')}
        aria-pressed={value === 'grid'}
        aria-label="Grid view"
        title="Grid view"
        className={buttonClass(value === 'grid')}
      >
        <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={value === 'table'}
        aria-label="Compact list view"
        title="Compact list view"
        className={buttonClass(value === 'table')}
      >
        <List className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ToolsExplorer({
  initialTools,
  site,
  isStale = false,
}: ToolsExplorerProps) {
  const siteInfo = site || DEFAULT_SITE;
  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedModalTool, setSelectedModalTool] = useState<ToolItem | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);
  const heroSectionRef = useRef<HTMLElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);

  // Derive categories populated from tools actually present in the data, always including 'all'
  const categories = useMemo(() => {
    const present = new Set(initialTools.map((t) => t.category));
    return ALL_CATEGORIES.filter(
      (entry) => entry.id === 'all' || present.has(entry.id as ToolItem['category'])
    );
  }, [initialTools]);

  // Keep URL updated without full navigation
  const updateUrl = useCallback(
    (
      newSearch: string,
      newCategory: string,
      newSort: SortOption,
      newView: ViewMode,
      modalTool: ToolItem | null,
      push = false
    ) => {
      const params = new URLSearchParams();
      if (newSearch.trim()) params.set('q', newSearch.trim());
      if (newCategory !== 'all') params.set('category', newCategory);
      if (newSort !== 'newest') params.set('sort', newSort);
      if (newView !== 'grid') params.set('view', newView);
      if (modalTool) params.set('tool', modalTool.slug);

      const queryString = params.toString();
      const nextUrl = queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname;

      if (push) {
        window.history.pushState(null, '', nextUrl);
      } else {
        window.history.replaceState(null, '', nextUrl);
      }
    },
    []
  );

  // Restore filters from the URL and saved view preference after hydration.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const query = params.get('q');
    if (query) setSearch(query);

    const category = params.get('category');
    if (category && ALL_CATEGORIES.some((entry) => entry.id === category)) {
      setSelectedCategory(category);
    }

    const sort = params.get('sort');
    if (sort === 'newest' || sort === 'stars' || sort === 'name') setSortBy(sort);

    const view = params.get('view') || localStorage.getItem('daedalabs_view');
    if (view === 'grid' || view === 'table') setViewMode(view);

    const toolSlug = params.get('tool');
    if (toolSlug) {
      const match = initialTools.find((tool) => tool.slug === toolSlug);
      if (match) setSelectedModalTool(match);
    }
  }, [initialTools]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Popstate listener: Back / Forward updates search, category, sort, view, and open modal
  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      setSearch(params.get('q') || '');

      const category = params.get('category');
      if (category && ALL_CATEGORIES.some((entry) => entry.id === category)) {
        setSelectedCategory(category);
      } else {
        setSelectedCategory('all');
      }

      const sort = params.get('sort');
      if (sort === 'newest' || sort === 'stars' || sort === 'name') {
        setSortBy(sort);
      } else {
        setSortBy('newest');
      }

      const view = params.get('view') || localStorage.getItem('daedalabs_view');
      if (view === 'grid' || view === 'table') {
        setViewMode(view);
      }

      const toolSlug = params.get('tool');
      if (toolSlug) {
        const match = initialTools.find((t) => t.slug === toolSlug);
        setSelectedModalTool(match || null);
      } else {
        setSelectedModalTool(null);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [initialTools]);

  // Native smooth scrolling:
  // Tracks scroll position for the docked header reveal and optional hero visual scaling.
  // Respects prefers-reduced-motion. No wheel hijacking or preventDefault().
  useEffect(() => {
    let frame: number | null = null;
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      const scrollY = window.scrollY;
      const scrolled = scrollY > HEADER_OFFSET;
      setIsScrolled(scrolled);

      if (heroContentRef.current) {
        if (reducedMotionQuery.matches) {
          heroContentRef.current.style.transform = 'none';
          heroContentRef.current.style.opacity = '1';
        } else {
          const heroHeight = heroSectionRef.current?.offsetHeight || window.innerHeight;
          const progress = Math.min(1, Math.max(0, scrollY / Math.max(1, heroHeight)));
          heroContentRef.current.style.transform = `scale(${1 - HERO_SCALE * progress})`;
          heroContentRef.current.style.opacity = `${1 - 0.25 * progress}`;
        }
      }
    };

    const onScroll = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        update();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);

  /** Smooth scroll down to the projects catalog */
  const scrollToTools = useCallback(() => {
    const heroH = heroSectionRef.current?.offsetHeight || window.innerHeight;
    const dock = Math.max(0, heroH - HEADER_OFFSET);
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    window.scrollTo({
      top: dock,
      behavior: prefersReducedMotion ? 'instant' : 'smooth',
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (selectedModalTool) return;

      const activeInput = isScrolled ? headerInputRef.current : heroInputRef.current;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;

      if (
        (event.key === '/' || event.code === 'Slash') &&
        tag !== 'INPUT' &&
        tag !== 'TEXTAREA'
      ) {
        event.preventDefault();
        activeInput?.focus();
        return;
      }

      if (
        event.key === 'Escape' &&
        (document.activeElement === heroInputRef.current ||
          document.activeElement === headerInputRef.current)
      ) {
        setSearch('');
        updateUrl('', selectedCategory, sortBy, viewMode, selectedModalTool, false);
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedModalTool, isScrolled, selectedCategory, sortBy, viewMode, updateUrl]);

  const filteredTools = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = initialTools.filter((tool) => {
      if (selectedCategory !== 'all' && tool.category !== selectedCategory) {
        return false;
      }
      if (!query) return true;

      return (
        tool.name.toLowerCase().includes(query) ||
        tool.tagline.toLowerCase().includes(query) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'stars') {
        const starsA = a.stargazersCount || 0;
        const starsB = b.stargazersCount || 0;
        if (starsB !== starsA) return starsB - starsA;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return (b.releaseDate || '').localeCompare(a.releaseDate || '');
    });
  }, [initialTools, search, selectedCategory, sortBy]);

  const hasActiveFilters = search.trim() !== '' || selectedCategory !== 'all';
  const activeCategoryLabel = ALL_CATEGORIES.find(
    (entry) => entry.id === selectedCategory
  )?.label;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    updateUrl(value, selectedCategory, sortBy, viewMode, selectedModalTool, false);
  };

  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    updateUrl(search, cat, sortBy, viewMode, selectedModalTool, true);
  };

  const handleSelectSort = (sort: SortOption) => {
    setSortBy(sort);
    updateUrl(search, selectedCategory, sort, viewMode, selectedModalTool, true);
  };

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('daedalabs_view', mode);
    updateUrl(search, selectedCategory, sortBy, mode, selectedModalTool, true);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    updateUrl('', 'all', sortBy, viewMode, selectedModalTool, true);
  };

  const handleSelectTool = (tool: ToolItem) => {
    setSelectedModalTool(tool);
    updateUrl(search, selectedCategory, sortBy, viewMode, tool, true);
  };

  const handleCloseModal = () => {
    setSelectedModalTool(null);
    updateUrl(search, selectedCategory, sortBy, viewMode, null, false);
  };

  const handleRandomTool = () => {
    if (initialTools.length === 0) return;
    const random = initialTools[Math.floor(Math.random() * initialTools.length)];
    handleSelectTool(random);
  };

  const openFirstResult = () => {
    if (filteredTools.length > 0) handleSelectTool(filteredTools[0]);
  };

  return (
    <>
      <SiteHeader
        hideOnTop
        revealed={isScrolled}
        siteName={siteInfo.name}
        githubOrg={siteInfo.githubOrg}
        actions={
          isScrolled ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <label htmlFor="header-category" className="sr-only">
                Category
              </label>
              <select
                id="header-category"
                value={selectedCategory}
                onChange={(e) => handleSelectCategory(e.target.value)}
                className="hidden md:inline-flex h-9 rounded-md border border-line bg-surface/60 px-2 font-mono text-[11px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-elevated text-ink">
                    {c.label}
                  </option>
                ))}
              </select>
              <SortMenu value={sortBy} onChange={handleSelectSort} />
              <button
                type="button"
                onClick={handleRandomTool}
                title="Preview a random project"
                aria-label="Preview a random project"
                className="flex h-9 w-9 items-center justify-center rounded-md text-ink-dim transition-colors duration-200 hover:bg-surface hover:text-ink"
              >
                <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <ViewToggle value={viewMode} onChange={handleSetViewMode} />
            </div>
          ) : null
        }
      >
        {isScrolled ? (
          <div
            role="search"
            aria-label="Search projects"
            className="mx-auto w-full max-w-sm"
          >
            <SearchField
              id="header-search"
              compact
              value={search}
              onChange={handleSearchChange}
              onEnter={openFirstResult}
              inputRef={headerInputRef}
            />
          </div>
        ) : null}
      </SiteHeader>

      <ThemeToggle />

      <main
        data-hydrated={isHydrated ? 'true' : undefined}
        inert={selectedModalTool ? true : undefined}
        className="flex-1"
      >
        <section
          ref={heroSectionRef}
          className="sticky top-0 flex h-[100svh] flex-col overflow-hidden"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="absolute left-1/2 top-0 h-[36rem] w-[72rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(closest-side,var(--hero-glow),transparent)]" />
          </div>

          <div
            ref={heroContentRef}
            className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 pb-14 pt-24 sm:px-8 will-change-transform"
          >
            <div className="max-w-2xl">
              <h1 className="text-[clamp(3.25rem,8.5vw,5.5rem)] font-semibold lowercase leading-[0.92] tracking-[-0.055em] text-ink">
                DAEDALABS
              </h1>

              <h2 className="mt-6 max-w-xl text-balance text-xl font-medium leading-[1.25] tracking-[-0.02em] text-ink sm:text-[1.625rem]">
                {siteInfo.headline}
              </h2>

              <p className="mt-3 max-w-lg text-pretty text-[15px] leading-relaxed text-ink-muted">
                {siteInfo.description}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-2.5">
                <a
                  href="#tools"
                  onClick={(event) => {
                    event.preventDefault();
                    scrollToTools();
                  }}
                  className="group inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-canvas transition-colors duration-200 hover:bg-ink/90"
                >
                  <span>Browse projects</span>
                  <ArrowDown
                    className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-0.5"
                    aria-hidden="true"
                  />
                </a>
                <a
                  href={siteInfo.githubOrg}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface/50 px-4 text-[13px] font-medium text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
                >
                  <GithubIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>GitHub</span>
                </a>
              </div>

              {/* Search & Discovery Toolbar */}
              <div className="mt-8 space-y-3.5">
                <div
                  role="search"
                  aria-label="Filter projects"
                  className="flex items-center gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <SearchField
                      id="hero-search"
                      value={search}
                      onChange={handleSearchChange}
                      onEnter={openFirstResult}
                      inputRef={heroInputRef}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRandomTool}
                    title="Preview a random project"
                    aria-label="Preview a random project"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-line bg-surface/60 text-ink-dim transition-colors duration-200 hover:border-line-strong hover:text-ink"
                  >
                    <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Discovery toolbar in hero */}
                <div
                  role="toolbar"
                  aria-label="Project discovery controls"
                  className="flex flex-wrap items-center justify-between gap-3 pt-0.5"
                >
                  <div
                    role="group"
                    aria-label="Filter by category"
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {categories.map((cat) => {
                      const active = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleSelectCategory(cat.id)}
                          aria-pressed={active}
                          className={`inline-flex h-8 items-center rounded-md px-2.5 font-mono text-[11px] transition-colors duration-150 ${
                            active
                              ? 'bg-ink text-canvas font-medium shadow-sm'
                              : 'border border-line bg-surface/50 text-ink-muted hover:border-line-strong hover:text-ink'
                          }`}
                        >
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <SortMenu value={sortBy} onChange={handleSelectSort} />
                    <ViewToggle value={viewMode} onChange={handleSetViewMode} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="tools"
          aria-label="Projects"
          className="relative z-10 flex min-h-[calc(100svh-98px)] flex-col scroll-mt-16 border-t border-line bg-canvas shadow-[0_-18px_50px_-30px_rgba(0,0,0,0.4)]"
        >
          <h2 className="sr-only">Catalog of Open Source Projects</h2>
          <div
            className={`mx-auto flex w-full max-w-5xl flex-col px-5 sm:px-8 ${
              initialTools.length === 0
                ? 'h-full flex-1 py-4 sm:py-5'
                : 'pb-16 pt-6 sm:pb-20 sm:pt-8'
            }`}
          >
            {isStale && (
              <div
                role="status"
                aria-live="polite"
                className="mb-5 flex items-center gap-2 rounded-md border border-line bg-surface/60 px-3.5 py-2.5 font-mono text-[12px] text-ink-dim"
              >
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent animate-pulse"
                  aria-hidden="true"
                />
                <span>
                  Showing the last successful sync. GitHub is temporarily unavailable.
                </span>
              </div>
            )}

            {hasActiveFilters && (
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] text-ink-muted" aria-live="polite">
                    <span className="text-ink">{filteredTools.length}</span> of{' '}
                    {initialTools.length} projects
                  </p>
                  {selectedCategory !== 'all' && (
                    <span className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink-muted">
                      <span>category: {activeCategoryLabel}</span>
                      <button
                        type="button"
                        onClick={() => handleSelectCategory('all')}
                        title="Remove category filter"
                        aria-label="Remove category filter"
                        className="text-ink-dim transition-colors hover:text-ink"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )}
                  {search.trim() && (
                    <span className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-1 font-mono text-[11px] text-ink-muted">
                      <span>query: &ldquo;{search.trim()}&rdquo;</span>
                      <button
                        type="button"
                        onClick={() => handleSearchChange('')}
                        title="Remove search query"
                        aria-label="Remove search query"
                        className="text-ink-dim transition-colors hover:text-ink"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-mono text-[11px] text-ink-dim underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
                >
                  Clear all
                </button>
              </div>
            )}

            <div className="flex h-full flex-1 flex-col">
              {initialTools.length === 0 ? (
                <div className="flex h-full flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong p-6 text-center">
                  <p className="text-[16px] font-medium text-ink">
                    No projects published yet
                  </p>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-muted">
                    Public repositories added to{' '}
                    <a
                      href={siteInfo.githubOrg}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line-strong underline-offset-2 transition-colors hover:text-accent"
                    >
                      github.com/{siteInfo.name}
                    </a>{' '}
                    will automatically appear here.
                  </p>
                </div>
              ) : filteredTools.length === 0 ? (
                <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line-strong p-6 text-center">
                  <p className="text-[16px] font-medium text-ink">No projects found</p>
                  <p className="mt-2 max-w-md text-[13px] leading-relaxed text-ink-muted">
                    Nothing here matches{' '}
                    {search.trim() ? `“${search.trim()}”` : 'the current filters'}
                    {selectedCategory !== 'all' ? ` in ${activeCategoryLabel}` : ''}. Try
                    a different search.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-5 inline-flex h-9 items-center rounded-md border border-line px-3 text-[12px] font-medium text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
                  >
                    Clear filters
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} onSelect={handleSelectTool} />
                  ))}
                </div>
              ) : (
                <div role="list" className="border-y border-line">
                  {filteredTools.map((tool, index) => (
                    <div
                      key={tool.slug}
                      role="listitem"
                      tabIndex={0}
                      onClick={() => handleSelectTool(tool)}
                      onKeyDown={(event) => {
                        if (
                          (event.key === 'Enter' || event.key === ' ') &&
                          event.target === event.currentTarget
                        ) {
                          event.preventDefault();
                          handleSelectTool(tool);
                        }
                      }}
                      className="group flex cursor-pointer flex-col gap-2 border-b border-line px-2 py-3.5 transition-colors duration-150 last:border-b-0 hover:bg-surface/60 focus-visible:bg-surface/60 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-4"
                    >
                      <span className="hidden w-6 shrink-0 font-mono text-[10px] tabular-nums text-ink-dim sm:block">
                        {String(index + 1).padStart(2, '0')}
                      </span>

                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                        <Link
                          href={`/tools/${tool.slug}`}
                          onClick={(event) => {
                            if (
                              !event.metaKey &&
                              !event.ctrlKey &&
                              !event.shiftKey &&
                              !event.altKey &&
                              event.button === 0
                            ) {
                              event.preventDefault();
                              handleSelectTool(tool);
                            }
                          }}
                          className="shrink-0 text-[13px] font-medium text-ink transition-colors hover:text-accent focus-visible:underline"
                        >
                          {tool.name}
                        </Link>
                        <span className="truncate text-[12px] text-ink-muted">
                          {tool.tagline}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        {tool.featured && (
                          <span className="rounded border border-accent/30 bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
                            featured
                          </span>
                        )}
                        {tool.status === 'archived' && (
                          <span className="rounded border border-line bg-surface/80 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-ink-dim">
                            archived
                          </span>
                        )}
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-dim">
                          {categoryLabels[tool.category] ?? categoryLabels.other}
                        </span>

                        {typeof tool.stargazersCount === 'number' &&
                          tool.stargazersCount > 0 && (
                            <span className="flex items-center gap-1 font-mono text-[10px] text-ink-dim">
                              <Star
                                className="h-3 w-3 fill-accent text-accent"
                                aria-hidden="true"
                              />
                              <span>{tool.stargazersCount}</span>
                            </span>
                          )}

                        <div
                          className="flex items-center gap-0.5"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {tool.githubUrl && (
                            <a
                              href={tool.githubUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="View source on GitHub"
                              aria-label={`View ${tool.name} on GitHub`}
                              className="rounded p-1.5 text-ink-dim transition-colors hover:bg-elevated hover:text-ink"
                            >
                              <GithubIcon className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <ToolModal tool={selectedModalTool} onClose={handleCloseModal} />
    </>
  );
}
