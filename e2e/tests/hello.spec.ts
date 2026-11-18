import { expect, test } from '@playwright/test';

test('the home page greets and shows the API reply', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hello, world');
  await expect(page.getByTestId('api-message')).toHaveText('Hello, world!');
});

test('the API answers its health check', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);
  expect(await res.json()).toMatchObject({ ok: true });
});
