import { expect, type Page, test } from '@playwright/test';

// Needs the dev stack's agent on MOCK_MODEL=echo (backend/agent/.dev.vars, the default copied from
// .dev.vars.example) and a knowledge base in the local KV and R2, which ./cli.sh e2e publishes before the run.
// Turnstile uses its always-pass test keys, so the widget and siteverify need internet access.
// WebSocket upgrades under /agents count against the connect limit of 10 per minute per IP, and password
// attempts against UNLOCK_LIMIT (5 per minute per IP): these tests use a few of each per project, so keep new
// chat tests few.

/** CHAT_PASSWORD in backend/api/.dev.vars.example (the dev stack's default). */
const PASSWORD = process.env.CHAT_PASSWORD ?? 'engaging-dev-password';

/** Types the chat password on the password view. */
async function enterPassword(page: Page, password = PASSWORD): Promise<void> {
  await page.getByLabel('Please enter the password required to view this page.').fill(password);
  await page.getByRole('button', { name: 'Access the assistant' }).click();
}

/** Waits until the Turnstile check passed and the WebSocket to the agent is open. */
async function waitForConnection(page: Page): Promise<void> {
  await expect(page.getByLabel('Your message')).toBeVisible();
  await expect(page.getByText(/Connecting…|Reconnecting…/)).toBeHidden({ timeout: 20_000 });
}

test('a wrong password is refused and the chat stays locked', async ({ page }) => {
  await page.goto('/');
  await enterPassword(page, 'not-the-password');
  await expect(page.getByRole('alert')).toHaveText(/not right/);
  await expect(page.getByLabel('Your message')).toBeHidden();
});

test('a message gets a streamed reply that survives a reload', async ({ page }) => {
  await page.goto('/');
  await enterPassword(page);
  await waitForConnection(page);

  const conversation = page.getByRole('region', { name: 'Conversation' });
  await page.getByLabel('Your message').fill('hi');
  await page.getByLabel('Your message').press('Enter');

  await expect(conversation.getByText('echo: hi')).toBeVisible({ timeout: 10_000 });

  // The chat id is in sessionStorage, so a reload reconnects to the same agent, which sends back its history.
  // The chat_access cookie keeps the browser unlocked, so no password this time.
  await page.reload();
  await waitForConnection(page);
  await expect(conversation.getByText('echo: hi')).toBeVisible({ timeout: 10_000 });
});
