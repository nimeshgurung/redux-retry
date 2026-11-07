import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/thunk.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  target: 'es2020',
  platform: 'neutral',
  clean: true,
  outputOptions: { exports: 'named' },
});
