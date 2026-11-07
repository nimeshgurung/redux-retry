import type { RetryCall, RetryDispatch, RetryOperation } from './types';

export const RETRY = 'REDUX__RETRY__ACTION__HANDLE/RETRY';
export const CANCEL = 'REDUX__RETRY__ACTION__HANDLE/CANCEL';

export class RetryCancelledError extends Error {
  constructor() {
    super('Retry operation cancelled');
    this.name = 'RetryCancelledError';
  }
}

interface SagaRequest {
  call: RetryCall['call'];
  args: readonly unknown[];
  started: boolean;
  resolve(value: unknown): void;
  reject(reason: unknown): void;
}

// Redux carries only the ID. Executable values never enter actions or store state.
export const sagaRequests = new Map<number, SagaRequest>();
let nextRequestId = 0;

export function startSaga(
  dispatch: RetryDispatch,
  item: RetryCall,
  args: readonly unknown[],
): RetryOperation {
  const requestId = ++nextRequestId;
  let rejectRequest: (reason: unknown) => void = () => undefined;
  const promise = new Promise((resolve, reject) => {
    rejectRequest = reject;
    sagaRequests.set(requestId, {
      call: item.call,
      args,
      started: false,
      resolve,
      reject,
    });
    try {
      dispatch({ type: RETRY, requestId });
    } catch (error) {
      sagaRequests.delete(requestId);
      reject(error);
    }
  }).finally(() => sagaRequests.delete(requestId));

  return {
    promise,
    cancel() {
      if (!sagaRequests.has(requestId)) return;
      sagaRequests.delete(requestId);
      rejectRequest(new RetryCancelledError());
      dispatch({ type: CANCEL, requestId });
    },
  };
}

export function startThunk(
  dispatch: RetryDispatch,
  item: RetryCall,
  args: readonly unknown[],
): RetryOperation {
  let result: unknown;
  const promise = new Promise((resolve, reject) => {
    try {
      const action = (item.call as (...parameters: unknown[]) => unknown)(...args);
      result = (dispatch as (action: unknown) => unknown)(action);
      resolve(
        result &&
          typeof result === 'object' &&
          'unwrap' in result &&
          typeof result.unwrap === 'function'
          ? result.unwrap()
          : result,
      );
    } catch (error) {
      reject(error);
    }
  });
  return {
    promise,
    cancel() {
      if (
        result &&
        typeof result === 'object' &&
        'abort' in result &&
        typeof result.abort === 'function'
      )
        result.abort();
    },
  };
}
