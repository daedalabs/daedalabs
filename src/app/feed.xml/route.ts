import { getAllTools } from '@/lib/tools';
import { getSiteSettings, SITE_URL } from '@/lib/site';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeCdata(str: string): string {
  // Escape CDATA terminator sequences by splitting them
  return str.replace(/]]>/g, ']]]]><![CDATA[>');
}

export async function GET() {
  const [siteSettings, tools] = await Promise.all([getSiteSettings(), getAllTools()]);

  const siteUrl = SITE_URL;
  const siteName = siteSettings?.name || 'Daedalabs';
  const siteDesc =
    siteSettings?.description ||
    'Software, tools, and systems built from scratch by juhenes.';

  const itemsXml = tools
    .map((tool) => {
      const toolUrl = `${siteUrl}/tools/${escapeXml(tool.slug)}`;
      const pubDate = tool.releaseDate
        ? new Date(tool.releaseDate).toUTCString()
        : new Date().toUTCString();

      return `
    <item>
      <title><![CDATA[${safeCdata(tool.name)}]]></title>
      <link>${toolUrl}</link>
      <guid>${toolUrl}</guid>
      <description><![CDATA[${safeCdata(tool.tagline)}]]></description>
      <category>${escapeXml(tool.category)}</category>
      <pubDate>${escapeXml(pubDate)}</pubDate>
    </item>`;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteName)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteDesc)}</description>
    <language>en</language>
    <atom:link href="${escapeXml(siteUrl)}/feed.xml" rel="self" type="application/rss+xml"/>
    ${itemsXml}
  </channel>
</rss>`;

  return new Response(xml.trim(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate',
    },
  });
}
