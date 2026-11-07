import { defineConfig, devices } from '@playwright/test';
import config from './playwright.config';

export default defineConfig({
  ...config,
  testIgnore: [],
  testMatch: '**/*.live.ts',
  reporter: [['list'], ['json', { outputFile: 'test-results/live.json' }]],
  projects: [{ name: 'chromium-live', use: { ...devices['Desktop Chrome'] } }],
});
