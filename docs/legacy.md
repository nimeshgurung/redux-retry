<p align="center"><img src="https://raw.githubusercontent.com/nimeshgurung/redux-retry/v1.0.0-beta.1/assets/logos/blue-nodes.png" alt="redux-retry" width="560"></p>

# redux-retry

[![Build, types and tests](https://github.com/nimeshgurung/redux-retry/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/nimeshgurung/redux-retry/actions/workflows/ci.yml)
[![Publish to npm](https://github.com/nimeshgurung/redux-retry/actions/workflows/release.yml/badge.svg?branch=master)](https://github.com/nimeshgurung/redux-retry/actions/workflows/release.yml)
[![npm latest](https://img.shields.io/npm/v/redux-retry/latest?label=npm%20latest)](https://www.npmjs.com/package/redux-retry)

Keep request-scoped loading, error, and retry state local to the calling component,
without adding transient UI state to your Redux store.

This legacy release supports React 16, React Redux 6, Redux 4, Redux Saga 1, and Redux Thunk 2.

```sh
npm install redux-retry
```

For React 18/19, React Redux 9, Redux 5, and `useRetry`, install `redux-retry@next`.
See the [modern documentation](https://github.com/nimeshgurung/redux-retry#readme)
and [live demo](https://nimeshgurung.github.io/redux-retry/) (both describe the modern 1.x release).

## Redux retry in a nutshell

Redux retry is a simple component, which calls the redux middleware functions, and maintains the loading, success or failure state of the middleware functions. In a nutshell all it does is brings a lot of stuff that deals with making api request via the middleware functions and the maintenance of state around it away from the redux store, and brings it inline inside the component itself, for easy state management.

#### Example:

```tsx
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { call, all } from 'redux-saga/effects';
import Retry, { retryRoot } from 'redux-retry';
const initialState = {};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

const getProfile = function* (id) {
  const response = yield call(fetch, 'https://jsonplaceholder.typicode.com/users/' + id);
  return yield response.json();
};

const root = function* () {
  // This part is important for redux-retry to be able
  // to hook into the redux-saga ecosystem of your app
  yield all([retryRoot()]);
};

const sagaMiddleware = createSagaMiddleware();
const store = createStore(reducer, compose(applyMiddleware(sagaMiddleware)));
sagaMiddleware.run(root);

export default class RetryExample extends React.Component {
  render() {
    return (
      <Retry saga={{ call: getProfile, args: [1] }}>
        {(retryState, retry) => {
          if (retryState.loading) {
            return <p>...Loading</p>;
          }

          if (retryState.success) {
            return (
              <div>
                <div>{retryState.retryAttempt}</div>
                <p>{retryState.response.name}</p>
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

render(<App />, document.getElementById('root'));
```

The [live demo](https://nimeshgurung.github.io/redux-retry/) includes modern Saga and Thunk examples.
The component API below applies to this legacy release.

#### RetryRoot - [only required for redux saga]

```typescript
import { retryRoot } from 'redux-retry';

export function* rootSaga() {
  yield all([retryRoot()]);
}
```

Retryroot is a helper function that is exposed by `redux-rery` that allows the `Retry` component to be able to hook into the redux ecosystem of your app. Without hooking the `retryRoot` to your applications root saga, the `Retry` component won't be able to make the saga calls. This is not necessary if you want to only use `thunks` with `redux-retry`.

#### Passing middleware functions to redux-retry

When you provide `saga` or a `thunk` as a prop it expects either an `object` or an `array`.

Example usage with saga:

```tsx
<Retry saga={{ call: saga, args: [arg1, arg2] }}>{(retryState, retry) => null}</Retry>
```

Exmaple usage with thunk:

```tsx
<Retry thunk={{ call: thunk, args: [arg1, arg2] }}>{(retryState, retry) => null}</Retry>
```

The value of the call is the actual `saga` ort `thunk` you want to be called when the component mounts, args is the list of arguments you want to be applied to the middleware function when the retry component calls the middleware function.

Example usage with multiple saga:

```tsx
<Retry
  saga={[
    {
      call: saga1,
      args: [arg1, arg2],
    },
    {
      call: saga2,
      args: [arg3, arg4],
    },
  ]}
>
  {(retryState, retry) => null}
</Retry>
```

Example usage with multiple thunks:

```tsx
<Retry
  thunk={[
    {
      call: thunk1,
      args: [arg1, arg2],
    },
    {
      call: thunk2,
      args: [arg3, arg4],
    },
  ]}
>
  {(retryState, retry) => null}
</Retry>
```

In this above scenario it will call all middleware functions just like `Promise.all`. If any one of the requests fails it will result in failed state.

#### Children prop

The childern prop is something that is provided to the Retry component by the consumer of the component.

Example:

```tsx
<Retry thunk={{ call: thunk, args: [1, 2] }}>
  {(retryState, retry) => {
    return (
      <React.Fragment>
        <div>{retrsyState.retryAttempt}</div>
        <button onClick={retry}>Retry</button>
        <div>{retryState.response}</div>
      </React.Fragment>
    );
  }}
</Retry>
```

In return the Retry component calls the children prop with two arguments, the `retryState` and the `retry` function.

#### RetryState

The retry state is a represenstation of the state of the retry component internally and is exposed to the consumer. It provides the following attributes.

```typescript
interface IRetryState {
  retryAttempt: number; // the number of retry attempts
  error: boolean; // true when saga throws an error
  exception: unknown; // The exception that was thrown
  success: boolean; // true when request was successful
  loading: boolean; // true when request is in flight
  response: unknown; // reponse returned from the saga
}
```

If an error happens the `error` flag is set to true however the actual exception is provided in the `exception` attribute.

In the same way if the request was successful the `success` flag is turned true but the actual `response` again is provided in the `response` attribute.

If the saga is still in operation and hasn't finished processing yet, the `loading` flag will be set to true.

The `retryAttempt` attribute simply gives the count of how many times the saga has been retried. Everytime any one of the state changes the `Retry` component internally calls `setState` which in turn re-renders the children of `Retry` component with appropriate state.

#### Retry function

The retry function get's passed in as a second argument to the children prop function. When it is invoked the `Retry` component simply `retries` the saga with the arguments passed in for that saga.

#### When does the Retry component call the redux middleware or the async function?

The provided redux middleware function is called by the `Retry` after it is mounted in `componentDidMount`. The retry component does not retry the middleware functions, on prop updates.

## Motivation behind the component

Not everything should be stored in redux store. `Loading`, `Success`, `Error` these are all normally the state we have to manage for any outgoing api calls. Most of the time we only care about tiny part of the response that we want to store. Maintaining loading, success and error scenario for each and every api calls is a bit of overkill and is a mental overhead that if can be avoided makes life simpler. Bringing the maintainance of these state inline seems to fare a lot better, leaving redux to be used only when absolutely necessary.

Also if you ever have had requirements to handle, retrying of requests, maintaining all that state in redux store, actions, props and dispatches becomes a mess that is hard to maintain.
