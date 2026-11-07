import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { call, all } from "redux-saga/effects";
import Retry, { retryRoot } from "redux-retry";
const initialState = {};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

const getCatFacts = function* (id) {
  const response = yield call(
    fetch,
    "https://jsonplaceholder.typicode.com/posts/" + id
  );
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const post = yield response.json();
  return { text: post.body };
};

const root = function* () {
  yield all([retryRoot()]);
};

const sagaMiddleware = createSagaMiddleware();
const store = configureStore({
  reducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware),
});
sagaMiddleware.run(root);

export default class RetryExample extends React.Component {
  render() {
    return (
      <Retry saga={{ call: getCatFacts, args: [1] }}>
        {(retryState, retry) => {
          if (retryState.loading) {
            return <p>...Loading</p>;
          }

          if (retryState.success) {
            return (
              <div>
                <div>{retryState.retryAttempt}</div>
                <p>{retryState.response.text}</p>
                <button type="button" onClick={retry}>
                  Retry
                </button>
              </div>
            );
          }

          if (retryState.error) {
            return (
              <div>
                <div>Error</div>
                <div>{retryState.retryAttempt}</div>
                <button type="button" onClick={retry}>
                  Retry
                </button>
              </div>
            );
          }
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

createRoot(document.getElementById("root")).render(<App />);
