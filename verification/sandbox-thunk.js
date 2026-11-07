import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { createStore, applyMiddleware, compose } from "redux";
import Retry from "redux-retry";
import { thunk } from "redux-thunk";

const initialState = {};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

const getCatFactsThunk = function (id) {
  return (dispatch, getState) => {
    return fetch("https://jsonplaceholder.typicode.com/posts/" + id)
      .then((response) => {
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        return response.json();
      })
      .then((post) => ({ text: post.body }));
  };
};

const store = createStore(reducer, compose(applyMiddleware(thunk)));

export default class RetryExample extends React.Component {
  render() {
    return (
      <Retry thunk={{ call: getCatFactsThunk, args: [1] }}>
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
