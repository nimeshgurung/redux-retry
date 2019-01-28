import { Dispatch } from 'redux';
import { all, apply, takeEvery } from 'redux-saga/effects';

const namespace = 'REDUX__RETRY__ACTION__';
const namespacedAction = `${namespace}HANDLE/RETRY`;
const namespacedActionThunk = `${namespace}HANDLE/THUNK/RETRY`;

export const bindActionToPromise = (dispatch: Dispatch<any>) => (
  saga: () => IterableIterator<any>,
  args?: any[]
) => {
  return new Promise((resolve, reject) => {
    return dispatch({
      type: actionTypes.RETRY,
      saga,
      args,
      resolve,
      reject
    });
  })
};

export const bindThunkToPromise = (dispatch: Dispatch<any>) => (
  thunk: any
) => {
  return new Promise((resolve, reject) => {
    return dispatch(handleThunkRetry(
      {
        type: actionTypes.RETRY_THUNK,
        thunk,
        resolve,
        reject
      })
    );
  })
};


export const actionTypes = {
  RETRY: namespacedAction,
  RETRY_THUNK: namespacedActionThunk
};

export function* handleRetry(action: any) {
  try {
    const result = yield apply(null, action.saga, action.args);
    // tslint:disable-next-line:no-unused-expression
    action.resolve && action.resolve(result);
  } catch (ex) {
    // tslint:disable-next-line:no-unused-expression
    action.reject && action.reject(ex);
  }
}

export function handleThunkRetry(action: any) {
  const { thunk, resolve, reject } = action;
  return (dispatch: Dispatch<any>, getState: () => any) => {
    if (Array.isArray(thunk)) {
      return Promise.all(
        thunk.map(item => {
          return item.call.apply(null, item.args)(dispatch, getState);
        })
      ).then(resolve).catch(reject);
    } else {
      return thunk.call.apply(null, thunk.args)(dispatch, getState)
        .then(resolve).catch(reject)
    }
  }
}

export function* retryRoot() {
  yield all([takeEvery(actionTypes.RETRY, handleRetry)]);
}
