import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { startSaga, startThunk } from './bridge';
import type {
  IRetryState,
  RetryCall,
  RetryCalls,
  RetryDispatch,
  RetryHandler,
  RetryOperation,
  RetryOptions,
  RetryProps,
  RetryResponse,
} from './types';

function initialState<Response>(loading: boolean): IRetryState<Response> {
  return {
    retryAttempt: 0,
    error: false,
    exception: undefined,
    success: false,
    loading,
    response: undefined,
  };
}

function useRetryWithDispatch<C extends RetryCalls>(
  options: RetryOptions<C>,
  dispatch: RetryDispatch,
): [IRetryState<RetryResponse<C>>, RetryHandler<C>] {
  const [state, setState] = useState(() =>
    initialState<RetryResponse<C>>(!options.skipCallOnMount),
  );
  const latestOptions = useRef(options);
  const active = useRef(false);
  const requestId = useRef(0);
  const operations = useRef<RetryOperation[]>([]);

  // Prop updates affect the next manual retry, without automatically making another call.
  useEffect(() => {
    latestOptions.current = options;
  });

  const cancel = useCallback(() => {
    requestId.current += 1;
    operations.current.forEach((operation) => operation.cancel());
    operations.current = [];
  }, []);

  const run = useCallback(
    (isRetry: boolean, args?: unknown[]) => {
      if (!active.current) return;
      cancel();
      const currentId = requestId.current;
      const current = latestOptions.current;
      setState((previous) => ({
        ...initialState<RetryResponse<C>>(true),
        retryAttempt: previous.retryAttempt + (isRetry ? 1 : 0),
      }));
      const calls = current.saga ?? current.thunk;
      const batch = Array.isArray(calls);
      const items = (batch ? calls : [calls]) as readonly RetryCall[];
      const start = current.saga ? startSaga : startThunk;
      operations.current = items.map((item) => start(dispatch, item, args ?? item.args ?? []));
      const pending = operations.current;
      void Promise.all(pending.map((operation) => operation.promise)).then(
        (responses) => {
          if (!active.current || currentId !== requestId.current) return;
          operations.current = [];
          setState((previous) => ({
            ...initialState<RetryResponse<C>>(false),
            retryAttempt: previous.retryAttempt,
            success: true,
            response: (batch ? responses : responses[0]) as RetryResponse<C>,
          }));
        },
        (exception) => {
          if (!active.current || currentId !== requestId.current) return;
          cancel();
          setState((previous) => ({
            ...initialState<RetryResponse<C>>(false),
            retryAttempt: previous.retryAttempt,
            error: true,
            exception,
          }));
        },
      );
    },
    [cancel, dispatch],
  );

  useEffect(() => {
    active.current = true;
    if (!latestOptions.current.skipCallOnMount) run(false);
    return () => {
      active.current = false;
      cancel();
    };
  }, [cancel, run]);

  // Ignore UI event objects so existing onClick={retry} / onPress={retry} keep working.
  const retry = useCallback(
    (args?: unknown[]) => run(true, Array.isArray(args) ? args : undefined),
    [run],
  );
  return [state, retry as RetryHandler<C>];
}

export function useRetry<C extends RetryCalls>(
  options: RetryOptions<C>,
): [IRetryState<RetryResponse<C>>, RetryHandler<C>] {
  return useRetryWithDispatch<C>(options, useDispatch() as RetryDispatch);
}

/** Unconnected component retained for consumers that explicitly provide dispatch. */
export function Retry<C extends RetryCalls>(props: RetryProps<C> & { dispatch: RetryDispatch }) {
  const [state, retry] = useRetryWithDispatch<C>(props, props.dispatch);
  return state.loading && props.loader ? props.loader : props.children(state, retry);
}

export default function ConnectedRetry<C extends RetryCalls>(props: RetryProps<C>) {
  const dispatch = useDispatch() as RetryDispatch;
  return <Retry<C> {...props} dispatch={dispatch} />;
}
