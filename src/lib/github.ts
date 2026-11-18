export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  created_at: string;
  archived: boolean;
  license?: {
    key: string;
    name: string;
    spdx_id: string;
    url: string | null;
  } | null;
}

export class GithubFetchError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'GithubFetchError';
  }
}

const GITHUB_TOKEN =
  process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT;

function getApiBase(): string {
  const base = process.env.GITHUB_API_BASE;
  if (!base || base === 'undefined') {
    return 'https://api.github.com';
  }
  return base;
}

const GITHUB_HEADERS: HeadersInit = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'daedalabs-website',
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

interface GithubRepoRaw {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  topics?: string[];
  updated_at: string;
  created_at?: string;
  pushed_at?: string;
  archived?: boolean;
  fork?: boolean;
  license?: {
    key: string;
    name: string;
    spdx_id: string;
    url: string | null;
  } | null;
}

const IGNORED_REPOS = new Set([
  '.github',
  'daedalabs',
  'website',
  'daedalabs-web',
  'daedalabs-website',
  'daedalabs.github.io',
]);

/**
 * Fetch all public repositories for an organization, paginating through all pages.
 * Throws GithubFetchError on network failure or non-404 error responses so that callers
 * can distinguish empty organizations from API outages or rate limits.
 */
export async function getOrgRepos(
  orgName: string = process.env.GITHUB_ORG || 'daedalabs'
): Promise<GithubRepo[]> {
  const allRepos: GithubRepoRaw[] = [];
  let page = 1;

  try {
    while (true) {
      const res = await fetch(
        `${getApiBase()}/orgs/${orgName}/repos?sort=updated&per_page=100&page=${page}`,
        {
          headers: GITHUB_HEADERS,
          next: { revalidate: 300, tags: ['github-repos'] },
        }
      );

      if (!res.ok) {
        throw new GithubFetchError(
          `GitHub API (${orgName}/repos) returned status ${res.status}`,
          res.status
        );
      }

      const data: GithubRepoRaw[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      allRepos.push(...data);
      if (data.length < 100) break;
      page++;
    }
  } catch (err) {
    if (err instanceof GithubFetchError) throw err;
    throw new GithubFetchError(
      `Failed to fetch org repositories from GitHub: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  return allRepos
    .filter(
      (repo: GithubRepoRaw) =>
        !repo.fork &&
        !IGNORED_REPOS.has(repo.name.toLowerCase()) &&
        !repo.topics?.includes('daedalabs-website')
    )
    .map((repo: GithubRepoRaw) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      homepage: repo.homepage || null,
      language: repo.language || null,
      stargazers_count: repo.stargazers_count || 0,
      forks_count: repo.forks_count || 0,
      topics: repo.topics || [],
      updated_at: repo.updated_at,
      created_at: repo.created_at || repo.updated_at,
      archived: Boolean(repo.archived),
      license: repo.license || null,
    }));
}

/**
 * Fetch a single repository directly by name without paginating the entire organization.
 */
export async function getSingleRepo(
  repoName: string,
  orgName: string = process.env.GITHUB_ORG || 'daedalabs'
): Promise<GithubRepo | null> {
  if (IGNORED_REPOS.has(repoName.toLowerCase())) {
    return null;
  }

  try {
    const res = await fetch(`${getApiBase()}/repos/${orgName}/${repoName}`, {
      headers: GITHUB_HEADERS,
      next: { revalidate: 300, tags: ['github-repos', `github-tool-${repoName}`] },
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      throw new GithubFetchError(
        `GitHub API (${orgName}/${repoName}) returned status ${res.status}`,
        res.status
      );
    }

    const repo: GithubRepoRaw = await res.json();
    if (repo.fork || repo.topics?.includes('daedalabs-website')) {
      return null;
    }

    return {
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      html_url: repo.html_url,
      homepage: repo.homepage || null,
      language: repo.language || null,
      stargazers_count: repo.stargazers_count || 0,
      forks_count: repo.forks_count || 0,
      topics: repo.topics || [],
      updated_at: repo.updated_at,
      created_at: repo.created_at || repo.updated_at,
      archived: Boolean(repo.archived),
      license: repo.license || null,
    };
  } catch (err) {
    if (err instanceof GithubFetchError) throw err;
    throw new GithubFetchError(
      `Failed to fetch repo ${orgName}/${repoName}: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Fetch the raw Markdown README for a specific repository.
 * Attempts raw.githubusercontent.com first to bypass rate-limited API quota.
 */
export async function getRepoReadme(
  repoName: string,
  orgName: string = process.env.GITHUB_ORG || 'daedalabs'
): Promise<string | null> {
  // 1. Try raw CDN first (avoids API quota; /HEAD/ preserves default branch agnostic resolution)
  try {
    const rawRes = await fetch(
      `https://raw.githubusercontent.com/${orgName}/${repoName}/HEAD/README.md`,
      {
        headers: { 'User-Agent': 'daedalabs-website' },
        next: { revalidate: 300, tags: [`github-readme-${repoName}`] },
      }
    );

    if (rawRes.ok) {
      return await rawRes.text();
    }
  } catch (err) {
    console.warn(`Failed to fetch raw README for ${orgName}/${repoName}:`, err);
  }

  // 2. Fall back to GitHub API endpoint (handles alternate casing or filenames like readme.markdown)
  try {
    const res = await fetch(`${getApiBase()}/repos/${orgName}/${repoName}/readme`, {
      headers: {
        ...GITHUB_HEADERS,
        Accept: 'application/vnd.github.v3.raw',
      },
      next: { revalidate: 300, tags: [`github-readme-${repoName}`] },
    });

    if (!res.ok) {
      return null;
    }

    return await res.text();
  } catch (err) {
    console.error(`Failed to fetch README for ${orgName}/${repoName}:`, err);
    return null;
  }
}

/**
 * Convert a GitHub repository into a unified ToolItem.
 */
export function repoToToolItem(repo: GithubRepo) {
  // Infer category from topics, name, description, or language
  let category:
    | 'byox'
    | 'desktop'
    | 'web'
    | 'cli'
    | 'library'
    | 'ai'
    | 'automation'
    | 'hardware'
    | 'microservice'
    | 'other' = 'other';
  const topicsLower = repo.topics.map((t) => t.toLowerCase());
  const nameLower = repo.name.toLowerCase();
  const descLower = (repo.description || '').toLowerCase();

  if (
    topicsLower.includes('byox') ||
    topicsLower.includes('build-your-own') ||
    topicsLower.includes('from-scratch') ||
    topicsLower.includes('scratch') ||
    topicsLower.includes('recreation') ||
    nameLower.startsWith('byo-') ||
    nameLower.startsWith('build-your-own-') ||
    nameLower.startsWith('mini-')
  ) {
    category = 'byox';
  } else if (
    topicsLower.includes('desktop') ||
    topicsLower.includes('electron') ||
    topicsLower.includes('tauri') ||
    topicsLower.includes('wails') ||
    topicsLower.includes('gui') ||
    topicsLower.includes('desktop-app') ||
    /\bdesktop\b/i.test(descLower)
  ) {
    category = 'desktop';
  } else if (topicsLower.includes('cli') || topicsLower.includes('terminal')) {
    category = 'cli';
  } else if (
    topicsLower.includes('hardware') ||
    topicsLower.includes('iot') ||
    topicsLower.includes('embedded') ||
    topicsLower.includes('firmware')
  ) {
    category = 'hardware';
  } else if (
    topicsLower.includes('web') ||
    topicsLower.includes('nextjs') ||
    topicsLower.includes('frontend')
  ) {
    category = 'web';
  } else if (
    topicsLower.includes('microservice') ||
    topicsLower.includes('api') ||
    topicsLower.includes('service')
  ) {
    category = 'microservice';
  } else if (
    topicsLower.includes('ai') ||
    topicsLower.includes('llm') ||
    topicsLower.includes('machine-learning')
  ) {
    category = 'ai';
  } else if (
    topicsLower.includes('library') ||
    topicsLower.includes('sdk') ||
    topicsLower.includes('package')
  ) {
    category = 'library';
  } else if (
    topicsLower.includes('automation') ||
    topicsLower.includes('bot') ||
    topicsLower.includes('action')
  ) {
    category = 'automation';
  } else if (
    repo.language === 'Rust' ||
    repo.language === 'Go' ||
    repo.language === 'Shell'
  ) {
    category = 'cli';
  } else if (
    repo.language === 'TypeScript' ||
    repo.language === 'JavaScript' ||
    repo.language === 'HTML'
  ) {
    category = 'web';
  }

  // Infer status from topics or archived status
  let status: 'live' | 'beta' | 'experiment' | 'archived' = 'experiment';
  if (repo.archived) {
    status = 'archived';
  } else if (
    topicsLower.includes('live') ||
    topicsLower.includes('production') ||
    topicsLower.includes('stable')
  ) {
    status = 'live';
  } else if (topicsLower.includes('beta') || topicsLower.includes('wip')) {
    status = 'beta';
  }

  // Collect tags
  const tagsSet = new Set<string>();
  if (repo.language) tagsSet.add(repo.language);
  for (const topic of repo.topics) {
    if (!['daedalabs', 'tool', 'project'].includes(topic.toLowerCase())) {
      tagsSet.add(topic);
    }
  }

  return {
    slug: repo.name,
    name: repo.name,
    tagline: repo.description || `Open-source ${category} project by daedalabs.`,
    status,
    category,
    tags: Array.from(tagsSet),
    githubUrl: repo.html_url,
    demoUrl: repo.homepage,
    npmUrl: null,
    featured: topicsLower.includes('featured'),
    releaseDate: repo.created_at ? repo.created_at.split('T')[0] : null,
    updatedAt: repo.updated_at || null,
    isFromGithub: true,
    license: repo.license?.spdx_id || repo.license?.name || null,
    primaryLanguage: repo.language || null,
  };
}

/**
 * Extracts a clean, concise plain-text summary from a repository's README markdown
 * for rich search engine snippets and social previews.
 */
export function extractSummaryFromReadme(
  markdown: string | null | undefined,
  maxLength = 240
): string | null {
  if (!markdown) return null;

  const cleaned = markdown
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove markdown images & badges (e.g. ![badge](url))
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Unwrap links [text](url) -> text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove headings (# Heading)
    .replace(/^#+\s+.*$/gm, '')
    // Remove fenced code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Unwrap inline code `code` -> code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown formatting like bold, italics, blockquotes, HTML tags
    .replace(/<[^>]*>/g, '')
    .replace(/[*_~>#]/g, '')
    .split('\n')
    .map((line) => line.trim())
    // Find the first substantial descriptive paragraph (> 25 characters)
    .filter(
      (line) => line.length > 25 && !line.startsWith('http') && !line.startsWith('npm ')
    )
    .join(' ');

  if (!cleaned) return null;
  const singleLine = cleaned.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= maxLength) return singleLine;
  return singleLine.slice(0, maxLength).trim() + '...';
}
