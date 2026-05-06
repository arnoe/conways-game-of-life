import { expect, test } from '@playwright/test';

/**
 * Story 4.3 — responsive verification at 375×667 portrait.
 *
 *  - AC-1: no horizontal scrollbar (`scrollWidth <= clientWidth`).
 *  - AC-2: tap-to-toggle parity with mouse (counter-based verification).
 *  - AC-3: form, canvas, controls stack vertically (form → canvas → controls).
 *
 * `hasTouch: true` enables real touch event synthesis in Chromium so
 * `page.touchscreen.tap` fires `pointerdown` via the touch path, not
 * the mouse path. `isMobile` is intentionally NOT set — that's a
 * chromium-only flag and the spec stays portable across local browsers.
 */
test.use({
  viewport: { width: 375, height: 667 },
  hasTouch: true,
});

test.describe('responsive — 375px portrait', () => {
  test('AC-1: no horizontal scrollbar at 375x667', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible();

    const overflow = await page.evaluate<{
      scrollWidth: number;
      clientWidth: number;
    }>(`(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))()`);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
    expect(overflow.scrollWidth).toBeLessThanOrEqual(375);
  });

  test('AC-3: layout is stacked (form, canvas, controls top-to-bottom)', async ({
    page,
  }) => {
    await page.goto('/');

    const form = page.locator('form').first();
    const canvas = page.locator('canvas');
    const controls = page.getByTestId('controls');

    await expect(form).toBeVisible();
    await expect(canvas).toBeVisible();
    await expect(controls).toBeVisible();

    const [formBox, canvasBox, controlsBox] = await Promise.all([
      form.boundingBox(),
      canvas.boundingBox(),
      controls.boundingBox(),
    ]);
    expect(formBox).not.toBeNull();
    expect(canvasBox).not.toBeNull();
    expect(controlsBox).not.toBeNull();
    if (!formBox || !canvasBox || !controlsBox) return;

    // form ends at-or-above canvas top (with sub-pixel slack)
    expect(formBox.y + formBox.height).toBeLessThanOrEqual(canvasBox.y + 1);
    // canvas ends at-or-above controls top (with sub-pixel slack)
    expect(canvasBox.y + canvasBox.height).toBeLessThanOrEqual(
      controlsBox.y + 1,
    );
  });

  test('AC-2: tap on canvas toggles a cell (touch parity with mouse)', async ({
    page,
  }) => {
    await page.goto('/');

    await page.getByLabel(/width/i).fill('10');
    await page.getByLabel(/height/i).fill('10');
    await page.getByRole('button', { name: /apply/i }).click();
    await expect(page.getByTestId('gen-count')).toHaveText(/^0$/);

    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (!box) throw new Error('canvas not visible');
    const cellW = box.width / 10;
    const cellH = box.height / 10;

    for (const [c, r] of [
      [4, 5],
      [5, 5],
      [6, 5],
    ] as const) {
      const x = box.x + (c + 0.5) * cellW;
      const y = box.y + (r + 0.5) * cellH;
      await page.touchscreen.tap(x, y);
    }

    await page.getByRole('button', { name: /^play$/i }).click();
    await expect
      .poll(
        async () => Number(await page.getByTestId('gen-count').innerText()),
        {
          timeout: 5000,
          intervals: [100, 200, 500],
        },
      )
      .toBeGreaterThanOrEqual(1);
  });
});
