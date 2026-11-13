import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { DocumentRenderer } from '@keystatic/core/renderer';
import {
  ArrowLeft,
  ArrowUpRight,
  GitFork,
  Star,
} from 'lucide-react';
import { getAllTools, getToolDetail } from '@/lib/tools';
import { getSiteSettings, SITE_URL } from '@/lib/site';
import { SiteHeader } from '@/components/SiteHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Footer } from '@/components/Footer';
import { CloneCommand } from '@/components/CloneCommand';
import { CodeBlockEnhancer } from '@/components/CodeBlockEnhancer';
import { categoryLabels } from '@/components/ToolCard';
import { GithubIcon } from '@/components/icons/GithubIcon';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Resolve the slug and its data before rendering.
export const instant = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  'use cache';
  const { slug } = await params;
  cacheLife('minutes');
  cacheTag('github-repos', `github-tool-${slug}`);
  const detail = await getToolDetail(slug);
  if (!detail) {
    return {
      title: 'Project not found',
      robots: { index: false, follow: false },
    };
  }

  const { tool } = detail;
  const toolUrl = `${SITE_URL}/tools/${slug}`;
  const keywords = Array.from(
    new Set([
      tool.name,
      categoryLabels[tool.category] ?? tool.category,
      ...tool.tags,
      'open source',
      'developer tool',
      'daedalabs',
    ])
  );

  return {
    title: tool.name,
    description: tool.tagline,
    keywords,
    alternates: {
      canonical: toolUrl,
    },
    authors: [{ name: 'juhenes', url: 'https://github.com/juhenes' }],
    openGraph: {
      title: `${tool.name} · daedalabs`,
      description: tool.tagline,
      url: toolUrl,
      siteName: 'daedalabs',
      locale: 'en_US',
      type: 'article',
      ...(tool.releaseDate ? { publishedTime: tool.releaseDate } : {}),
      tags: [...tool.tags],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${tool.name} · daedalabs`,
      description: tool.tagline,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ToolDetailPage({ params }: PageProps) {
  'use cache';
  const { slug } = await params;
  cacheLife('minutes');
  cacheTag('github-repos', `github-tool-${slug}`, `github-readme-${slug}`);
  const [site, detail, allTools] = await Promise.all([
    getSiteSettings(),
    getToolDetail(slug),
    getAllTools(),
  ]);

  if (!detail) notFound();

  const { tool, contentAST, readmeHtml } = detail;
  const category = categoryLabels[tool.category] ?? categoryLabels.other;
  const otherTools = allTools.filter((entry) => entry.slug !== slug).slice(0, 4);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': ['SoftwareApplication', 'SoftwareSourceCode'],
      '@id': `${SITE_URL}/tools/${slug}#software`,
      name: tool.name,
      headline: tool.tagline,
      description: tool.tagline,
      applicationCategory: category,
      operatingSystem: 'Cross-platform',
      url: `${SITE_URL}/tools/${slug}`,
      ...(tool.githubUrl ? { codeRepository: tool.githubUrl } : {}),
      ...(tool.tags && tool.tags.length > 0 ? { programmingLanguage: tool.tags } : {}),
      ...(tool.releaseDate ? { datePublished: tool.releaseDate } : {}),
      author: {
        '@type': 'Person',
        name: site.authorName,
        url: site.authorUrl,
      },
      publisher: {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: site.name,
        url: SITE_URL,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: SITE_URL,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Projects',
          item: `${SITE_URL}/#tools`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: tool.name,
          item: `${SITE_URL}/tools/${slug}`,
        },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SiteHeader siteName={site.name} githubOrg={site.githubOrg} />
      <ThemeToggle />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-24 pt-24 sm:px-8 sm:pt-28">
        <nav aria-label="Breadcrumb">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-dim transition-colors hover:text-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>All projects</span>
          </Link>
        </nav>

      <header className="mt-8 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
          <span>{category}</span>
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
                <Star className="h-3 w-3 fill-accent text-accent" aria-hidden="true" />
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

        <h1 className="mt-3 text-[2rem] font-semibold leading-[1.1] tracking-[-0.035em] text-ink sm:text-[2.75rem]">
          {tool.name}
        </h1>

        <p className="mt-3 max-w-2xl text-pretty text-[15px] leading-relaxed text-ink-muted">
          {tool.tagline}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          {tool.githubUrl && (
            <a
              href={tool.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface/60 px-3 text-[12px] font-medium text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
            >
              <GithubIcon className="h-3.5 w-3.5" aria-hidden="true" />
              <span>GitHub</span>
            </a>
          )}

          {tool.demoUrl && (
            <a
              href={tool.demoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface/60 px-3 text-[12px] font-medium text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Live demo</span>
            </a>
          )}

          {tool.npmUrl && (
            <a
              href={tool.npmUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-surface/60 px-3 text-[12px] font-medium text-ink-muted transition-colors duration-200 hover:border-line-strong hover:text-ink"
            >
              <span>npm</span>
            </a>
          )}
        </div>

        {tool.githubUrl && (
          <div className="mt-4 max-w-xl">
            <CloneCommand repoUrl={tool.githubUrl} />
          </div>
        )}
      </header>

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_13rem] lg:gap-14">
        <div className="min-w-0">
          <CodeBlockEnhancer />
          {contentAST ? (
            <article className="prose-dl max-w-[70ch]">
              <DocumentRenderer document={contentAST} />
            </article>
          ) : readmeHtml ? (
            <article
              className="prose-dl max-w-[70ch]"
              dangerouslySetInnerHTML={{ __html: readmeHtml }}
            />
          ) : (
            <p className="text-sm text-ink-dim">
              No documentation has been written for this project yet.
            </p>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:h-fit">
          <dl className="divide-y divide-line border-y border-line">
            <div className="flex items-baseline justify-between gap-4 py-2.5">
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
                Category
              </dt>
              <dd className="text-[12px] text-ink-muted">{category}</dd>
            </div>
            {tool.releaseDate && (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
                  Released
                </dt>
                <dd className="text-[12px] text-ink-muted">{tool.releaseDate}</dd>
              </div>
            )}
            {typeof tool.stargazersCount === 'number' && tool.stargazersCount > 0 && (
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
                  Stars
                </dt>
                <dd className="text-[12px] text-ink-muted">{tool.stargazersCount}</dd>
              </div>
            )}
            {tool.tags.length > 0 && (
              <div className="flex items-start justify-between gap-4 py-2.5">
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-dim">
                  Tags
                </dt>
                <dd className="text-right font-mono text-[11px] leading-relaxed text-ink-muted">
                  {tool.tags.join(' · ')}
                </dd>
              </div>
            )}
          </dl>

          {otherTools.length > 0 && (
            <div className="mt-10">
              <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-dim">
                More projects
              </h2>
              <ul className="mt-2 divide-y divide-line">
                {otherTools.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/tools/${other.slug}`}
                      className="group flex items-center justify-between gap-3 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-ink-muted transition-colors group-hover:text-ink">
                          {other.name}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-ink-dim">
                          {categoryLabels[other.category] ?? categoryLabels.other}
                        </span>
                      </span>
                      <ArrowUpRight
                        className="h-3.5 w-3.5 shrink-0 text-ink-dim transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
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
