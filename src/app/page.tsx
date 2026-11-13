import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { getAllTools } from '@/lib/tools';
import { getSiteSettings, SITE_URL } from '@/lib/site';
import { categoryLabels } from '@/components/ToolCard';
import { Footer } from '@/components/Footer';
import { ToolsExplorer } from '@/components/ToolsExplorer';

export async function generateMetadata(): Promise<Metadata> {
  'use cache';
  cacheLife('minutes');
  cacheTag('github-repos');
  const [site, tools] = await Promise.all([getSiteSettings(), getAllTools()]);
  const siteUrl = SITE_URL;

  const toolNames = tools.map((t) => t.name);
  const toolTags = tools.flatMap((t) => t.tags);
  const toolCategories = Array.from(
    new Set(tools.map((t) => categoryLabels[t.category] ?? t.category))
  );

  const keywords = Array.from(
    new Set([
      'daedalabs',
      'open source',
      'developer tools',
      'cli tools',
      'software systems',
      'build your own',
      'experiments',
      ...toolNames,
      ...toolCategories,
      ...toolTags,
    ])
  );

  const toolSummary =
    tools.length > 0
      ? ` Featuring ${tools.length} open-source tool${tools.length === 1 ? '' : 's'}: ${tools
          .slice(0, 8)
          .map((t) => t.name)
          .join(', ')}${tools.length > 8 ? ', and more' : ''}.`
      : '';
  const description = `${site.description}${toolSummary}`;

  return {
    title: `${site.name} · Capable open source tools`,
    description,
    keywords,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: `${site.name} · Capable open source tools`,
      description,
      url: siteUrl,
      siteName: site.name,
      type: 'website',
      images: [
        {
          url: `${siteUrl}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${site.name} open source tools catalog`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${site.name} · Capable open source tools`,
      description,
      images: [`${siteUrl}/opengraph-image`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function HomePage() {
  'use cache';
  cacheLife('minutes');
  cacheTag('github-repos');
  const [site, tools] = await Promise.all([getSiteSettings(), getAllTools()]);

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: site.name,
    url: SITE_URL,
    description: site.description,
    inLanguage: 'en-US',
    publisher: {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: site.name,
      url: SITE_URL,
      logo: `${SITE_URL}/logo-512.png`,
      sameAs: [site.githubOrg, site.authorUrl],
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: site.name,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-512.png`,
    sameAs: [site.githubOrg, site.authorUrl],
    description: site.description,
  };

  const itemListJsonLd =
    tools.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'Open Source Tools & Experiments',
          description:
            'Catalog of open-source tools and software systems published by daedalabs',
          numberOfItems: tools.length,
          itemListElement: tools.map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/tools/${tool.slug}`,
            name: tool.name,
            item: {
              '@type': ['SoftwareApplication', 'SoftwareSourceCode'],
              name: tool.name,
              description: tool.tagline,
              url: `${SITE_URL}/tools/${tool.slug}`,
              applicationCategory: categoryLabels[tool.category] ?? tool.category,
              operatingSystem: 'Cross-platform',
              ...(tool.githubUrl ? { codeRepository: tool.githubUrl } : {}),
              ...(tool.tags && tool.tags.length > 0
                ? { programmingLanguage: tool.tags }
                : {}),
              ...(tool.license ? { license: tool.license } : {}),
              ...(tool.stargazersCount !== undefined
                ? {
                    interactionStatistic: [
                      {
                        '@type': 'InteractionCounter',
                        interactionType: 'https://schema.org/LikeAction',
                        userInteractionCount: tool.stargazersCount,
                      },
                    ],
                  }
                : {}),
            },
          })),
        }
      : null;

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      )}
      <ToolsExplorer initialTools={tools} site={site} />
      <Footer
        siteName={site.name}
        authorName={site.authorName}
        authorUrl={site.authorUrl}
        year={site.year}
      />
    </div>
  );
}
