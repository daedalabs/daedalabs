/**
 * Script to refresh src/content/projects.snapshot.json from the GitHub API.
 *
 * Usage:
 *   node scripts/refresh-snapshot.mjs
 *
 * If you encounter GitHub API rate limits (60 req/hr unauthenticated),
 * set the GITHUB_TOKEN environment variable:
 *   GITHUB_TOKEN=ghp_xxx node scripts/refresh-snapshot.mjs
 *
 * Note: This script is for local maintenance/offline sync and is not required to run in production.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const snapshotPath = path.join(__dirname, '../src/content/projects.snapshot.json');

const org = process.env.GITHUB_ORG || 'daedalabs';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const headers = {
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'daedalabs-snapshot-refresh',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function main() {
  console.log(`Fetching repositories for ${org}...`);
  const res = await fetch(
    `https://api.github.com/orgs/${org}/repos?sort=updated&per_page=100`,
    {
      headers,
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub API returned status ${res.status}: ${res.statusText}`);
  }

  const repos = await res.json();
  const IGNORED = new Set([
    '.github',
    'daedalabs',
    'website',
    'daedalabs-web',
    'daedalabs-website',
    'daedalabs.github.io',
  ]);

  const projects = repos
    .filter(
      (r) =>
        !r.fork &&
        !IGNORED.has(r.name.toLowerCase()) &&
        !r.topics?.includes('daedalabs-website')
    )
    .map((r) => {
      let category = 'other';
      const topics = (r.topics || []).map((t) => t.toLowerCase());
      const name = r.name.toLowerCase();

      if (
        topics.includes('byox') ||
        topics.includes('build-your-own') ||
        name.startsWith('byo-')
      ) {
        category = 'byox';
      } else if (topics.includes('cli') || topics.includes('terminal')) {
        category = 'cli';
      } else if (topics.includes('web') || topics.includes('frontend')) {
        category = 'web';
      } else if (topics.includes('hardware') || topics.includes('iot')) {
        category = 'hardware';
      } else if (topics.includes('microservice') || topics.includes('api')) {
        category = 'microservice';
      } else if (topics.includes('ai') || topics.includes('llm')) {
        category = 'ai';
      } else if (topics.includes('library') || topics.includes('sdk')) {
        category = 'library';
      } else if (topics.includes('automation') || topics.includes('bot')) {
        category = 'automation';
      }

      let status = 'experiment';
      if (r.archived) status = 'archived';
      else if (topics.includes('live') || topics.includes('production')) status = 'live';
      else if (topics.includes('beta')) status = 'beta';

      return {
        slug: r.name,
        name: r.name,
        tagline: r.description || `Open-source ${category} project by daedalabs.`,
        category,
        status,
        tags: Array.from(new Set([r.language, ...(r.topics || [])].filter(Boolean))),
        githubUrl: r.html_url,
        demoUrl: r.homepage || null,
        featured: topics.includes('featured'),
        releaseDate: r.created_at ? r.created_at.split('T')[0] : null,
        updatedAt: r.updated_at || null,
        stargazersCount: r.stargazers_count || 0,
        forksCount: r.forks_count || 0,
        license: r.license?.spdx_id || r.license?.name || null,
        primaryLanguage: r.language || null,
      };
    });

  if (projects.length === 0) {
    console.warn(
      'Warning: Fetched 0 eligible projects. Existing snapshot left untouched.'
    );
    return;
  }

  fs.writeFileSync(snapshotPath, JSON.stringify(projects, null, 2) + '\n');
  console.log(`Updated snapshot with ${projects.length} projects at ${snapshotPath}`);
}

main().catch((err) => {
  console.error('Snapshot refresh failed:', err.message);
  process.exit(1);
});
