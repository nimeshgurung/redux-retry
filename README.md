<p align="center"><img src="https://raw.githubusercontent.com/nimeshgurung/redux-retry/v1.0.0-beta.1/assets/logos/blue-nodes.png" alt="redux-retry" width="560"></p>

# redux-retry

[![Build, types and tests](https://github.com/nimeshgurung/redux-retry/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/nimeshgurung/redux-retry/actions/workflows/ci.yml)
[![Publish to npm](https://github.com/nimeshgurung/redux-retry/actions/workflows/release.yml/badge.svg?branch=master)](https://github.com/nimeshgurung/redux-retry/actions/workflows/release.yml)
[![npm next](https://img.shields.io/npm/v/redux-retry/next?label=npm%20next)](https://www.npmjs.com/package/redux-retry)

Keep loading, success, failure, and manual retry state local to a React component while running
Redux sagas or thunks. Use the `<Retry>` render-prop component or the `useRetry` hook.

**[Live demo](https://nimeshgurung.github.io/redux-retry/)** ·
[Saga sandbox](https://codesandbox.io/p/sandbox/basic-redux-saga-forked-35jv48) ·
[Thunk sandbox](https://codesandbox.io/p/sandbox/basic-redux-saga-forked-cfky67)

Choose **Try an error**, then **Retry**, to see recovery.

**1.x** supports React 18/19, React Redux 9, and Redux 5. See [migration notes](CHANGELOG.md).
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

To pin the modern release exactly, use `redux-retry@1.0.1` instead of `redux-retry@next`.

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

## State and retry

The hook returns `[state, retry]`; the component passes both to its render function.
State contains `loading`, `success`, `error`, `response`, `exception`, and `retryAttempt`.
`error` is a boolean; the caught error or rejected value is in `exception`.

Call `retry()` to repeat the request, or `retry([newArgs])` to change its arguments.
Requests start on mount by default. Retries are manual.

See the [API reference](API.md) for options, batches, cancellation, and import paths.

## Compatibility

Supports React 18/19, React Redux 9, Redux 5, Redux Saga 1, and Redux Thunk 3.1.
Node 22.18 or newer is required. Saga and Thunk are optional peers; install the
middleware used by your chosen entry point.

[API reference](API.md) · [Migration notes](CHANGELOG.md) ·
[Contributing](.github/CONTRIBUTING.md)

For coding agents: [Markdown install and API guide](llm.text) · [llms.txt](llms.txt).

## License

MIT.
