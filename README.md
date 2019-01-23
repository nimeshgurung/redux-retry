Redux retry
=========================

[![devDependency Status](https://david-dm.org/timreynolds/typescript-npm-package-starter/dev-status.svg)](https://david-dm.org/timreynolds/typescript-npm-package-starter#info=devDependencies)
[![Build Status](https://travis-ci.com/nimeshgurung/redux-retry.svg?branch=master)](https://travis-ci.com/nimeshgurung/redux-retry)

Retry redux midllware functions with less hassle and ceremony. Currently supports only redux saga.

## Motivation behind the component
In the redux ecosytem when making async request the code goes through this whole tedious process or cycle of tying up the loading state, success state and error state with the redux store. Then we funnel it down with props to the components where we require them. This starts becoming really tedious after a while in a project when you try to hook the store, actions and components together and you just want to get stuff done without all the ceremony.

If the requirements also asks for the user to be able to retry the failed requests and if you need maintain UI behaviour depending on the retry counts, then the sagas or thunks start looking muddled,and the mental model of what is happening where becomes confusing, especially in large scale project.
 
## Redux retry in a nutshell
Redux retry is just a simple component, which calls the redux middleware functions, and maintains the loading, success or failure state of the middleware functions `[support for redux thunk is not added yet, only redux saga is currently supported]`. In a nutshell all it does is brings a lot of stuff that deals with making api request via the middleware function and the maintenance of state around it away from the redux store, brings it inline in inside the component.

### Example:

```tsx
import { call } from 'redux-saga/effects';

function *todoSaga(id) {
  const response = yield call(fetch, `http://api.todos.com/todos/${id}`);

  const todo = response.json()

  // you can update the store if you would like to
  yield put({ action: 'UPDATE_TODO', todo})

  return todo.
}

class Todo extends React.Component {
  render() {
    return (
      <Retry saga={{ call: todoSaga, args: ['id']}}>
        {({retryState, retry}) => {
          if (retryState.loading) {
            return (<p>Loading...</p>)
          }

          if (retryState.error) {
            return (
              <p>
                {retryState.exception}
                <button onClick={retry}>Retry</button>
              </p>
            )
          }

          if (retryState.success) {
            return (<p>{retryState.response.todo.name}</p>)
          }
        }}
      </Retry>
    )
  }
}
```

### Saga prop

When you provide saga as a prop it expects either an `object` or an `array`.

Example 1:

```tsx
  <Retry saga={{ call: saga, args:[arg1, arg2]}} >
     {(retryState, retry) => null}
  </Retry>
```


The value of the call is the actual saga you want to be called, args is the arguments you want to be applied to the saga.


Example 2: 

```tsx
  <Retry saga = {[
          {
            call: saga1,
            args: [arg1, arg2]
          },
          {
            call: saga2,
            args: [arg3, arg4]
          }
        ]} >
    {(retryState, retry) => null}
  </Retry>
```

In this above scenario it will call the sagas just like `Promise.all`. If any one of the requests fails it will result in failed state.

#### Children prop

The childern prop is something that is provided to the Retry component by the consumer of the component.

Example


```tsx
<Retry saga={{call: saga, args:[1, 2]}}>
    {(retryState, retry) => {
    <React.Fragment>
      <div>{retrsyState.retryAttempt}</div>
      <button onClick={retry}>Retry</button>
      <div>{retryState.response}</div>
    </React.Fragment>
    }}
</Retry>
```

In return the Retry component calls the children prop with two arguments the `retryState` and the `retry` function.

#### RetryState

The retry state is an represenstation of the state of the retry component internally and is exposed to the consumer. It provides the following attributes. It is in typescript but I the general gist of what type of value is provided is obvious looking at the code.

```typescript
  interface IRetryState {
    retryAttempt: number;
    error: boolean;
    exception: unknown; 
    success: boolean;
    loading: boolean;
    response: unknown;
  }
```

If an error happens the `error` flag is set to true however the actual exception is provided in the `exception` attribute.

In the same way if the `success` request was successful the `success` flag is turned true but the actual `response` again is provided in the `response` attribute.

If the saga is still in operation and hasn't finished processing yet the `loading` flag will be set to true.

The `retryAttempt` attribute simply gives the count of how many times the saga has been retried.


#### Retry function

The retry function get's passed in as a second argument to the children prop function. When it is invoked the `Retry` component simply `retries` the saga with the arguments passed in for that saga.


#### When does the Retry component call the redux middleware or the async function?

The provided redux middleware function or the async request is called by the `Retry` after the component is mounted in `componentDidMount`. The retry component does not retry the provided middleware or async request when any prop update happens to prop passed to the retry component. 

