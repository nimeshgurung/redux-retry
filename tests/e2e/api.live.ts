import { expect, test } from '@playwright/test';

for (const example of ['saga', 'thunk']) {
  test(`live replacement API: ${example} original scenario succeeds and retries`, async ({
    page,
  }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto(`/${example}/`);
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Error', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('response')).toContainText('quia et suscipit');
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByTestId('attempt')).toHaveText('1', { timeout: 20000 });
    await expect(page.getByText('Error', { exact: true })).toHaveCount(0);
    await expect(page.getByTestId('response')).toContainText('quia et suscipit');
    expect(failures).toEqual([]);
  });
}
