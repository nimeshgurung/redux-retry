import type { Effect } from 'redux-saga/effects';
import { call, cancelled, race, take, takeEvery } from 'redux-saga/effects';
import { CANCEL, RETRY, RetryCancelledError, sagaRequests } from './bridge';

interface RetryAction {
  type: string;
  requestId: number;
}

function* handleRetry(action: RetryAction): Generator<Effect<string, unknown>, void, unknown> {
  const request = sagaRequests.get(action.requestId);
  if (!request || request.started) return;
  request.started = true;
  try {
    const outcome = yield race({
      result: call(request.call as (...parameters: unknown[]) => unknown, ...request.args),
      cancellation: take(
        (candidate: { type: string }) =>
          candidate.type === CANCEL &&
          'requestId' in candidate &&
          candidate.requestId === action.requestId,
      ),
    });
    if (typeof outcome !== 'object' || outcome === null) throw new Error('Invalid saga result');
    if ('cancellation' in outcome) request.reject(new RetryCancelledError());
    else if ('result' in outcome) request.resolve(outcome.result);
  } catch (error) {
    request.reject(error);
  } finally {
    sagaRequests.delete(action.requestId);
    if (yield cancelled()) request.reject(new RetryCancelledError());
  }
}

/** Run once in each store's root saga, as in the original Retry API. */
export function* retryRoot(): Generator<Effect<string, unknown>, void, unknown> {
  yield takeEvery(RETRY, handleRetry);
}
