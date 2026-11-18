import { test, expect } from '@playwright/test';

test.describe('End-to-End Smoke and Interaction Verification', () => {
  test('desktop smoke: controls, reload persistence, and zero console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    // Verify hero and footer
    await expect(page.locator('main h1')).toHaveText('DAEDALABS');
    await expect(page.locator('footer')).toBeVisible();

    // Verify search, category, sort, view work and survive reload
    const searchInput = page.getByPlaceholder(/Search projects/i);
    await searchInput.fill('git');
    await expect(page).toHaveURL(/q=git/);

    const byoxBtn = page.getByRole('button', { name: 'Build your own' });
    if ((await byoxBtn.count()) > 0) {
      await byoxBtn.click();
      await expect(page).toHaveURL(/category=byox/);
    }

    const listViewBtn = page.getByRole('button', { name: /Compact list view/i }).first();
    await listViewBtn.click();
    await expect(page).toHaveURL(/view=table/);

    // Reload and verify state survived
    await page.reload();
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
    await expect(searchInput).toHaveValue('git');
    await expect(listViewBtn).toHaveAttribute('aria-pressed', 'true');

    // Filter out expected benign network 404s for unpushed mock icons if any
    const criticalErrors = consoleErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    expect(criticalErrors).toEqual([]);
  });

  test('modal open, Escape to close, and focus restoration to card trigger', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    const firstCardTrigger = page.locator('[data-card-trigger]').first();
    if ((await firstCardTrigger.count()) > 0) {
      await firstCardTrigger.focus();
      await firstCardTrigger.click();

      // Modal dialog should be open
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      // Press Escape to close
      await page.keyboard.press('Escape');
      await expect(modal).not.toBeVisible();

      // Focus should return to trigger
      await expect(firstCardTrigger).toBeFocused();
    }
  });

  test('when modal is open, background cannot be scrolled and body/html are locked', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    const firstCardTrigger = page.locator('[data-card-trigger]').first();
    await firstCardTrigger.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    // Both documentElement and body should have overflow: hidden
    const { bodyOverflow, htmlOverflow } = await page.evaluate(() => ({
      bodyOverflow: document.body.style.overflow,
      htmlOverflow: document.documentElement.style.overflow,
    }));
    expect(bodyOverflow).toBe('hidden');
    expect(htmlOverflow).toBe('hidden');

    const scrollYBefore = await page.evaluate(() => window.scrollY);

    // 1. Mouse wheel over backdrop overlay (outside dialog)
    await page.mouse.move(20, 20);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.scrollY)).toBe(scrollYBefore);

    // 2. Mouse wheel over modal header
    const modalHeader = modal.locator('header');
    if ((await modalHeader.count()) > 0) {
      const headerBox = await modalHeader.boundingBox();
      if (headerBox) {
        await page.mouse.move(
          headerBox.x + headerBox.width / 2,
          headerBox.y + headerBox.height / 2
        );
        await page.mouse.wheel(0, 500);
        await page.waitForTimeout(200);
        expect(await page.evaluate(() => window.scrollY)).toBe(scrollYBefore);
      }
    }

    // 3. Close modal and confirm scroll lock is cleanly removed
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();

    const { bodyOverflowAfter, htmlOverflowAfter } = await page.evaluate(() => ({
      bodyOverflowAfter: document.body.style.overflow,
      htmlOverflowAfter: document.documentElement.style.overflow,
    }));
    expect(bodyOverflowAfter).toBe('');
    expect(htmlOverflowAfter).toBe('');
  });

  test('mobile 390px smoke: all controls accessible without overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.locator('[data-hydrated="true"]')).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    // SortMenu is visible without sm:block
    const sortBtn = page.getByRole('button', { name: /Sort projects/i }).first();
    await expect(sortBtn).toBeVisible();

    // ViewToggle is visible
    const gridBtn = page.getByRole('button', { name: /Grid view/i }).first();
    await expect(gridBtn).toBeVisible();
  });
});
