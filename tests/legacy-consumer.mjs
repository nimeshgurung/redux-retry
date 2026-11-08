import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import { URL } from 'node:url';

const require = createRequire(new URL('../.compat/legacy/consumer/package.json', import.meta.url));
const React = require('react');
const { act, create } = require('react-test-renderer');
const { Provider } = require('react-redux');
const { createStore, applyMiddleware } = require('redux');
const createSagaMiddleware = require('redux-saga').default;
const thunk = require('redux-thunk').default;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

for (const packageName of ['redux-retry-original', 'redux-retry']) {
  const library = require(packageName);
  for (const adapter of ['saga', 'thunk']) {
    function setup({ batch = false, skip = false, loader, connected = true } = {}) {
      const saga = createSagaMiddleware();
      const store = createStore(
        (state = { domain: 'unchanged' }) => state,
        applyMiddleware(thunk, saga),
      );
      const task = saga.run(library.retryRoot);
      const requests = [];
      const args = [];
      let state;
      let retry;
      const request = (...values) => {
        args.push(values);
        const pending = deferred();
        requests.push(pending);
        return pending.promise;
      };
      const definition = {
        call:
          adapter === 'saga'
            ? function* (...values) {
                return yield request(...values);
              }
            : (...values) =>
                () =>
                  request(...values),
        args: ['profile'],
      };
      const props = {
        [adapter]: batch ? [definition, { ...definition, args: ['settings'] }] : definition,
        skipCallOnMount: skip,
        loader,
        ...(connected ? {} : { dispatch: store.dispatch }),
        children: (next, handler) => {
          state = { ...next };
          retry = handler;
          return React.createElement(
            'button',
            { onClick: handler },
            next.loading ? 'Loading' : 'Retry',
          );
        },
      };
      const component = connected ? library.default : library.Retry;
      const element = () =>
        React.createElement(Provider, { store }, React.createElement(component, props));
      let renderer;
      act(() => {
        renderer = create(element());
      });
      return {
        requests,
        args,
        props,
        store,
        renderer,
        get state() {
          return state;
        },
        retry: (values) => act(() => retry(values)),
        update: () => act(() => renderer.update(element())),
        close: () => {
          act(() => renderer.unmount());
          task.cancel();
        },
      };
    }

    test(`${packageName} ${adapter}: loading, success and button retry`, async () => {
      const app = setup();
      try {
        assert.equal(app.state.loading, true);
        assert.deepEqual(app.args, [['profile']]);
        await act(async () => app.requests[0].resolve('profile loaded'));
        assert.equal(app.state.success, true);
        assert.equal(app.state.response, 'profile loaded');
        act(() => app.renderer.root.findByType('button').props.onClick({ type: 'click' }));
        assert.equal(app.state.loading, true);
        assert.equal(app.state.retryAttempt, 1);
        await act(async () => app.requests[1].resolve('refreshed'));
        assert.equal(app.state.response, 'refreshed');
        assert.deepEqual(app.args, [['profile'], ['profile']]);
        assert.deepEqual(app.store.getState(), { domain: 'unchanged' });
      } finally {
        app.close();
      }
    });

    test(`${packageName} ${adapter}: failure, manual retry and recovery`, async () => {
      const app = setup();
      try {
        const failure = new Error('offline');
        await act(async () => app.requests[0].reject(failure));
        assert.equal(app.state.error, true);
        assert.equal(app.state.exception, failure);
        app.retry();
        assert.equal(app.state.loading, true);
        assert.equal(app.state.error, false);
        await act(async () => app.requests[1].resolve('recovered'));
        assert.equal(app.state.response, 'recovered');
        assert.equal(app.state.success, true);
        assert.equal(app.state.retryAttempt, 1);
      } finally {
        app.close();
      }
    });

    test(`${packageName} ${adapter}: skipped mount and prop updates`, async () => {
      const app = setup({ skip: true });
      try {
        assert.equal(app.state.loading, false);
        assert.equal(app.requests.length, 0);
        app.props[adapter] = { ...app.props[adapter], args: ['updated'] };
        app.update();
        assert.equal(app.requests.length, 0);
        app.retry();
        await act(async () => app.requests[0].resolve('updated'));
        assert.deepEqual(app.args, [['updated']]);
      } finally {
        app.close();
      }
    });

    test(`${packageName} ${adapter}: batch calls retain argument order`, async () => {
      const app = setup({ batch: true });
      try {
        assert.deepEqual(app.args, [['profile'], ['settings']]);
        await act(async () => {
          app.requests[1].resolve('settings');
          app.requests[0].resolve('profile');
        });
        assert.deepEqual(app.state.response, ['profile', 'settings']);
      } finally {
        app.close();
      }
    });

    test(`${packageName} ${adapter}: unconnected component and loader`, async () => {
      const app = setup({
        connected: false,
        loader: React.createElement('p', null, 'Custom loader'),
      });
      try {
        assert.equal(app.renderer.toJSON().children[0], 'Custom loader');
        await act(async () => app.requests[0].resolve('loaded'));
        assert.equal(app.state.response, 'loaded');
        assert.equal(app.renderer.root.findByType('button').props.children, 'Retry');
      } finally {
        app.close();
      }
    });
  }
}
