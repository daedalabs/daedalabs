import type { Metadata } from 'next';
import { cacheLife, cacheTag } from 'next/cache';
import { getAllTools } from '@/lib/tools';
import { getSiteSettings, SITE_URL } from '@/lib/site';
import { Footer } from '@/components/Footer';
import { ToolsExplorer } from '@/components/ToolsExplorer';

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
  },
};

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
          description: 'Catalog of open-source tools and software systems published by daedalabs',
          numberOfItems: tools.length,
          itemListElement: tools.map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/tools/${tool.slug}`,
            name: tool.name,
            description: tool.tagline,
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
