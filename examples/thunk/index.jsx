import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { legacy_createStore, applyMiddleware } from 'redux';
import { configureStore } from '@reduxjs/toolkit';
import Retry from 'redux-retry/thunk';
import { thunk } from 'redux-thunk';
import { getPost, reducer, failNextRequest } from './api.js';
import { RequestState } from '../RequestState.jsx';

const loadPostThunk = (id) => () => getPost(id);
const classic = new URLSearchParams(location.search).get('store') === 'classic';
const store = classic
  ? legacy_createStore(reducer, applyMiddleware(thunk))
  : configureStore({ reducer });

export default class RetryExample extends React.Component {
  render() {
    return (
      <Retry thunk={{ call: loadPostThunk, args: [1] }}>
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
