import { cacheLife, cacheTag } from 'next/cache';
import { getAllTools } from '@/lib/tools';
import { getSiteSettings } from '@/lib/site';
import { Footer } from '@/components/Footer';
import { ToolsExplorer } from '@/components/ToolsExplorer';

export default async function HomePage() {
  'use cache';
  cacheLife('minutes');
  cacheTag('github-repos');
  const [site, tools] = await Promise.all([getSiteSettings(), getAllTools()]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
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
