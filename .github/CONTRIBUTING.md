# Contributing

## Development and verification

```sh
npm ci
npm run verify
npx playwright install chromium firefox webkit
npm run test:compat -- --e2e --live --metro
```

The release gate requires **100% of required scenarios to pass** with no skipped
cases or test retries. Both Saga and Thunk must show loading → success and
failure → retry → recovery, with correct request counts and no unexpected console
warnings or errors. Live API checks must also pass. CI retains generated reports
and screenshots as artifacts.

To run the installed-package examples locally:

```sh
npm run test:compat -- --e2e
cd .compat/react-19
npx vite examples --config examples/vite.config.ts
```

Open `/saga/`, `/thunk/`, or `/use-retry/`.

CI tests installed package consumers on Node 22/24/26 with React 18/19,
TypeScript 6/7, ESM/CommonJS, and Bundler/NodeNext resolution. Browser coverage
runs in Chromium, Firefox, and WebKit. Metro checks iOS/Android bundling;
it does not verify native UI execution.

The [local examples](../examples) include `Retry` with Saga and Thunk, plus `useRetry`.
They use Redux Toolkit's `configureStore`. Add `?store=classic` to either component
example to try Redux's `legacy_createStore`.

## Releasing

After merging into `master` and passing CI, run **Publish to npm** from GitHub
Actions. It verifies compatibility and the live API, then publishes the tested
tarball with provenance. Select the npm channel explicitly; the default is `next`.
Use `next` for the modern 1.x rollout, leaving `latest` on the legacy `0.0.x` line. Choose `latest`
only when a new version should become the default install. Prereleases must use `next`.
Published versions cannot be reused. npm trusted publishing must be configured
for `.github/workflows/release.yml` and the `npm` environment.

Review [CHANGELOG.md](../CHANGELOG.md) before releasing, then update and verify both
hosted sandboxes against the published version.

### Legacy documentation release

The `legacy` option publishes `0.0.8` under `latest`. It downloads the integrity-pinned
`0.0.7` archive, replaces its README, and adds the logo. The JavaScript, declarations,
entry point, dependencies, and peer requirements must remain unchanged.

Run `npm run test:legacy` to create and validate `.compat/legacy/redux-retry-0.0.8.tgz`.
CI compares the packed files and exercises both archives with React 16 / Redux 4,
including Saga and Thunk loading, errors, manual retry, batches, loaders, and skipped mount.
The modern package version stays `1.0.1` on `next`.

The obsolete React Native 0.58 starter has been retired. Use the browser examples
and Metro bundling checks described above. Its old Yarn dependency PRs are superseded
by the current npm lockfile and verified examples.
