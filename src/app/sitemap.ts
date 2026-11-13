import { MetadataRoute } from 'next';
import { getAllTools } from '@/lib/tools';
import { SITE_URL } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tools = await getAllTools();
  const siteUrl = SITE_URL;

  const toolRoutes = tools.map((tool) => ({
    url: `${siteUrl}/tools/${tool.slug}`,
    lastModified: tool.updatedAt
      ? new Date(tool.updatedAt)
      : tool.releaseDate
        ? new Date(tool.releaseDate)
        : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
    images: [`${siteUrl}/tools/${tool.slug}/opengraph-image`],
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
      images: [`${siteUrl}/opengraph-image`],
    },
    ...toolRoutes,
  ];
}
