import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { configureStore, createAsyncThunk } from '@reduxjs/toolkit';
import { useRetry } from 'redux-retry/thunk';
import { getPost, reducer } from '../thunk/api.js';

const store = configureStore({ reducer });
const getPostThunk = createAsyncThunk('example/post', getPost);
function Example() {
  const [state, retry] = useRetry({ thunk: { call: getPostThunk, args: [1] } });
  if (state.loading) return <p>...Loading</p>;
  return (
    <div>
      <div data-testid="attempt">{state.retryAttempt}</div>
      <p>{state.error ? 'Error' : state.response?.text}</p>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}
createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <Example />
  </Provider>,
);
