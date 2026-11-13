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
}

const GITHUB_TOKEN =
  process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT;

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
}

/**
 * Fetch all public repositories for an organization, paginating through all pages.
 */
export async function getOrgRepos(
  orgName: string = process.env.GITHUB_ORG || 'daedalabs'
): Promise<GithubRepo[]> {
  const allRepos: GithubRepoRaw[] = [];
  let page = 1;

  try {
    while (true) {
      const res = await fetch(
        `https://api.github.com/orgs/${orgName}/repos?sort=updated&per_page=100&page=${page}`,
        {
          headers: GITHUB_HEADERS,
          next: { revalidate: 300, tags: ['github-repos'] },
        }
      );

      if (!res.ok) {
        if (res.status === 404) break;
        console.warn(`GitHub API (${orgName}/repos) returned status ${res.status}`);
        break;
      }

      const data: GithubRepoRaw[] = await res.json();
      if (!Array.isArray(data) || data.length === 0) break;

      allRepos.push(...data);
      if (data.length < 100) break;
      page++;
    }
  } catch (err) {
    console.error('Failed to fetch org repositories from GitHub:', err);
    return [];
  }

  const IGNORED_REPOS = new Set([
    '.github',
    'daedalabs',
    'website',
    'daedalabs-web',
    'daedalabs-website',
    'daedalabs.github.io',
  ]);

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
    }));
}

/**
 * Fetch the raw Markdown README for a specific repository.
 */
export async function getRepoReadme(
  repoName: string,
  orgName: string = process.env.GITHUB_ORG || 'daedalabs'
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${orgName}/${repoName}/readme`,
      {
        headers: {
          ...GITHUB_HEADERS,
          Accept: 'application/vnd.github.v3.raw',
        },
        next: { revalidate: 300, tags: [`github-readme-${repoName}`] },
      }
    );

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
  // Infer category from topics, name, or language
  let category:
    'byox' | 'web' | 'cli' | 'library' | 'ai' | 'automation' | 'microservice' | 'other' =
    'other';
  const topicsLower = repo.topics.map((t) => t.toLowerCase());
  const nameLower = repo.name.toLowerCase();

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
  } else if (topicsLower.includes('cli') || topicsLower.includes('terminal')) {
    category = 'cli';
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
  };
}
