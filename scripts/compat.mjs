import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const args = process.argv.slice(2);
const reactVersions = args.includes('--react=18')
  ? ['18']
  : args.includes('--react=19')
    ? ['19']
    : ['18', '19'];
const output = resolve(root, '.compat');
mkdirSync(output, { recursive: true });

function run(command, arguments_, cwd = root, capture = false) {
  return execFileSync(command, arguments_, {
    cwd,
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    env: {
      ...process.env,
      npm_config_cache: process.env.npm_config_cache ?? '/tmp/redux-retry-npm-cache',
    },
  });
}

run('npm', ['run', 'build']);
const [pack] = JSON.parse(
  run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', output], root, true),
);
const tarball = resolve(output, pack.filename);
const report = {
  version: manifest.version,
  node: process.version,
  sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),
  cases: [],
};

for (const react of reactVersions) {
  const directory = resolve(output, `react-${react}`);
  mkdirSync(directory, { recursive: true });
  const dependencies = {
    'redux-retry': `file:${tarball}`,
    react: react === '18' ? '18.3.1' : manifest.devDependencies.react,
    'react-dom': react === '18' ? '18.3.1' : manifest.devDependencies['react-dom'],
    'react-redux': manifest.devDependencies['react-redux'],
    redux: manifest.devDependencies.redux,
    'redux-saga': manifest.devDependencies['redux-saga'],
    'redux-thunk': manifest.devDependencies['redux-thunk'],
    '@reduxjs/toolkit': manifest.devDependencies['@reduxjs/toolkit'],
    '@types/react': `^${react}.0.0`,
    '@types/react-dom': `^${react}.0.0`,
    '@types/node': manifest.devDependencies['@types/node'],
    '@testing-library/dom': manifest.devDependencies['@testing-library/dom'],
    '@testing-library/react': manifest.devDependencies['@testing-library/react'],
    vitest: manifest.devDependencies.vitest,
    jsdom: manifest.devDependencies.jsdom,
    typescript: manifest.devDependencies.typescript,
    typescript7: 'npm:typescript@7.0.2',
    '@playwright/test': manifest.devDependencies['@playwright/test'],
    vite: manifest.devDependencies.vite,
  };
  writeFileSync(
    resolve(directory, 'package.json'),
    JSON.stringify(
      {
        name: `redux-retry-compat-react-${react}`,
        private: true,
        type: 'module',
        dependencies,
        overrides: manifest.overrides,
      },
      null,
      2,
    ),
  );
  // Always reinstall the tarball: reusing npm's cached file dependency could hide a changed build.
  rmSync(resolve(directory, 'node_modules/redux-retry'), { recursive: true, force: true });
  rmSync(resolve(directory, 'package-lock.json'), { force: true });
  run('npm', ['install', '--no-audit', '--no-fund'], directory);
  cpSync(resolve(root, 'tests'), resolve(directory, 'tests'), { recursive: true });
  cpSync(resolve(root, 'examples'), resolve(directory, 'examples'), { recursive: true });
  for (const file of ['vitest.config.ts', 'playwright.config.ts', 'playwright.live.config.ts'])
    cpSync(resolve(root, file), resolve(directory, file));
  writeFileSync(
    resolve(directory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: 'ES2020',
        jsx: 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        noEmit: true,
        skipLibCheck: true,
      },
      include: ['tests/types.test.tsx', 'tests/commonjs.cts'],
    }),
  );
  const installed = JSON.parse(
    readFileSync(resolve(directory, 'node_modules/redux-retry/package.json'), 'utf8'),
  );
  if (installed.version !== manifest.version) throw new Error('Wrong package version installed');
  mkdirSync(resolve(directory, 'test-results'), { recursive: true });
  run(
    process.execPath,
    [
      resolve(directory, 'node_modules/vitest/vitest.mjs'),
      'run',
      '--reporter=default',
      '--reporter=json',
      '--outputFile=test-results/integration.json',
    ],
    directory,
  );
  const integration = JSON.parse(
    readFileSync(resolve(directory, 'test-results/integration.json'), 'utf8'),
  );
  if (
    integration.numPendingTests ||
    integration.numFailedTests ||
    !integration.numTotalTests ||
    integration.numPassedTests !== integration.numTotalTests
  )
    throw new Error('All required integration tests must pass with none skipped');
  for (const compiler of ['typescript', 'typescript7']) {
    const executable = resolve(directory, `node_modules/${compiler}/bin/tsc`);
    for (const resolution of ['Bundler', 'NodeNext']) {
      run(
        process.execPath,
        [
          executable,
          '-p',
          'tsconfig.json',
          '--moduleResolution',
          resolution,
          '--module',
          resolution === 'NodeNext' ? 'NodeNext' : 'ESNext',
        ],
        directory,
      );
    }
  }
  for (const mode of ['module', 'commonjs']) {
    const check =
      mode === 'module'
        ? "import Retry, { useRetry, retryRoot } from 'redux-retry'; import ThunkRetry from 'redux-retry/thunk'; if (![Retry,useRetry,retryRoot,ThunkRetry].every(x=>typeof x==='function')) throw Error('Missing ESM exports');"
        : "const pkg = require('redux-retry'); const thunk = require('redux-retry/thunk'); if (![pkg.default,pkg.useRetry,pkg.retryRoot,thunk.default].every(x=>typeof x==='function')) throw Error('Missing CJS exports');";
    run(process.execPath, [`--input-type=${mode}`, '-e', check], directory);
  }
  if (args.includes('--e2e')) {
    const cli = resolve(directory, 'node_modules/@playwright/test/cli.js');
    run(
      process.execPath,
      [cli, 'test', ...(args.includes('--chromium-only') ? ['--project=chromium'] : [])],
      directory,
    );
    const { stats } = JSON.parse(readFileSync(resolve(directory, 'test-results/e2e.json'), 'utf8'));
    if (
      stats.expected !== (args.includes('--chromium-only') ? 10 : 30) ||
      stats.unexpected ||
      stats.skipped ||
      stats.flaky
    )
      throw new Error(
        'Both sandbox examples must pass every required browser scenario, without retries or skips',
      );
  }
  if (args.includes('--live')) {
    run(
      process.execPath,
      [
        resolve(directory, 'node_modules/@playwright/test/cli.js'),
        'test',
        '--config',
        'playwright.live.config.ts',
      ],
      directory,
    );
    const { stats } = JSON.parse(
      readFileSync(resolve(directory, 'test-results/live.json'), 'utf8'),
    );
    if (stats.expected !== 2 || stats.unexpected || stats.skipped || stats.flaky)
      throw new Error('Both live API scenarios must pass');
  }
  if (args.includes('--metro'))
    run(process.execPath, [resolve(root, 'scripts/metro.mjs'), directory], root);
  report.cases.push({
    react: dependencies.react,
    integration: 'pass',
    typescript6: 'pass',
    typescript7: 'pass',
    integrationTests: integration.numTotalTests,
    esm: 'pass',
    cjs: 'pass',
    e2e: args.includes('--e2e') ? 'pass' : 'not-run',
    live: args.includes('--live') ? 'pass' : 'not-run',
    metro: args.includes('--metro') ? 'pass' : 'not-run',
  });
}

// Verify the thunk-only entry in an installation with no saga peer at all.
const thunkOnly = resolve(output, 'thunk-only');
mkdirSync(thunkOnly, { recursive: true });
writeFileSync(
  resolve(thunkOnly, 'package.json'),
  JSON.stringify({
    private: true,
    type: 'module',
    dependencies: {
      'redux-retry': `file:${tarball}`,
      react: manifest.devDependencies.react,
      'react-redux': manifest.devDependencies['react-redux'],
      redux: manifest.devDependencies.redux,
    },
  }),
);
run('npm', ['install', '--no-audit', '--no-fund'], thunkOnly);
if (existsSync(resolve(thunkOnly, 'node_modules/redux-saga')))
  throw new Error('Saga unexpectedly installed');
run(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "import Retry, { useRetry } from 'redux-retry/thunk'; if (typeof Retry !== 'function' || typeof useRetry !== 'function') throw Error('Thunk-only import failed');",
  ],
  thunkOnly,
);

const reportFile = resolve(output, `report-node-${process.versions.node.split('.')[0]}.json`);
writeFileSync(reportFile, `${JSON.stringify({ ...report, thunkOnly: 'pass' }, null, 2)}\n`);
console.log(`Compatibility passed: ${reportFile}`);
