import { expect, test } from '@playwright/test';

const scenarios = [
  { name: 'original saga / classic Redux', path: '/saga/?store=classic' },
  { name: 'original thunk / classic Redux', path: '/thunk/?store=classic' },
  { name: 'original saga / RTK default checks', path: '/saga/' },
  { name: 'original thunk / RTK default checks', path: '/thunk/' },
  { name: 'useRetry / createAsyncThunk', path: '/use-retry/' },
];

for (const scenario of scenarios) {
  test.describe(scenario.name, () => {
    const messages: string[] = [];
    test.beforeEach(async ({ page }) => {
      messages.length = 0;
      page.on('pageerror', (error) => messages.push(error.message));
      page.on('console', (message) => {
        if (
          ['error', 'warning'].includes(message.type()) &&
          !message.text().includes('Failed to load resource')
        )
          messages.push(message.text());
      });
    });
    test.afterEach(() => expect(messages).toEqual([]));

    test('mount → loading → success → retry → success, exactly one request per attempt', async ({
      page,
    }) => {
      let count = 0;
      let release!: () => void;
      let pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.route('https://jsonplaceholder.typicode.com/posts/1', async (route) => {
        const attempt = ++count;
        await pending;
        await route.fulfill({ json: { body: `Response ${attempt}` } });
      });
      await page.goto(scenario.path);
      await expect(page.getByRole('status', { name: 'Loading', exact: true })).toBeVisible();
      await expect.poll(() => count).toBe(1);
      release();
      await expect(page.getByText('Response 1', { exact: true })).toBeVisible();
      await expect(page.getByTestId('attempt')).toHaveText('0');
      pending = new Promise<void>((resolve) => {
        release = resolve;
      });
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByRole('status', { name: 'Loading', exact: true })).toBeVisible();
      await expect.poll(() => count).toBe(2);
      release();
      await expect(page.getByText('Response 2', { exact: true })).toBeVisible();
      await expect(page.getByTestId('attempt')).toHaveText('1');
      expect(count).toBe(2);
    });

    test('failure → Error → retry → recovery, with correct count and no false success', async ({
      page,
    }) => {
      let count = 0;
      await page.route('https://jsonplaceholder.typicode.com/posts/1', async (route) => {
        count += 1;
        await route.fulfill(
          count === 1
            ? { status: 503, json: { error: 'Service unavailable' } }
            : { json: { body: 'Recovered response' } },
        );
      });
      await page.goto(scenario.path);
      await expect(page.getByText('Error', { exact: true })).toBeVisible();
      await expect(page.getByTestId('attempt')).toHaveText('0');
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await expect(page.getByText('Recovered response', { exact: true })).toBeVisible();
      await expect(page.getByText('Error', { exact: true })).toHaveCount(0);
      await expect(page.getByTestId('attempt')).toHaveText('1');
      expect(count).toBe(2);
    });
  });
}
