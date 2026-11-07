import type { ReactNode } from 'react';
import { createAsyncThunk } from '@reduxjs/toolkit';
import Retry, { Retry as UnconnectedRetry, useRetry } from 'redux-retry';
import type { IRetryThunk } from 'redux-retry';
import type { Dispatch } from 'redux';

const thunk = (id: number, label: string) => () => Promise.resolve({ id, label });
const asyncThunk = createAsyncThunk('typed/request', async (id: number) => ({ id }));
function* saga(id: number): Generator<void, { id: number }, unknown> {
  yield;
  return { id };
}
declare function equalType<T>(value: T): void;
declare const dispatch: Dispatch;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
declare function assertTrue<T extends true>(): T;

const annotated: IRetryThunk<typeof thunk> = { call: thunk, args: [1, 'one'] };
const legacyAnnotated: IRetryThunk = { call: thunk, args: [1, 'one'] };

export function TypeChecks(): ReactNode {
  const [state, retry] = useRetry({ thunk: { call: thunk, args: [1, 'one'] } });
  equalType<number | undefined>(state.response?.id);
  assertTrue<Equal<typeof state.response, { id: number; label: string } | undefined>>();
  const [annotatedState] = useRetry({ thunk: annotated });
  equalType<number | undefined>(annotatedState.response?.id);
  assertTrue<Equal<typeof annotatedState.response, { id: number; label: string } | undefined>>();
  useRetry({ thunk: legacyAnnotated });
  retry([2, 'two']);
  // @ts-expect-error wrong argument type
  retry(['wrong', 'two']);
  // @ts-expect-error wrong initial argument type
  useRetry({ thunk: { call: thunk, args: ['wrong', 'one'] } });
  // @ts-expect-error saga and thunk are mutually exclusive
  useRetry({ thunk: { call: thunk, args: [1, 'one'] }, saga: { call: saga, args: [1] } });
  const [sagaState] = useRetry({ saga: { call: saga, args: [1] } });
  equalType<number | undefined>(sagaState.response?.id);
  assertTrue<Equal<typeof sagaState.response, { id: number } | undefined>>();
  const [rtkState] = useRetry({ thunk: { call: asyncThunk, args: [1] } });
  equalType<number | undefined>(rtkState.response?.id);
  assertTrue<Equal<typeof rtkState.response, { id: number } | undefined>>();
  const [batch] = useRetry({
    thunk: [
      { call: thunk, args: [1, 'one'] },
      { call: () => () => Promise.resolve(42), args: [] },
    ] as const,
  });
  equalType<string | undefined>(batch.response?.[0].label);
  equalType<number | undefined>(batch.response?.[1]);
  assertTrue<Equal<typeof batch.response, [{ id: number; label: string }, number] | undefined>>();
  const [optional] = useRetry({
    thunk: {
      call:
        (id = 1) =>
        () =>
          Promise.resolve(id),
    },
  });
  equalType<number | undefined>(optional.response);
  assertTrue<Equal<typeof optional.response, number | undefined>>();
  // @ts-expect-error excess arguments for a zero-argument action creator
  useRetry({ thunk: { call: () => () => 42, args: [1] } });
  return (
    <>
      <Retry thunk={{ call: thunk, args: [1, 'one'] }}>
        {(value, again) => {
          assertTrue<Equal<typeof value.response, { id: number; label: string } | undefined>>();
          return <button onClick={again}>{value.response?.label}</button>;
        }}
      </Retry>
      <UnconnectedRetry dispatch={dispatch} saga={{ call: saga, args: [1] }}>
        {(value) => <span>{value.response?.id}</span>}
      </UnconnectedRetry>
    </>
  );
}
