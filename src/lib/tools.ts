import { cache } from 'react';
import { getOrgRepos, getSingleRepo, getRepoReadme, repoToToolItem } from '@/lib/github';
import { renderReadme } from '@/lib/markdown';
import { ToolItem } from '@/components/ToolCard';
import projectsSnapshot from '@/content/projects.snapshot.json';

export interface UnifiedTool extends ToolItem {
  stargazersCount?: number;
  forksCount?: number;
  isFromGithub?: boolean;
  readmeHtml?: string | null;
}

export type ToolsSyncStatus = 'fresh' | 'cached' | 'unavailable';

export interface GetAllToolsResult {
  tools: UnifiedTool[];
  status: ToolsSyncStatus;
  isStale: boolean;
}

function sortTools(tools: UnifiedTool[]) {
  tools.sort((a, b) => {
    // Featured first
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    // Newest release/creation date next
    return (b.releaseDate || '').localeCompare(a.releaseDate || '');
  });
}

/**
 * Fetch all organization tools.
 * Wrapped in React cache() to deduplicate requests across metadata, page, and sitemap.
 */
export const getAllTools = cache(
  async function getAllTools(): Promise<GetAllToolsResult> {
    const org = process.env.GITHUB_ORG || 'daedalabs';
    try {
      const githubRepos = await getOrgRepos(org);
      const tools: UnifiedTool[] = githubRepos.map((repo) => {
        const tool = repoToToolItem(repo);
        return {
          ...tool,
          stargazersCount: repo.stargazers_count,
          forksCount: repo.forks_count,
          isFromGithub: true,
          readmeHtml: null,
        };
      });

      sortTools(tools);
      return {
        tools,
        status: 'fresh',
        isStale: false,
      };
    } catch (err) {
      console.warn('Failed to fetch repos from GitHub, serving fallback snapshot:', err);
      const snapshotTools = (projectsSnapshot as ToolItem[]).map((item) => ({
        ...item,
        isFromGithub: true,
        readmeHtml: null,
      }));
      sortTools(snapshotTools);

      return {
        tools: snapshotTools,
        status: snapshotTools.length > 0 ? 'cached' : 'unavailable',
        isStale: true,
      };
    }
  }
);

/**
 * Fetch detail for a single tool directly without paginating the entire organization.
 * Wrapped in React cache() to deduplicate requests across page, metadata, and OG image.
 */
export const getToolDetail = cache(async function getToolDetail(slug: string) {
  const org = process.env.GITHUB_ORG || 'daedalabs';
  let toolData: UnifiedTool | null = null;
  let repoName: string = slug;

  try {
    const matchingRepo = await getSingleRepo(slug, org);
    if (matchingRepo) {
      const base = repoToToolItem(matchingRepo);
      toolData = {
        ...base,
        slug,
        stargazersCount: matchingRepo.stargazers_count || 0,
        forksCount: matchingRepo.forks_count || 0,
        isFromGithub: true,
      };
      repoName = matchingRepo.name;
    }
  } catch (err) {
    console.warn(`Failed to fetch single repo ${slug} from GitHub API:`, err);
  }

  // Fallback to snapshot if GitHub did not return the repository
  if (!toolData) {
    const snapshotMatch = (projectsSnapshot as ToolItem[]).find(
      (p) => p.slug.toLowerCase() === slug.toLowerCase()
    );
    if (snapshotMatch) {
      toolData = {
        ...snapshotMatch,
        isFromGithub: true,
      };
      repoName = snapshotMatch.slug;
    }
  }

  if (!toolData) {
    return null;
  }

  const readmeMarkdown = await getRepoReadme(repoName, org);
  const readmeHtml = readmeMarkdown
    ? renderReadme(readmeMarkdown, { org, repo: repoName })
    : null;

  const tool: UnifiedTool = {
    ...toolData,
    readmeHtml,
  };

  return {
    tool,
    readmeMarkdown,
    readmeHtml,
  };
});
