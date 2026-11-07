<p align="center"><img src="https://raw.githubusercontent.com/nimeshgurung/redux-retry/v1.0.0-beta.1/assets/logos/blue-nodes.png" alt="redux-retry" width="560"></p>

# redux-retry

[![Build, types and tests](https://github.com/nimeshgurung/redux-retry/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/nimeshgurung/redux-retry/actions/workflows/ci.yml)
[![Publish to npm](https://github.com/nimeshgurung/redux-retry/actions/workflows/release.yml/badge.svg?branch=master)](https://github.com/nimeshgurung/redux-retry/actions/workflows/release.yml)
[![npm next](https://img.shields.io/npm/v/redux-retry/next?label=npm%20next)](https://www.npmjs.com/package/redux-retry)

Keep loading, success, failure, and manual retry state local to a React component while running
Redux sagas or thunks. Use the existing `<Retry>` render-prop component or the new `useRetry` hook.

For coding agents: [Markdown install and API guide](llm.text) · [llms.txt](llms.txt).

**1.0.0** targets React 18/19, React Redux 9, and Redux 5. See [migration notes](CHANGELOG.md).
The modern 1.x release uses npm's `next` channel for an opt-in rollout. `latest` stays on legacy
`0.0.7`, so plain `npm install redux-retry` continues to install the older release.

## Install

```sh
npm install redux-retry@next react-redux redux
# Install the middleware you use:
npm install redux-saga
# Or use Redux Toolkit (which includes thunk middleware):
npm install @reduxjs/toolkit
```

For local package verification, install the `.tgz` produced by `npm pack`.
To pin the modern release exactly, use `redux-retry@1.0.0` instead of `redux-retry@next`.

## Existing component: sagas

Run `retryRoot()` once in your application's root saga. Existing `yield all([retryRoot()])` setup works.

```tsx
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import { call } from 'redux-saga/effects';
import Retry, { retryRoot } from 'redux-retry';

async function getProfile(id: number): Promise<{ name: string; email: string }> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function* loadProfile(
  id: number,
): Generator<unknown, { name: string; email: string }, { name: string; email: string }> {
  return yield call(getProfile, id);
}

const saga = createSagaMiddleware();
const store = configureStore({
  reducer: (state = {}) => state,
  middleware: (getDefault) => getDefault().concat(saga),
});
saga.run(retryRoot);

export function App() {
  return (
    <Provider store={store}>
      <Retry saga={{ call: loadProfile, args: [1] }}>
        {(state, retry) => (
          <div>
            {state.loading && <p>Loading…</p>}
            {state.error && <p>Error: {String(state.exception)}</p>}
            {state.success && <p>{state.response?.name}</p>}
            <p>Retries: {state.retryAttempt}</p>
            <button onClick={retry}>Retry</button>
          </div>
        )}
      </Retry>
    </Provider>
  );
}
```

## Hook: thunks and Redux Toolkit

Use the thunk-only entry point if your application does not install `redux-saga`.
Both `useRetry` and the default component require a React Redux `<Provider>`.

```tsx
import { createAsyncThunk } from '@reduxjs/toolkit';
import { useRetry } from 'redux-retry/thunk';

const loadProfile = createAsyncThunk('profiles/load', async (id: number) => {
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<{ name: string; email: string }>;
});

export function Profile() {
  const [state, retry] = useRetry({ thunk: { call: loadProfile, args: [1] } });
  return (
    <div>
      {state.loading && <p>Loading…</p>}
      {state.error && <p>Error: {String(state.exception)}</p>}
      {state.success && <p>{state.response?.name}</p>}
      <button onClick={() => retry([2])}>Load profile 2</button>
    </div>
  );
}
```

Regular thunks work too, including synchronous returns and middleware `extraArgument` injection.
`createAsyncThunk` results are unwrapped: fulfilled payloads become `response`; rejected values become
`exception`. For the render-prop API, use `<Retry thunk={{ call: loadProfile, args: [1] }}>` as before.
`useRetry({ saga: { call, args } })` uses the same saga bridge as the component.

## API and behavior

| Input                       | Meaning                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- |
| `saga: { call, args? }`     | Generator function and its arguments; requires saga middleware and `retryRoot()`  |
| `thunk: { call, args? }`    | Thunk action creator and its arguments; requires thunk middleware                 |
| Array of call definitions   | Run concurrently; return results in input order; fail the batch if one call fails |
| `skipCallOnMount?: boolean` | Start idle when true; default false                                               |
| `loader?: ReactNode`        | Component-only replacement for children while loading                             |
| `children(state, retry)`    | Existing component render prop                                                    |

Provide exactly one of `saga` or `thunk`. Arguments and response types are inferred, including batch
responses. The hook returns `[state, retry]`. State contains `loading`, `success`, `error`, `response`,
`exception`, and `retryAttempt`. The initial request has attempt 0; every manual retry increments it.

`retry()` reuses the latest props and their arguments. `retry([newArgs])` overrides arguments for that
attempt, and an explicit `[]` clears arguments. In a batch, overrides apply to every call. Pass `retry`
directly to `onClick` or `onPress`; UI event objects are ignored. Prop changes do not automatically
execute requests. Async state resets at each attempt, and the latest attempt controls visible state.

Cleanup ignores stale completions, cancels saga work, and calls `.abort()` on abortable thunk results.
Arbitrary promises cannot be forcibly aborted. React Strict Mode can start work twice in development;
cleanup discards/cancels the obsolete setup. Normal production mounting starts one request.
No automatic backoff or background retry policy is enabled.

The default export remains Provider-connected. The named `Retry` export accepts an explicit Redux
`dispatch` without requiring a Provider. Runtime imports support ESM and CommonJS; imports are
`redux-retry`, `redux-retry/saga`, and `redux-retry/thunk`. Use a client component in React Server
Component applications. The library does not access the DOM; native app execution is a separate check
from web browser verification.

## Examples

Try the [live demo](https://nimeshgurung.github.io/redux-retry/) or open the
[Saga](https://codesandbox.io/p/sandbox/basic-redux-saga-forked-35jv48) and
[Thunk](https://codesandbox.io/p/sandbox/basic-redux-saga-forked-cfky67) sandboxes.
Each shows loading, a profile card on success, and an error card with **Retry**.
Choose **Try an error** to test recovery.

The [local examples](examples) include `Retry` with Saga and Thunk, plus `useRetry`.
They use Redux Toolkit's `configureStore`. Add `?store=classic` to either component
example to try Redux's `legacy_createStore`.

## Compatibility

Supports React 18/19, React Redux 9, Redux 5, Redux Saga 1, and Redux Thunk 3.1.
Node 22.18 or newer is required. Saga and Thunk are optional peers; install the
middleware used by your chosen entry point.

CI tests installed package consumers on Node 22/24/26 with React 18/19,
TypeScript 6/7, ESM/CommonJS, and Bundler/NodeNext resolution. Browser coverage
runs in Chromium, Firefox, and WebKit. Metro checks iOS/Android bundling;
it does not verify native UI execution.

## Development

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

## Releasing

After merging into `master` and passing CI, run **Publish to npm** from GitHub
Actions. It verifies compatibility and the live API, then publishes the tested
tarball with provenance. Select the npm channel explicitly; the default is `next`.
Publish `1.0.0` under `next` during rollout, leaving `latest` on `0.0.7`. Choose `latest`
only when a new version should become the default install. Prereleases must use `next`.
Published versions cannot be reused. npm trusted publishing must be configured
for `.github/workflows/release.yml` and the `npm` environment.

Review [CHANGELOG.md](CHANGELOG.md) before releasing, then update and verify both
hosted sandboxes against the published version.

## License

MIT.
