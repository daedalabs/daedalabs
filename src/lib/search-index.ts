import { getRepoReadme } from './github';
import { readmeToSearchText } from './readme-text';
import { getAllTools } from './tools';

export interface SearchIndexPayload {
  generatedAt: string;
  /** Plain-text README content keyed by project slug. */
  docs: Record<string, string>;
}

/** Upper bound so a large organization cannot make this route unbounded. */
const MAX_REPOS = 50;
const CONCURRENCY = 4;
const README_TIMEOUT_MS = 4_000;
const TOTAL_BUDGET_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}

/**
 * Build the client-side search index: the plain text of every project README.
 *
 * README requests go through `getRepoReadme`, which is cached with the same
 * 5 minute revalidation and tags as the detail pages, so repeat visitors cost
 * no extra GitHub requests. Individual requests and the whole build are
 * bounded so a slow GitHub response can never hold the route open indefinitely.
 */
export async function buildSearchIndex(): Promise<SearchIndexPayload> {
  const { tools } = await getAllTools();
  const docs: Record<string, string> = {};
  const queue = tools.slice(0, MAX_REPOS);
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length && Date.now() < deadline) {
      const tool = queue[cursor];
      cursor += 1;

      try {
        const markdown = await withTimeout(getRepoReadme(tool.slug), README_TIMEOUT_MS);
        if (!markdown) continue;

        const text = readmeToSearchText(markdown);
        if (text) docs[tool.slug] = text;
      } catch (error) {
        console.warn(`Search index: skipped README for ${tool.slug}:`, error);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
  );

  return { generatedAt: new Date().toISOString(), docs };
}
