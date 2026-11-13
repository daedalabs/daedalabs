import siteSettings from '@/content/settings.json';

export interface SiteSettings {
  name: string;
  headline: string;
  description: string;
  githubOrg: string;
  authorName: string;
  authorUrl: string;
  year: number;
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://daedalabs.org';

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
 * Read site settings and normalize so every layout and page
 * renders the same copy without repeating fallbacks.
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  return {
    name: siteSettings.name || DEFAULTS.name,
    headline: siteSettings.headline || DEFAULTS.headline,
    description: siteSettings.description || DEFAULTS.description,
    githubOrg: siteSettings.githubOrg || DEFAULTS.githubOrg,
    authorName: siteSettings.authorName || DEFAULTS.authorName,
    authorUrl: siteSettings.authorUrl || DEFAULTS.authorUrl,
    year: new Date().getFullYear(),
  };
}
