import './styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { legacy_createStore, applyMiddleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { call, all } from 'redux-saga/effects';
import Retry, { retryRoot } from 'redux-retry';
import { getProfile, reducer, failNextRequest } from './api.js';
import { RequestState } from '../RequestState.jsx';

const loadProfile = function* (id) {
  return yield call(getProfile, id);
};
const root = function* () {
  yield all([retryRoot()]);
};
const sagaMiddleware = createSagaMiddleware();
const classic = new URLSearchParams(location.search).get('store') === 'classic';
const store = classic
  ? legacy_createStore(reducer, applyMiddleware(sagaMiddleware))
  : configureStore({ reducer, middleware: (getDefault) => getDefault().concat(sagaMiddleware) });
sagaMiddleware.run(root);

export default class RetryExample extends React.Component {
  render() {
    return (
      <Retry saga={{ call: loadProfile, args: [1] }}>
        {(state, retry) => (
          <RequestState state={state} retry={retry} failNextRequest={failNextRequest} />
        )}
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
