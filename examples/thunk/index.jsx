import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { legacy_createStore, applyMiddleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import Retry from 'redux-retry/thunk';
import { thunk } from 'redux-thunk';
import { getPost, reducer } from './api.js';

const getCatFactsThunk = (id) => () => getPost(id);
const classic = new URLSearchParams(location.search).get('store') === 'classic';
const store = classic
  ? legacy_createStore(reducer, applyMiddleware(thunk))
  : configureStore({ reducer });

export default class RetryExample extends React.Component {
  render() {
    return (
      <Retry thunk={{ call: getCatFactsThunk, args: [1] }}>
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
