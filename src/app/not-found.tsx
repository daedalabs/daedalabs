import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { getSiteSettings } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Footer } from '@/components/Footer';

export default async function NotFound() {
  'use cache';
  const site = await getSiteSettings();

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader siteName={site.name} githubOrg={site.githubOrg} />
      <ThemeToggle />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-32 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim">
          Error 404
        </p>

        <h1 className="mt-4 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[3rem]">
          Project not found
        </h1>

        <p className="mt-4 max-w-md text-pretty text-[15px] leading-relaxed text-ink-muted">
          This route does not exist, or the project has not been published to
          daedalabs yet.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-2.5">
          <Link
            href="/"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-medium text-canvas transition-colors duration-200 hover:bg-ink/90"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>All projects</span>
          </Link>

          <a
            href={site.githubOrg}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-surface/50 px-4 text-[13px] font-medium text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
          >
            <span>GitHub organisation</span>
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </main>

      <Footer
        siteName={site.name}
        authorName={site.authorName}
        authorUrl={site.authorUrl}
        year={site.year}
      />
    </div>
  );
}
