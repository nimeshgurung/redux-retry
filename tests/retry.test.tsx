import type { PropsWithChildren } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { configureStore, createAsyncThunk } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import createSagaMiddleware from 'redux-saga';
import { all, call, cancelled } from 'redux-saga/effects';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Retry, { Retry as UnconnectedRetry, retryRoot, useRetry } from 'redux-retry';

afterEach(cleanup);

function setup() {
  const saga = createSagaMiddleware();
  const store = configureStore({
    reducer: (state = { value: 7 }) => state,
    middleware: (getDefault) => getDefault({ thunk: { extraArgument: 'injected' } }).concat(saga),
  });
  const task = saga.run(function* () {
    yield all([retryRoot()]);
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, task, wrapper };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe.each(['saga', 'thunk'] as const)('%s integration', (adapter) => {
  function definition(run: (...args: unknown[]) => unknown) {
    return adapter === 'saga'
      ? {
          saga: {
            call: function* (...args: unknown[]): Generator {
              return yield call(run, ...args);
            },
            args: ['initial'],
          },
        }
      : {
          thunk: {
            call:
              (...args: unknown[]) =>
              () =>
                run(...args),
            args: ['initial'],
          },
        };
  }

  it('preserves the connected render-prop component: loading, response, event-handler retry and count', async () => {
    const { wrapper, task } = setup();
    const requests: ReturnType<typeof deferred<string>>[] = [];
    const run = vi.fn(() => {
      const next = deferred<string>();
      requests.push(next);
      return next.promise;
    });
    render(
      <Retry {...definition(run)}>
        {(state, retry) => (
          <>
            <p>{state.loading ? 'Loading' : state.error ? 'Error' : String(state.response)}</p>
            <span data-testid="attempt">{state.retryAttempt}</span>
            <button onClick={retry}>Retry</button>
          </>
        )}
      </Retry>,
      { wrapper },
    );
    expect(screen.getByText('Loading')).toBeTruthy();
    expect(run).toHaveBeenCalledExactlyOnceWith('initial');
    await act(async () => requests[0]!.resolve('first response'));
    expect(screen.getByText('first response')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByText('Loading')).toBeTruthy();
    expect(screen.getByTestId('attempt').textContent).toBe('1');
    expect(run).toHaveBeenLastCalledWith('initial');
    await act(async () => requests[1]!.resolve('second response'));
    expect(screen.getByText('second response')).toBeTruthy();
    expect(run).toHaveBeenCalledTimes(2);
    task.cancel();
  });

  it('exposes failure and recovers on manual retry through useRetry', async () => {
    const { wrapper, task } = setup();
    const failure = new Error('offline');
    const run = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce('recovered');
    const { result } = renderHook(() => useRetry(definition(run)), { wrapper });
    await waitFor(() => expect(result.current[0].error).toBe(true));
    expect(result.current[0].exception).toBe(failure);
    expect(result.current[0].loading).toBe(false);
    act(() => result.current[1]());
    expect(result.current[0].loading).toBe(true);
    expect(result.current[0].exception).toBeUndefined();
    await waitFor(() => expect(result.current[0].response).toBe('recovered'));
    expect(result.current[0].retryAttempt).toBe(1);
    expect(result.current[0].success).toBe(true);
    task.cancel();
  });

  it('skips mount, accepts new props only on retry, and allows an empty argument override', async () => {
    const { wrapper, task } = setup();
    const first = vi.fn(() => Promise.resolve('old'));
    const second = vi.fn(() => Promise.resolve('new'));
    const { result, rerender } = renderHook(
      ({ run }) =>
        useRetry({
          ...definition(run),
          skipCallOnMount: true,
        }),
      { wrapper, initialProps: { run: first } },
    );
    expect(result.current[0].loading).toBe(false);
    expect(first).not.toHaveBeenCalled();
    rerender({ run: second });
    expect(second).not.toHaveBeenCalled();
    act(() => result.current[1]([]));
    await waitFor(() => expect(result.current[0].response).toBe('new'));
    expect(second).toHaveBeenCalledExactlyOnceWith();
    task.cancel();
  });

  it('prevents stale completions from overwriting the most recent retry', async () => {
    const { wrapper, task } = setup();
    const old = deferred<string>();
    const current = deferred<string>();
    const run = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    const { result } = renderHook(() => useRetry(definition(run)), { wrapper });
    act(() => result.current[1]());
    await act(async () => current.resolve('current'));
    await act(async () => old.resolve('stale'));
    expect(result.current[0].response).toBe('current');
    expect(result.current[0].retryAttempt).toBe(1);
    task.cancel();
  });

  it('maintains accurate attempt counts under rapid retries', async () => {
    const { wrapper, task } = setup();
    const run = vi.fn(() => Promise.resolve('ok'));
    const { result } = renderHook(() => useRetry({ ...definition(run), skipCallOnMount: true }), {
      wrapper,
    });
    act(() => {
      result.current[1]();
      result.current[1]();
      result.current[1]();
    });
    await waitFor(() => expect(result.current[0].success).toBe(true));
    expect(result.current[0].retryAttempt).toBe(3);
    expect(run).toHaveBeenCalledTimes(3);
    task.cancel();
  });

  it('settles a batch in input order and fails the batch if any call fails', async () => {
    const { wrapper, task } = setup();
    const a = deferred<string>();
    const b = deferred<string>();
    const one = definition(() => a.promise);
    const two = definition(() => b.promise);
    const options =
      adapter === 'saga' ? { saga: [one.saga!, two.saga!] } : { thunk: [one.thunk!, two.thunk!] };
    const { result } = renderHook(() => useRetry(options), { wrapper });
    await act(async () => b.resolve('b'));
    expect(result.current[0].loading).toBe(true);
    await act(async () => a.resolve('a'));
    expect(result.current[0].response).toEqual(['a', 'b']);
    task.cancel();

    const next = setup();
    const fail = definition(() => Promise.reject(new Error('batch failed')));
    const failOptions =
      adapter === 'saga' ? { saga: [one.saga!, fail.saga!] } : { thunk: [one.thunk!, fail.thunk!] };
    const rendered = renderHook(() => useRetry(failOptions), { wrapper: next.wrapper });
    await waitFor(() => expect(rendered.result.current[0].error).toBe(true));
    expect(rendered.result.current[0].success).toBe(false);
    next.task.cancel();
  });

  it('cleans up correctly through the StrictMode setup/cleanup/setup cycle', async () => {
    const { wrapper: StoreProvider, task } = setup();
    const pending: ReturnType<typeof deferred<string>>[] = [];
    const run = vi.fn(() => {
      const next = deferred<string>();
      pending.push(next);
      return next.promise;
    });
    const wrapper = StoreProvider;
    const { result, unmount } = renderHook(() => useRetry(definition(run)), {
      wrapper,
      reactStrictMode: true,
    });
    expect(run).toHaveBeenCalledTimes(2);
    await act(async () => pending[0]!.resolve('obsolete mount'));
    expect(result.current[0].success).toBe(false);
    await act(async () => pending[1]!.resolve('active mount'));
    expect(result.current[0].response).toBe('active mount');
    unmount();
    task.cancel();
  });

  it('retains a custom loader and the explicit-dispatch named component', async () => {
    const { store, task } = setup();
    const pending = deferred<string>();
    render(
      <UnconnectedRetry
        {...definition(() => pending.promise)}
        dispatch={store.dispatch}
        loader={<p>Custom loader</p>}
      >
        {(state) => <p>{String(state.response)}</p>}
      </UnconnectedRetry>,
    );
    expect(screen.getByText('Custom loader')).toBeTruthy();
    await act(async () => pending.resolve('done'));
    expect(screen.getByText('done')).toBeTruthy();
    task.cancel();
  });
});

it('runs thunks through the configured middleware, including extraArgument and synchronous returns', async () => {
  const { wrapper, task } = setup();
  const thunk =
    (id: number) => (dispatch: unknown, getState: () => { value: number }, extra: string) => {
      expect(typeof dispatch).toBe('function');
      return `${extra}:${getState().value}:${id}`;
    };
  const { result } = renderHook(() => useRetry({ thunk: { call: thunk, args: [42] } }), {
    wrapper,
  });
  await waitFor(() => expect(result.current[0].response).toBe('injected:7:42'));
  task.cancel();
});

it('unwraps fulfilled, thrown, and rejectWithValue createAsyncThunk results', async () => {
  const { wrapper, task } = setup();
  const thunk = createAsyncThunk('test/request', async (mode: string, { rejectWithValue }) => {
    if (mode === 'reject') return rejectWithValue('validation failed');
    if (mode === 'throw') throw new Error('network failed');
    return 'payload';
  });
  const { result } = renderHook(() => useRetry({ thunk: { call: thunk, args: ['ok'] } }), {
    wrapper,
  });
  await waitFor(() => expect(result.current[0].response).toBe('payload'));
  act(() => result.current[1](['reject']));
  await waitFor(() => expect(result.current[0].exception).toBe('validation failed'));
  expect(result.current[0].success).toBe(false);
  act(() => result.current[1](['throw']));
  await waitFor(() =>
    expect(result.current[0].exception).toMatchObject({ message: 'network failed' }),
  );
  task.cancel();
});

it('aborts an RTK thunk on unmount', async () => {
  const { wrapper, task } = setup();
  const abort = vi.fn();
  const thunk = createAsyncThunk('test/abort', async (_, { signal }) => {
    signal.addEventListener('abort', abort);
    return new Promise(() => undefined);
  });
  const { unmount } = renderHook(() => useRetry({ thunk: { call: thunk } }), { wrapper });
  unmount();
  await waitFor(() => expect(abort).toHaveBeenCalledOnce());
  task.cancel();
});

it('cancels saga work on unmount and leaves RTK serializability checks enabled', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  const onCancel = vi.fn();
  const { wrapper, task } = setup();
  function* work(): Generator {
    try {
      yield call(() => new Promise(() => undefined));
    } finally {
      if (yield cancelled()) onCancel();
    }
  }
  const { unmount } = renderHook(() => useRetry({ saga: { call: work } }), { wrapper });
  unmount();
  await waitFor(() => expect(onCancel).toHaveBeenCalledOnce());
  expect(error).not.toHaveBeenCalled();
  task.cancel();
});

it('isolates concurrent saga requests across stores', async () => {
  const a = setup();
  const b = setup();
  const first = deferred<string>();
  const second = deferred<string>();
  function* work(pending: Promise<string>): Generator {
    return yield call(() => pending);
  }
  const one = renderHook(() => useRetry({ saga: { call: work, args: [first.promise] } }), {
    wrapper: a.wrapper,
  });
  const two = renderHook(() => useRetry({ saga: { call: work, args: [second.promise] } }), {
    wrapper: b.wrapper,
  });
  await act(async () => second.resolve('second store'));
  expect(one.result.current[0].loading).toBe(true);
  expect(two.result.current[0].response).toBe('second store');
  await act(async () => first.resolve('first store'));
  expect(one.result.current[0].response).toBe('first store');
  a.task.cancel();
  b.task.cancel();
});
