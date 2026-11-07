import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/types.test.tsx'],
    restoreMocks: true,
    coverage: { provider: 'v8', include: ['src/**'] },
  },
});
