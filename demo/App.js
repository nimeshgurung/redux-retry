import * as React from 'react';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware, compose } from 'redux';
import createSagaMiddleware from 'redux-saga';
import thunk from 'redux-thunk';
import { call, all } from 'redux-saga/effects';
import Retry, { retryRoot } from './dist/index';
import { Text, Button, View, StyleSheet } from 'react-native';

const initialState = {};

const reducer = (state = initialState, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

const getCatFacts = function*(id) {
  const response = yield call(fetch, 'https://cat-fact.herokuapp.com/facts/' + id);
  return yield response.json();  
};

const root = function*() {
  yield all([retryRoot()]);
};

const getCatFactsThunk = function(id) {
  return (dispatch, getState) => {
    return fetch('https://cat-fact.herokuapp.com/facts/' + id)
      .then((response) => response.json())
  }
}

const sagaMiddleware = createSagaMiddleware();
const store = createStore(reducer, compose(applyMiddleware(sagaMiddleware, thunk)));
sagaMiddleware.run(root);

class RetryExample extends React.Component {
  render() {
    return (
      <Retry thunk={{ call: getCatFactsThunk, args: ['5887e1d85c873e0011036889'] }}>
        {(retryState, retry) => {
          if (retryState.loading) {
            return (
              <View style={styles.container}>
                <Text>...Loading</Text>
              </View>
            );
          }

          if (retryState.success) {
            return (
              <View style={styles.container}>
                <Text>{retryState.retryAttempt}</Text>
                <Text>{retryState.response.text}</Text>
                <Button title={'Retry'} onPress={retry} />
              </View>
            );
          }

          if (retryState.error) {
            return (
              <View style={styles.container}>
                <Text>{retryState.exception.message}</Text>
                <Text>{retryState.retryAttempt}</Text>
                <Button title={'Retry'} onPress={retry} />
              </View>
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

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
    backgroundColor: 'white',
    padding: 8,
  },
});
