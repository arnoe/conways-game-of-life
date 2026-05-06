import { expect, test, type Page } from '@playwright/test';

/**
 * Story 4.2 — keyboard reachability and accessible-name audit.
 *
 * Verifies in real Chromium:
 *  - AC-1: Tab walks through every control in the locked order.
 *  - AC-3: Slider responds to ArrowLeft / ArrowRight (browser-native;
 *          jsdom does not reliably simulate this).
 *  - AC-1 + AC-5: every focused element has a non-empty accessible name.
 *
 * No axe-core. No positive tabIndex. No screenshot diffs.
 */

interface FocusedNameInfo {
  name: string;
  tag: string;
}

/**
 * Read the active element's accessible name from inside the page context.
 * `page.evaluate` runs in the browser; the body uses DOM globals which
 * the e2e TypeScript project does not have in its `lib` array, so we
 * keep the evaluate body free of TS-narrowed DOM types via `Function`
 * coercion of an inline IIFE expression. The runtime is a real browser.
 */
async function describeFocused(page: Page): Promise<FocusedNameInfo> {
  return await page.evaluate<FocusedNameInfo>(`(() => {
    const el = document.activeElement;
    if (!el) return { name: '', tag: '' };
    const labelId = el.getAttribute('aria-labelledby');
    const labelledBy = labelId
      ? (document.getElementById(labelId)?.textContent?.trim() ?? '')
      : '';
    const labels = el.labels;
    const label = labels && labels[0] ? labels[0].textContent?.trim() : '';
    const name =
      el.getAttribute('aria-label')?.trim() ||
      labelledBy ||
      label ||
      el.textContent?.trim() ||
      '';
    return { name, tag: el.tagName.toLowerCase() };
  })()`);
}

test.describe('keyboard reachability', () => {
  test('AC-1: Tab order matches the locked sequence', async ({ page }) => {
    await page.goto('/');

    // Move focus into the document; the first Tab lands on the first focusable.
    await page.keyboard.press('Tab');
    const seen: FocusedNameInfo[] = [];
    seen.push(await describeFocused(page));
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('Tab');
      seen.push(await describeFocused(page));
    }

    const expected: RegExp[] = [
      /width/i,
      /height/i,
      /apply/i,
      /^(play|pause)$/i,
      /^step$/i,
      /^clear$/i,
      /^randomize$/i,
      /simulation speed/i,
    ];

    for (let i = 0; i < expected.length; i++) {
      expect(
        seen[i]?.name,
        `Tab step ${i + 1} (got ${JSON.stringify(seen[i])})`,
      ).toMatch(expected[i]);
    }
  });

  test('AC-3: slider responds to ArrowLeft / ArrowRight', async ({ page }) => {
    await page.goto('/');

    const slider = page.getByRole('slider', { name: /simulation speed/i });
    await slider.focus();

    const startValue = Number(await slider.getAttribute('aria-valuenow'));
    expect(Number.isFinite(startValue)).toBe(true);

    await page.keyboard.press('ArrowRight');
    await expect(slider).toHaveAttribute(
      'aria-valuenow',
      String(startValue + 1),
    );

    await page.keyboard.press('ArrowLeft');
    await expect(slider).toHaveAttribute('aria-valuenow', String(startValue));
  });

  test('AC-1 + AC-5: every focused element has a non-empty accessible name', async ({
    page,
  }) => {
    await page.goto('/');

    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      const info = await describeFocused(page);
      expect(
        info.name.length,
        `Tab ${i + 1} produced unnamed focus: ${JSON.stringify(info)}`,
      ).toBeGreaterThan(0);
    }
  });
});
