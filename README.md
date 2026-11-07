<p align="center"><img src="assets/logos/blue-nodes.png" alt="redux-retry" width="560"></p>

# redux-retry

Keep loading, success, failure, and manual retry state local to a React component while running
Redux sagas or thunks. Use the existing `<Retry>` render-prop component or the new `useRetry` hook.

**1.0.0-beta.1** targets React 18/19, React Redux 9, and Redux 5. See [migration notes](CHANGELOG.md).
This is a beta: npm's `next` tag will be used when it is published.

## Install

After the beta is published:

```sh
npm install redux-retry@next react-redux redux
# Install the middleware you use:
npm install redux-saga
# Or use Redux Toolkit (which includes thunk middleware):
npm install @reduxjs/toolkit
```

For local verification before publication, install the `.tgz` produced by `npm pack`.

## Existing component: sagas

Run `retryRoot()` once in your application's root saga. Existing `yield all([retryRoot()])` setup works.

```tsx
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import { call } from 'redux-saga/effects';
import Retry, { retryRoot } from 'redux-retry';

async function getPost(id: number): Promise<{ body: string }> {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function* loadPost(id: number): Generator<unknown, { body: string }, { body: string }> {
  return yield call(getPost, id);
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
      <Retry saga={{ call: loadPost, args: [1] }}>
        {(state, retry) => (
          <div>
            {state.loading && <p>Loading…</p>}
            {state.error && <p>Error: {String(state.exception)}</p>}
            {state.success && <p>{state.response?.body}</p>}
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

const loadPost = createAsyncThunk('posts/load', async (id: number) => {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json() as Promise<{ body: string }>;
});

export function Post() {
  const [state, retry] = useRetry({ thunk: { call: loadPost, args: [1] } });
  return (
    <div>
      {state.loading && <p>Loading…</p>}
      {state.error && <p>Error: {String(state.exception)}</p>}
      {state.success && <p>{state.response?.body}</p>}
      <button onClick={() => retry([2])}>Retry with post 2</button>
    </div>
  );
}
```

Regular thunks work too, including synchronous returns and middleware `extraArgument` injection.
`createAsyncThunk` results are unwrapped: fulfilled payloads become `response`; rejected values become
`exception`. For the render-prop API, use `<Retry thunk={{ call: loadPost, args: [1] }}>` as before.
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

## Runnable examples and the release gate

```sh
npm ci
npm test
npx vite examples --config examples/vite.config.ts
```

Open `/saga/`, `/thunk/`, or `/use-retry/`. Add `?store=toolkit` to either original component example
to use Redux Toolkit with its default checks enabled.

The [original saga sandbox](https://codesandbox.io/s/04w2m9kw00) and
[original thunk sandbox](https://codesandbox.io/s/9lz0kv4xo4) are the regression baselines. Their source
was inspected in the browser. Both currently use redux-retry 0.0.2 and an obsolete proxy API.
The committed [saga](examples/saga/index.jsx) and [thunk](examples/thunk/index.jsx) reproductions keep
the original class component, render prop, visible states, and direct `onClick={retry}` behavior.
They update React mounting, middleware imports, dependencies, and the API endpoint. The direct
[JSONPlaceholder API](https://jsonplaceholder.typicode.com/) replaces the broken CORS proxy; its
`body` is mapped to the original `response.text` contract. Hosted sandboxes are not automatically
updated by these local changes. Both example manifests pin `redux-retry` to exactly
`1.0.0-beta.1`; import the example folders into CodeSandbox after that version is published, and
update the original hosted sandboxes to that same version. Do not leave them on `latest` or 0.0.2.

**E2E verification metric: passed required scenarios / total required scenarios = 100%.** Both original
examples must pass; any failure or skipped required case fails the gate. There are 60 deterministic
browser cases: 2 React versions × 3 browsers × 5 integration scenarios × 2 state-transition paths.
Tests check loading → success → retry → success and failure → retry → recovery, attempt counts,
exact request counts, and absence of unexpected console warnings/errors. Retries of the test itself
are disabled. Live API smoke checks are separate and mandatory before publishing.

```sh
npm run verify
npx playwright install chromium firefox webkit
npm run test:compat -- --e2e --live --metro
```

Compatibility installs the packed `.tgz` into isolated React 18.3.1 / React 19.3.1 consumers, executes
21 behavior tests per consumer, checks TypeScript 6/7 with Bundler and NodeNext resolution, tests
ESM/CommonJS exports, and verifies the thunk-only entry without saga installed. `--metro` also bundles
the packed package for iOS and Android; this checks package resolution and transformation, not native
UI execution. Browser tests run in
Chromium, Firefox, and WebKit. CI runs the matrix on Node 22/24/26. Generated evidence is under
`.compat/report-node-*.json` and `.compat/react-*/test-results/`.

Development uses Node 26 LTS and TypeScript 6.0.3. TypeScript 7.0.2 is tested as a consumer compiler;
current TypeScript ESLint support is below 6.1. The package validator uses the modern Node16 resolution
profile, alongside Bundler and NodeNext consumer checks; obsolete Node10 resolution is not supported.
The minimatch override pins the patched major for the lint toolchain and is covered by lint checks.

## Release

The publish workflow is manual and gated on CI plus live API checks. Configure the npm trusted
publisher for `.github/workflows/release.yml` and the `npm` GitHub environment before dispatching it.
Publishing uses OIDC provenance and the `next` tag. Changing the package version or running verification
does not publish a release. Review [CHANGELOG.md](CHANGELOG.md) before publishing.

## Artwork

The selected blue-nodes sticker and five variations are in [assets/logos](assets/logos). Images were
created with the built-in image generation tool; prompts are retained alongside them.

## License

MIT.
