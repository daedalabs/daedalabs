import { test, expect } from '@playwright/test';

test.describe('Daedalabs Website', () => {
  test('homepage renders cleanly without intro marketing text, stats, or CMS remnants', async ({ page }) => {
    await page.goto('/');

    // Check title and brand
    await expect(page).toHaveTitle(/Daedalabs/i);
    await expect(page.locator('header')).toContainText('daedalabs');

    // Confirm brand hero renders with title and headline
    await expect(page.locator('main h1')).toHaveText('DAEDALABS');
    await expect(page.locator('main')).toContainText('Capable open source tools');
    await expect(page.locator('main')).toContainText('repository of open tools');
    await expect(page.locator('main')).not.toContainText('Web & Desktop');

    // The footer is persistent chrome
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toHaveClass(/sticky/);
    await expect(footer).toHaveClass(/bottom-0/);

    // Confirm NO intro marketing text or stats
    await expect(page.locator('body')).not.toContainText('Re-engineering core systems');
    await expect(page.locator('body')).not.toContainText('Daedalabs is an open workshop');
    await expect(page.locator('body')).not.toContainText('4 projects');
    await expect(page.locator('body')).not.toContainText('2 live');

    // Confirm NO CMS remnants exist in the visitor UI
    await expect(page.locator('body')).not.toContainText('Edit in CMS');
    await expect(page.locator('body')).not.toContainText('Add Tool via CMS');
    await expect(page.locator('body')).not.toContainText('Keystatic CMS');
    await expect(page.locator('header')).not.toContainText('Studio');
    await expect(page.locator('body')).not.toContainText('Repo Guide');

    // Header is hidden (translated out of view) until user scrolls
    await expect(page.locator('header').first()).not.toBeInViewport();

    // With mock data removed, empty state should be cleanly displayed if 0 projects
    const emptyState = page.locator('text=No projects published yet');
    const projectCards = page.locator('article');
    const count = await projectCards.count();
    if (count === 0) {
      await expect(emptyState).toBeVisible();
      await expect(page.locator('text=github.com/daedalabs')).toBeVisible();
    }
  });

  test('keyboard shortcut "/" focuses the search bar and Esc clears', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    const searchInput = page.getByPlaceholder(/Search projects/i);
    await expect(searchInput).not.toBeFocused();

    // Press "/" on keyboard
    await page.keyboard.press('Slash');
    await expect(searchInput).toBeFocused();

    // Type query
    await page.keyboard.type('test-query');
    await expect(searchInput).toHaveValue('test-query');

    // Escape clears search
    await page.keyboard.press('Escape');
    await expect(searchInput).toHaveValue('');
  });

  test('category filter pills and live/beta status badges are removed', async ({ page }) => {
    await page.goto('/');

    // Category pills should NOT exist
    await expect(page.getByRole('button', { name: 'Build your own' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Web apps' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'CLI tools' })).toHaveCount(0);

    // Live and beta status badges should NOT exist
    await expect(page.locator('body')).not.toContainText('● live');
    await expect(page.locator('body')).not.toContainText('● beta');
    await expect(page.locator('body')).not.toContainText('● experiment');

    // Status dropdown should NOT exist
    await expect(page.locator('option[value="live"]')).toHaveCount(0);
  });

  test('URL query parameter (?category=byox) sets category filter state', async ({ page }) => {
    await page.goto('/?category=byox');

    // Active filter badge should be visible
    await expect(page.locator('text=category: Build your own')).toBeVisible();
  });

  test('theme toggle switches theme and remembers the choice', async ({ page }) => {
    await page.goto('/');

    const toggle = page.getByRole('button', { name: /Switch to (light|dark) mode/i });
    await expect(toggle).toBeVisible();

    const before = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(before).toBe('dark');

    await toggle.click();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('light');

    await page.reload();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.dataset.theme))
      .toBe('light');
  });

  test('custom 404 page renders when visiting non-existent tool', async ({ page }) => {
    await page.goto('/tools/non-existent-tool-slug');
    await expect(page.locator('h1')).toHaveText('Project not found');
    await expect(page.getByRole('link', { name: 'All projects' })).toBeVisible();
  });

  test('dynamic OpenGraph images render properly', async ({ request }) => {
    const homeOgRes = await request.get('/opengraph-image');
    expect(homeOgRes.ok()).toBeTruthy();
    expect(homeOgRes.headers()['content-type']).toContain('image/png');
  });

  test('API route /api/tools/[slug] returns 404 for unknown tool', async ({ request }) => {
    const res = await request.get('/api/tools/non-existent-tool');
    expect(res.status()).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Tool not found');
  });

  test('RSS feed and sitemap are accessible', async ({ request }) => {
    const feedRes = await request.get('/feed.xml');
    expect(feedRes.ok()).toBeTruthy();
    const feedText = await feedRes.text();
    expect(feedText).toContain('<rss version="2.0"');

    const sitemapRes = await request.get('/sitemap.xml');
    expect(sitemapRes.ok()).toBeTruthy();
    const sitemapText = await sitemapRes.text();
    expect(sitemapText).toContain('https://daedalabs.org');
  });

  test('GitHub webhook GET endpoint reports status online', async ({ request }) => {
    const res = await request.get('/api/webhook/github');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe('online');
    expect(json.endpoint).toBe('/api/webhook/github');
  });

  test('GitHub webhook POST endpoint handles ping events', async ({ request }) => {
    const res = await request.post('/api/webhook/github', {
      headers: {
        'x-github-event': 'ping',
      },
      data: JSON.stringify({ zen: 'Keep it logically awesome.' }),
    });
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.received).toBe(true);
    expect(json.event).toBe('ping');
  });

  test('robots.txt returns correct crawl directives and sitemap link', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.ok()).toBeTruthy();
    const text = await res.text();
    expect(text).toContain('User-Agent: *');
    expect(text).toContain('Disallow: /api/');
    expect(text).toContain('Disallow: /keystatic/');
    expect(text).toContain('Sitemap: https://daedalabs.org/sitemap.xml');
  });

  test('manifest.webmanifest is accessible and has proper structure', async ({ request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.name).toBe('daedalabs');
    expect(json.start_url).toBe('/');
    expect(Array.isArray(json.icons)).toBe(true);
    expect(json.icons.length).toBeGreaterThan(0);
  });

  test('homepage contains canonical link, RSS feed link, and valid JSON-LD structured data', async ({ page }) => {
    await page.goto('/');

    // Check canonical link
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /https:\/\/daedalabs\.org\/?/);

    // Check RSS feed auto-discovery link in head
    const rssLink = page.locator('head link[type="application/rss+xml"]');
    await expect(rssLink).toHaveAttribute('href', '/feed.xml');

    // Check robots meta tag
    const robotsMeta = page.locator('meta[name="robots"]');
    await expect(robotsMeta).toHaveAttribute('content', /index,\s*follow/);

    // Check keywords meta tag
    const keywordsMeta = page.locator('meta[name="keywords"]');
    await expect(keywordsMeta).toHaveAttribute('content', /open source/i);

    // Check OpenGraph meta tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /daedalabs/i);

    // Check JSON-LD structured data scripts
    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdScripts.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const jsonContents = [];
    for (let i = 0; i < count; i++) {
      const text = await jsonLdScripts.nth(i).textContent();
      if (text) {
        jsonContents.push(JSON.parse(text));
      }
    }

    const types = jsonContents.map((j) => j['@type']);
    expect(types).toContain('WebSite');
    expect(types).toContain('Organization');
  });

  test('mouse scroll wheel navigates between hero and catalog smoothly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    // Initially at top of page
    const initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBe(0);

    // Roll mouse wheel down one notch
    await page.mouse.wheel(0, 100);

    // Should smoothly scroll towards catalog dock position
    await expect
      .poll(async () => page.evaluate(() => window.scrollY), {
        timeout: 5000,
        intervals: [100, 200, 300],
      })
      .toBeGreaterThan(300);

    // Wait for snap animation to finish settling at dock
    await page.waitForTimeout(600);
    const dockedScrollY = await page.evaluate(() => window.scrollY);
    expect(dockedScrollY).toBeGreaterThan(400);

    // Roll mouse wheel up one notch from dock
    await page.mouse.wheel(0, -100);

    // Should smoothly scroll back to top of the hero
    await expect
      .poll(async () => page.evaluate(() => window.scrollY), {
        timeout: 5000,
        intervals: [100, 200, 300],
      })
      .toBeLessThan(50);
  });
});
