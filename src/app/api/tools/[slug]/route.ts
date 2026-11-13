import { NextResponse } from 'next/server';
import { getToolDetail } from '@/lib/tools';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const detail = await getToolDetail(slug);

  if (!detail) {
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
  }

  return NextResponse.json(
    {
      tool: detail.tool,
      readmeHtml: detail.readmeHtml,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    }
  );
}
