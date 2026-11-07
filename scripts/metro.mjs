import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import Metro from 'metro';

const directory = resolve(process.argv[2] ?? '.compat/react-19');
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const entry = resolve(directory, 'native-entry.js');
writeFileSync(
  entry,
  `
const Retry = require('redux-retry').default;
const { retryRoot, useRetry } = require('redux-retry/saga');
const ThunkRetry = require('redux-retry/thunk').default;
globalThis.reduxRetryExports = [Retry, useRetry, retryRoot, ThunkRetry];
`,
);

const config = await Metro.loadConfig(
  { cwd: directory },
  {
    projectRoot: directory,
    watchFolders: [resolve(root, 'node_modules')],
    maxWorkers: 2,
    cacheStores: [],
    resolver: {
      useWatchman: false,
      unstable_enablePackageExports: true,
      unstable_conditionNames: ['require', 'react-native'],
      nodeModulesPaths: [resolve(directory, 'node_modules')],
    },
    transformer: { babelTransformerPath: require.resolve('metro-babel-transformer') },
  },
);
for (const platform of ['ios', 'android']) {
  await Metro.runBuild(config, {
    entry,
    platform,
    dev: false,
    minify: false,
    out: resolve(directory, `test-results/${platform}.bundle.js`),
  });
  console.log(`Metro ${platform}: packed package bundled successfully`);
}
