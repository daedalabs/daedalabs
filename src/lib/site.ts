import { reader } from '@/lib/keystatic';

export interface SiteSettings {
  name: string;
  headline: string;
  description: string;
  githubOrg: string;
  authorName: string;
  authorUrl: string;
  year: number;
}

const DEFAULTS: Omit<SiteSettings, 'year'> = {
  name: 'daedalabs',
  headline: 'Capable open source tools.',
  description:
    'daedalabs is a repository of open tools, free for everyone to use and build on.',
  githubOrg: 'https://github.com/daedalabs',
  authorName: 'juhenes',
  authorUrl: 'https://github.com/juhenes',
};

/**
 * Read the site singleton once and normalize it so every layout and page
 * renders the same copy without repeating fallbacks.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  'use cache';

  const settings = await reader.singletons.site.read();

  return {
    name: settings?.name || DEFAULTS.name,
    headline: settings?.headline || DEFAULTS.headline,
    description: settings?.description || DEFAULTS.description,
    githubOrg: settings?.githubOrg || DEFAULTS.githubOrg,
    authorName: settings?.authorName || DEFAULTS.authorName,
    authorUrl: settings?.authorUrl || DEFAULTS.authorUrl,
    year: new Date().getFullYear(),
  };
}
