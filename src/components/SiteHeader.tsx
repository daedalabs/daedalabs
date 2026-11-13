'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DaedalabsMark } from '@/components/icons/DaedalabsMark';
import { GithubIcon } from '@/components/icons/GithubIcon';

interface SiteHeaderProps {
  siteName?: string;
  githubOrg?: string;
  /** Slide the header in only after the page has scrolled. */
  hideOnTop?: boolean;
  /** Controlled reveal state, when the parent already tracks scrolling. */
  revealed?: boolean;
  /** Center slot: search, filters, and other page-level controls. */
  children?: React.ReactNode;
  /** Right-aligned controls that sit before the GitHub link. */
  actions?: React.ReactNode;
}

export function SiteHeader({
  siteName = 'daedalabs',
  githubOrg = 'https://github.com/daedalabs',
  hideOnTop = false,
  revealed,
  children,
  actions,
}: SiteHeaderProps) {
  const [scrolledPastTop, setScrolledPastTop] = useState(false);
  const isControlled = revealed !== undefined;
  const isVisible = hideOnTop ? (isControlled ? revealed : scrolledPastTop) : true;

  useEffect(() => {
    if (!hideOnTop || isControlled) return;

    const onScroll = () => setScrolledPastTop(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [hideOnTop, isControlled]);

  return (
    <header
      inert={!isVisible ? true : undefined}
      aria-hidden={!isVisible}
      className={`fixed inset-x-0 top-0 z-40 border-b transition-[transform,opacity,background-color,border-color] duration-300 ease-out ${
        isVisible
          ? 'translate-y-0 border-line bg-canvas/85 opacity-100 backdrop-blur-xl pointer-events-auto'
          : 'pointer-events-none -translate-y-full border-transparent bg-transparent opacity-0'
      }`}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 pl-5 pr-16 sm:pl-8 sm:pr-20">
        <Link
          href="/"
          aria-label={`${siteName} home`}
          className="group flex shrink-0 items-center gap-2 rounded-md"
        >
          <DaedalabsMark className="h-5 w-5 text-ink transition-opacity duration-200 group-hover:opacity-70" />
          <span className="hidden text-[13px] font-semibold lowercase tracking-[-0.02em] text-ink sm:block">
            {siteName.toLowerCase()}
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>

        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <a
            href={githubOrg}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub organisation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-dim transition-colors duration-200 hover:bg-surface hover:text-ink"
          >
            <GithubIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </header>
  );
}
