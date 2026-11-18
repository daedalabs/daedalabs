import { NextResponse } from 'next/server';
import { buildSearchIndex, type SearchIndexPayload } from '@/lib/search-index';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
} as const;

function emptyIndex(): SearchIndexPayload {
  return { generatedAt: new Date().toISOString(), docs: {} };
}

/**
 * Plain-text README index for content-aware client search.
 *
 * The site degrades gracefully: if GitHub is unavailable the route returns an
 * empty index and the explorer keeps searching names, taglines, and tags.
 */
export async function GET() {
  try {
    const index = await buildSearchIndex();
    return NextResponse.json(index, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error('Failed to build the search index:', error);
    return NextResponse.json(emptyIndex(), {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
