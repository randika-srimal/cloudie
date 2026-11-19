import { expect, type Page, test } from '@playwright/test';

// Needs the dev stack's agent on MOCK_MODEL=echo (backend/agent/.dev.vars, the default copied from
// .dev.vars.example) and a knowledge base in the local KV and R2, which ./cli.sh e2e publishes before the run.
// Turnstile uses its always-pass test keys, so the widget and siteverify need internet access.
// Every request under /agents (WebSocket and history GET) counts against the connect limit of 10 per minute
// per IP: this test makes about four, once per project, so keep new chat tests few or give them their own IP.

/** Waits until the Turnstile check passed and the WebSocket to the agent is open. */
async function waitForConnection(page: Page): Promise<void> {
  await expect(page.getByLabel('Your message')).toBeVisible();
  await expect(page.getByText(/Connecting…|Reconnecting…/)).toBeHidden({ timeout: 20_000 });
}

test('a message gets a streamed reply that survives a reload', async ({ page }) => {
  await page.goto('/chat');
  await waitForConnection(page);

  const conversation = page.getByRole('region', { name: 'Conversation' });
  await page.getByLabel('Your message').fill('hi');
  await page.getByLabel('Your message').press('Enter');

  await expect(conversation.getByText('echo: hi')).toBeVisible({ timeout: 10_000 });

  // The chat id is in sessionStorage, so a reload reconnects to the same agent, which sends back its history.
  await page.reload();
  await waitForConnection(page);
  await expect(conversation.getByText('echo: hi')).toBeVisible({ timeout: 10_000 });
});
