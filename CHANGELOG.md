# Changelog

## 1.0.0-beta.1

- Add `useRetry`, returning the same local request state and retry handler as `<Retry>`.
- Infer argument and response types without explicit `any`, including defaulted arguments;
  verify exact consumer types and rejected invalid arguments under TypeScript 6 and 7.
- Preserve the default Provider-connected render-prop component, named explicit-dispatch component,
  custom loader, call-on-mount, manual retry, and ordered batch behavior.
- Support React 18/19, React Redux 9, Redux 5, and Redux Thunk 3.
- Dispatch thunks through the configured middleware and unwrap Redux Toolkit async-thunk results.
- Cancel supported work during cleanup and retries; ignore stale completions; count rapid retries reliably.
- Replace callback-bearing saga actions with serializable request IDs. Keep `retryRoot()` setup.
- Add `redux-retry/thunk`, usable without installing `redux-saga`, and `redux-retry/saga`.
- Publish ESM, CommonJS, and matching TypeScript declarations with explicit package exports.
- Replace the broken proxy example API with direct JSONPlaceholder requests.
- Add tests that replay both original README CodeSandbox scenarios from the packed beta.
- Replace Enzyme/TSLint/Travis tooling with Testing Library, Vitest, ESLint, and GitHub Actions.

### Migration from 0.0.7

React 16/17, React Redux 6, Redux 4, and Redux Thunk 2 are no longer supported. Use the named
`thunk` export when configuring Redux Thunk 3 yourself; Redux Toolkit already includes it.
Keep existing `<Retry saga={...}>` / `<Retry thunk={...}>` render-prop usage. The named `Retry`
export still accepts an explicit `dispatch`, but is now a function component; class instance refs
and direct instance methods are not part of the beta API. Import only through documented entry points;
deep imports into `dist` are no longer supported. Automatic retries on prop changes remain disabled.

Saga calls are tied to the component/request lifecycle. Cleanup can cancel unfinished saga work,
and a newer retry supersedes older results. Retrying with `[]` now explicitly clears arguments;
thunk retries also accept argument overrides. `skipCallOnMount` is optional and defaults to false.
