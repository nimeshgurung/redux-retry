import { Dispatch } from 'redux';
import { all, apply, takeEvery } from 'redux-saga/effects';

const namespace = 'REDUX__RETRY__ACTION__';
const namespacedAction = `${namespace}HANDLE/RETRY`;

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

export const actionTypes = {
  RETRY: namespacedAction
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

// TODO: Add support for redux thunk at some point

// export async function handleThunk(thunk: IRetryThunk | IRetryThunk[]) {
//   const dispatch = singleton.dispatch;
//   const getState = singleton.getState;
//   if (Array.isArray(thunk)) {
//     return Promise.all(
//       thunk.map(item => {
//         return item.call.apply(null, item.args)(dispatch, getState);
//       })
//     );
//   } else {
//     return thunk.call.apply(null, thunk.args)(dispatch, getState);
//   }
// }

export function* retryRoot() {
  yield all([takeEvery(actionTypes.RETRY, handleRetry)]);
}
