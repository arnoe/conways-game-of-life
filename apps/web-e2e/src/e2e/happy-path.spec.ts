import { expect, test } from '@playwright/test';

test('happy path: paint a blinker, run it, pause, clear', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: /conway/i }),
  ).toBeVisible();

  await page.getByLabel(/width/i).fill('10');
  await page.getByLabel(/height/i).fill('10');
  await page.getByRole('button', { name: /apply/i }).click();

  await expect(page.getByTestId('gen-count')).toHaveText(/^0$/);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas not visible');
  const cellW = box.width / 10;
  const cellH = box.height / 10;
  const cellCenter = (col: number, row: number) => ({
    x: box.x + (col + 0.5) * cellW,
    y: box.y + (row + 0.5) * cellH,
  });

  for (const [c, r] of [
    [4, 5],
    [5, 5],
    [6, 5],
  ] as const) {
    const { x, y } = cellCenter(c, r);
    await page.mouse.click(x, y);
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

  await page.getByRole('button', { name: /^pause$/i }).click();

  const pausedAt = Number(await page.getByTestId('gen-count').innerText());
  await page.waitForTimeout(400);
  await expect(page.getByTestId('gen-count')).toHaveText(String(pausedAt));

  await page.getByRole('button', { name: /^clear$/i }).click();

  await expect(page.getByTestId('gen-count')).toHaveText(/^0$/);
  await expect(
    page.getByRole('button', { name: /^play$/i }),
  ).toBeVisible();
});
