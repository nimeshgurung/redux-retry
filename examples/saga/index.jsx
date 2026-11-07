import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { call, all } from 'redux-saga/effects';
import Retry, { retryRoot } from 'redux-retry';
import { getPost, reducer } from './api.js';

const getCatFacts = function* (id) {
  return yield call(getPost, id);
};
const root = function* () {
  yield all([retryRoot()]);
};
const sagaMiddleware = createSagaMiddleware();
const toolkit = new URLSearchParams(location.search).get('store') === 'toolkit';
const store = toolkit
  ? configureStore({ reducer, middleware: (getDefault) => getDefault().concat(sagaMiddleware) })
  : createStore(reducer, compose(applyMiddleware(sagaMiddleware)));
sagaMiddleware.run(root);

export default class RetryExample extends React.Component {
  render() {
    return (
      <Retry saga={{ call: getCatFacts, args: [1] }}>
        {(retryState, retry) => {
          if (retryState.loading) return <p>...Loading</p>;
          if (retryState.success)
            return (
              <div>
                <div data-testid="attempt">{retryState.retryAttempt}</div>
                <p>{retryState.response.text}</p>
                <button type="button" onClick={retry}>
                  Retry
                </button>
              </div>
            );
          if (retryState.error)
            return (
              <div>
                <div>Error</div>
                <div data-testid="attempt">{retryState.retryAttempt}</div>
                <button type="button" onClick={retry}>
                  Retry
                </button>
              </div>
            );
          return null;
        }}
      </Retry>
    );
  }
}
const App = () => (
  <Provider store={store}>
    <RetryExample />
  </Provider>
);
createRoot(document.getElementById('root')).render(<App />);
