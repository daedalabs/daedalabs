import { MetadataRoute } from 'next';
import { getAllTools } from '@/lib/tools';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tools = await getAllTools();
  const siteUrl = 'https://daedalabs.org';

  const toolRoutes = tools.map((tool) => ({
    url: `${siteUrl}/tools/${tool.slug}`,
    lastModified: tool.releaseDate ? new Date(tool.releaseDate) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...toolRoutes,
  ];
}
