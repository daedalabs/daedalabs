import fs from 'fs';
import path from 'path';
import { micromark } from 'micromark';
import { reader } from '@/lib/keystatic';
import { getOrgRepos, getRepoReadme, repoToToolItem } from '@/lib/github';
import { ToolItem } from '@/components/ToolCard';

export interface UnifiedTool extends ToolItem {
  stargazersCount?: number;
  forksCount?: number;
  isFromGithub?: boolean;
  readmeHtml?: string | null;
}

export async function getAllTools(): Promise<UnifiedTool[]> {
  const [cmsToolsData, githubRepos] = await Promise.all([
    reader.collections.tools.all(),
    getOrgRepos(),
  ]);

  const toolsMap = new Map<string, UnifiedTool>();

  // 1. Process GitHub Repositories first (automated source of truth)
  for (const repo of githubRepos) {
    const tool = repoToToolItem(repo);
    toolsMap.set(tool.slug.toLowerCase(), {
      ...tool,
      stargazersCount: repo.stargazers_count,
      forksCount: repo.forks_count,
      isFromGithub: true,
      readmeHtml: null,
    });
  }

  // 2. Process / Overlay Keystatic CMS tools (curation, overrides, writeups)
  for (const { slug, entry } of cmsToolsData) {
    const key = slug.toLowerCase();
    const existingGithub = toolsMap.get(key);

    // Read local markdown body for instant modal rendering
    let localReadmeHtml: string | null = null;
    try {
      const filePath = path.join(process.cwd(), 'src/content/tools', `${slug}.mdoc`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const md = raw.replace(/^---[\s\S]*?---\s*/, '');
        if (md.trim()) {
          localReadmeHtml = micromark(md);
        }
      }
    } catch {
      // Ignore if cannot read file directly
    }

    toolsMap.set(key, {
      slug,
      name: entry.name,
      tagline: entry.tagline,
      status:
        (entry.status as ToolItem['status']) || existingGithub?.status || 'experiment',
      category:
        (entry.category as ToolItem['category']) || existingGithub?.category || 'other',
      tags: entry.tags && entry.tags.length > 0 ? entry.tags : existingGithub?.tags || [],
      githubUrl: entry.githubUrl || existingGithub?.githubUrl || null,
      demoUrl: entry.demoUrl || existingGithub?.demoUrl || null,
      npmUrl: entry.npmUrl || existingGithub?.npmUrl || null,
      featured:
        entry.featured !== undefined && entry.featured !== null
          ? entry.featured
          : (existingGithub?.featured ?? false),
      releaseDate: entry.releaseDate || existingGithub?.releaseDate || null,
      stargazersCount: existingGithub?.stargazersCount || 0,
      forksCount: existingGithub?.forksCount || 0,
      isFromGithub: !!existingGithub,
      readmeHtml: localReadmeHtml,
    });
  }

  return Array.from(toolsMap.values()).sort((a, b) => {
    // Featured first
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    // Newest release/creation date next
    return (b.releaseDate || '').localeCompare(a.releaseDate || '');
  });
}

export async function getToolDetail(slug: string) {
  const [cmsTool, githubRepos] = await Promise.all([
    reader.collections.tools.read(slug),
    getOrgRepos(),
  ]);

  const matchingRepo = githubRepos.find(
    (r) => r.name.toLowerCase() === slug.toLowerCase()
  );

  if (!cmsTool && !matchingRepo) {
    return null;
  }

  let contentAST = null;
  let readmeMarkdown: string | null = null;

  if (cmsTool) {
    contentAST = await cmsTool.content();
  }

  // Consistent README source precedence: CMS local writeup takes precedence, fallback to GitHub repo README
  try {
    const filePath = path.join(process.cwd(), 'src/content/tools', `${slug}.mdoc`);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const md = raw.replace(/^---[\s\S]*?---\s*/, '');
      if (md.trim()) {
        readmeMarkdown = md;
      }
    }
  } catch {
    // Ignore
  }

  if (!readmeMarkdown && matchingRepo) {
    readmeMarkdown = await getRepoReadme(matchingRepo.name);
  }

  const readmeHtml = readmeMarkdown ? micromark(readmeMarkdown) : null;
  const base = matchingRepo ? repoToToolItem(matchingRepo) : null;

  const tool: UnifiedTool = {
    slug,
    name: cmsTool?.name || base?.name || slug,
    tagline: cmsTool?.tagline || base?.tagline || '',
    status: (cmsTool?.status as ToolItem['status']) || base?.status || 'experiment',
    category: (cmsTool?.category as ToolItem['category']) || base?.category || 'other',
    tags: cmsTool?.tags && cmsTool.tags.length > 0 ? cmsTool.tags : base?.tags || [],
    githubUrl: cmsTool?.githubUrl || base?.githubUrl || null,
    demoUrl: cmsTool?.demoUrl || base?.demoUrl || null,
    npmUrl: cmsTool?.npmUrl || null,
    featured:
      cmsTool?.featured !== undefined && cmsTool?.featured !== null
        ? cmsTool.featured
        : (base?.featured ?? false),
    releaseDate: cmsTool?.releaseDate || base?.releaseDate || null,
    stargazersCount: matchingRepo?.stargazers_count || 0,
    forksCount: matchingRepo?.forks_count || 0,
    isFromGithub: !!matchingRepo,
    readmeHtml,
  };

  return {
    tool,
    contentAST,
    readmeMarkdown,
    readmeHtml,
  };
}
