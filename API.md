# API reference

See the [README](README.md) for installation and quick-start examples.

## Calls and options

| Input                       | Meaning                                                                           |
| --------------------------- | --------------------------------------------------------------------------------- |
| `saga: { call, args? }`     | Generator function and its arguments; requires saga middleware and `retryRoot()`  |
| `thunk: { call, args? }`    | Thunk action creator and its arguments; requires thunk middleware                 |
| Array of call definitions   | Run concurrently; return results in input order; fail the batch if one call fails |
| `skipCallOnMount?: boolean` | Start idle when true; default false                                               |
| `loader?: ReactNode`        | Component-only replacement for children while loading                             |
| `children(state, retry)`    | Existing component render prop                                                    |

## State and retries

Provide exactly one of `saga` or `thunk`. Arguments and response types are inferred, including batch
responses. The hook returns `[state, retry]`. State contains `loading`, `success`, `error`, `response`,
`exception`, and `retryAttempt`. The initial request has attempt 0; every manual retry increments it.

`retry()` reuses the latest props and their arguments. `retry([newArgs])` overrides arguments for that
attempt, and an explicit `[]` clears arguments. In a batch, overrides apply to every call. Pass `retry`
directly to `onClick` or `onPress`; UI event objects are ignored. Prop changes do not automatically
execute requests. Async state resets at each attempt, and the latest attempt controls visible state.

## Cleanup

Cleanup ignores stale completions, cancels saga work, and calls `.abort()` on abortable thunk results.
Arbitrary promises cannot be forcibly aborted. React Strict Mode can start work twice in development;
cleanup discards/cancels the obsolete setup. Normal production mounting starts one request.
No automatic backoff or background retry policy is enabled.

## Imports and rendering environments

The default export remains Provider-connected. The named `Retry` export accepts an explicit Redux
`dispatch` without requiring a Provider. Runtime imports support ESM and CommonJS; imports are
`redux-retry`, `redux-retry/saga`, and `redux-retry/thunk`. Use a client component in React Server
Component applications. The library does not access the DOM.
