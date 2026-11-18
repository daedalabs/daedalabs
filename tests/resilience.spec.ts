import { test, expect } from '@playwright/test';
import { getAllTools, getToolDetail } from '../src/lib/tools';
import { getOrgRepos, getSingleRepo, GithubFetchError } from '../src/lib/github';

test.describe('Resilience and Fallback Suite', () => {
  test('getOrgRepos throws GithubFetchError on network failure or HTTP errors', async () => {
    const originalBase = process.env.GITHUB_API_BASE;
    process.env.GITHUB_API_BASE = 'http://127.0.0.1:59999';
    try {
      await expect(getOrgRepos('daedalabs')).rejects.toThrow(GithubFetchError);
    } finally {
      if (originalBase === undefined) {
        delete process.env.GITHUB_API_BASE;
      } else {
        process.env.GITHUB_API_BASE = originalBase;
      }
    }
  });

  test('getAllTools falls back to snapshot and sets isStale when GitHub fails', async () => {
    const originalBase = process.env.GITHUB_API_BASE;
    process.env.GITHUB_API_BASE = 'http://127.0.0.1:59999';
    try {
      const result = await getAllTools();
      expect(result.status).toBe('cached');
      expect(result.isStale).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.tools.some((t) => t.slug === 'byo-git')).toBe(true);
    } finally {
      if (originalBase === undefined) {
        delete process.env.GITHUB_API_BASE;
      } else {
        process.env.GITHUB_API_BASE = originalBase;
      }
    }
  });

  test('getToolDetail directly queries single repo and falls back to snapshot', async () => {
    const detail = await getToolDetail('byo-git');
    expect(detail).not.toBeNull();
    expect(detail?.tool.slug).toBe('byo-git');
    expect(detail?.tool.category).toBe('byox');
  });

  test('getSingleRepo returns null for non-existent repo without paginating org', async () => {
    const repo = await getSingleRepo('non-existent-repo-slug-xyz');
    expect(repo).toBeNull();
  });
});
