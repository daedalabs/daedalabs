import { micromark } from 'micromark';
import { getOrgRepos, getRepoReadme, repoToToolItem } from '@/lib/github';
import { ToolItem } from '@/components/ToolCard';

export interface UnifiedTool extends ToolItem {
  stargazersCount?: number;
  forksCount?: number;
  isFromGithub?: boolean;
  readmeHtml?: string | null;
}

export async function getAllTools(): Promise<UnifiedTool[]> {
  const githubRepos = await getOrgRepos();

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

  return tools.sort((a, b) => {
    // Featured first
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    // Newest release/creation date next
    return (b.releaseDate || '').localeCompare(a.releaseDate || '');
  });
}

export async function getToolDetail(slug: string) {
  const githubRepos = await getOrgRepos();
  const matchingRepo = githubRepos.find(
    (r) => r.name.toLowerCase() === slug.toLowerCase()
  );

  if (!matchingRepo) {
    return null;
  }

  const readmeMarkdown = await getRepoReadme(matchingRepo.name);
  const readmeHtml = readmeMarkdown ? micromark(readmeMarkdown) : null;
  const base = repoToToolItem(matchingRepo);

  const tool: UnifiedTool = {
    ...base,
    slug,
    stargazersCount: matchingRepo.stargazers_count || 0,
    forksCount: matchingRepo.forks_count || 0,
    isFromGithub: true,
    readmeHtml,
  };

  return {
    tool,
    readmeMarkdown,
    readmeHtml,
  };
}
