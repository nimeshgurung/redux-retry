import { shallow } from 'enzyme';
import * as React from 'react';
import { Retry } from '../';
import { actionTypes } from '../utils';

describe('Retry - Saga', () => {
  const mockFunction = jest.fn();
  const saga = function* sagaIterator() {
    yield mockFunction();
  };

  it('should make the api call on initial load', () => {
    const dispatchMock = jest.fn();
    shallow(
      <Retry
        saga={{
          call: saga
        }}
        dispatch={dispatchMock}
      >
        {() => <div />}
      </Retry>
    );

    expect(dispatchMock).toHaveBeenCalledWith({
      type: actionTypes.RETRY,
      saga,
      args: [],
      resolve: expect.any(Function),
      reject: expect.any(Function)
    });
  });

  it('should make the api call on initial load with correct arguments for the saga', () => {
    const dispatchMock = jest.fn();
    shallow(
      <Retry
        saga={{
          call: saga,
          args: ['1']
        }}
        dispatch={dispatchMock}
      >
        {() => <div />}
      </Retry>
    );

    expect(dispatchMock).toHaveBeenCalledWith({
      type: actionTypes.RETRY,
      saga,
      args: ['1'],
      resolve: expect.any(Function),
      reject: expect.any(Function)
    });
  });

  it('should handle error state', done => {
    const dispatchMock = jest.fn();
    const wrapper = shallow(
      <Retry
        saga={{
          call: saga
        }}
        dispatch={dispatchMock}
      >
        {() => <div/>}
      </Retry>
    );

    dispatchMock.mock.calls[0][0].reject('yo');

    setTimeout(() => {
      const instance: any = wrapper.instance();
      expect(instance.state.error).toBe(true);
      expect(instance.state.exception).toBe('yo');
      expect(instance.state.loading).toBe(false);
      expect(instance.state.success).toBe(false);
      done();
    }, 0);
  });

  it('it should handle the success state', done => {
    const dispatchMock = jest.fn();
    const wrapper = shallow(
      <Retry
        saga={{
          call: saga
        }}
        dispatch={dispatchMock}
      >
        {() => <div />}
      </Retry>
    );

    dispatchMock.mock.calls[0][0].resolve({ status: 200 });

    setTimeout(() => {
      const instance: any = wrapper.instance();
      expect(instance.state.error).toBe(false);
      expect(instance.state.loading).toBe(false);
      expect(instance.state.success).toBe(true);
      expect(instance.state.response).toEqual({ status: 200 });
      done();
    }, 0);
  });

  it('should bump the retry count number when retrying', done => {
    const dispatchMock = jest.fn();
    const wrapper = shallow(
      <Retry
        saga={{
          call: saga
        }}
        dispatch={dispatchMock}
      >
        {() => <div />}
      </Retry>
    );

    dispatchMock.mock.calls[0][0].reject('yo');

    setTimeout(() => {
      const instance: any = wrapper.instance();
      instance.retry();
      expect(instance.state.retryAttempt).toBe(1);
      expect(instance.state.loading).toBe(true);
      expect(instance.state.success).toBe(false);
      expect(instance.state.error).toBe(false);
      done();
    }, 0);
  });

  it('should wait for all the sagas to resolve if multiple sagas are provide', done => {
    const dispatchMock = jest.fn();
    const wrapper = shallow(
      <Retry
        saga={[
          {
            call: saga,
            args: []
          },
          {
            call: saga,
            args: []
          }
        ]}
        dispatch={dispatchMock}
      >
        {() => <div/>}
      </Retry>
    );

    dispatchMock.mock.calls[0][0].resolve('yo');

    setTimeout(() => {
      const instance: any = wrapper.instance();
      expect(instance.state.loading).toBe(true);
      expect(instance.state.success).toBe(false);
      expect(instance.state.error).toBe(false);

      dispatchMock.mock.calls[1][0].resolve('yo');

      setTimeout(() => {
        expect(instance.state.loading).toBe(false);
        expect(instance.state.success).toBe(true);
        expect(instance.state.error).toBe(false);
        expect(instance.state.response).toEqual(['yo', 'yo']);
        done();
      }, 0);
    }, 0);
  });

  it('should fail if one of sagas throws an error when multiple sagas are passed', done => {
    const dispatchMock = jest.fn();
    const wrapper = shallow(
      <Retry
        saga={[
          {
            call: saga,
            args: []
          },
          {
            call: saga,
            args: []
          }
        ]}
        dispatch={dispatchMock}
      >
        {() => <div />}
      </Retry>
    );

    dispatchMock.mock.calls[0][0].resolve('yo');

    setTimeout(() => {
      const instance: any = wrapper.instance();
      expect(instance.state.loading).toBe(true);
      expect(instance.state.success).toBe(false);
      expect(instance.state.error).toBe(false);

      dispatchMock.mock.calls[1][0].reject('yo');

      setTimeout(() => {
        expect(instance.state.loading).toBe(false);
        expect(instance.state.success).toBe(false);
        expect(instance.state.error).toBe(true);
        expect(instance.state.exception).toBe('yo');
        done();
      }, 0);
    }, 0);
  });

  it('should render the child component and pass the relevant state and the retry handler', done => {
    const dispatchMock = jest.fn();
    const mockChildren = jest.fn(() => <div />);

    const wrapper = shallow(
      <Retry
        saga={{
          call: saga,
          args: []
        }}
        dispatch={dispatchMock}
      >
        {mockChildren}
      </Retry>
    );

    setTimeout(() => {
      const instance: any = wrapper.instance();
      expect(mockChildren).toHaveBeenCalledWith(instance.state, instance.retry);
      done();
    }, 0);
  });

  it('should not render the child component while loading if a default loader is provided', done => {
    const dispatchMock = jest.fn();
    const mockChildren = jest.fn(() => <div />);

    shallow(
      <Retry
        saga={{
          call: saga,
          args: []
        }}
        loader={<div />}
        dispatch={dispatchMock}
      >
        {mockChildren}
      </Retry>
    );

    setTimeout(() => {
      expect(mockChildren).not.toHaveBeenCalled();
      done();
    }, 0);
  });

  it('should render the child component while loading if a default loader is not provided', done => {
    const dispatchMock = jest.fn();
    const mockChildren = jest.fn(() => <div />);

    shallow(
      <Retry
        saga={{
          call: saga,
          args: []
        }}
        dispatch={dispatchMock}
      >
        {mockChildren}
      </Retry>
    );

    setTimeout(() => {
      expect(mockChildren).toHaveBeenCalled();
      done();
    }, 0);
  });
});

describe('Retry - Thunk', () => {
  it('should make the api call on initial load', () => {
    const mockFunction = jest.fn();
    const dispatchMock = jest.fn();
    const call = jest.fn(() => mockFunction);

    shallow(
      <Retry
        thunk={{
          call,
          args: [1, 2]
        }}
        dispatch={dispatchMock}
      >
        {() => <div />}
      </Retry>
    );

   expect(dispatchMock).toHaveBeenCalled();
  });

  it('should handle error state', done => {
    const dispatchMock = jest.fn(() => { throw new Error('yo')});
    const call = () => () => 0

    const wrapper = shallow(
      <Retry
        thunk={{
          call,
          args: [1, 2]
        }}
        dispatch={dispatchMock}
      >
        {() => <div />}
      </Retry>
    );

    setTimeout(() => {
      const instance: any = wrapper.instance();
      expect(instance.state.error).toBe(true);
      expect(instance.state.exception.message).toBe('yo');
      expect(instance.state.loading).toBe(false);
      expect(instance.state.success).toBe(false);
      done();
    }, 0);
  });


  it('should bump the retry count number when retrying', done => {
    const dispatchMock = jest.fn(() => { throw new Error('yo')})
  
    const wrapper = shallow(
      <Retry
        thunk={{
          // tslint:disable-next-line:no-empty
          call: () => () => {},
          args: [1, 2]
        }}
        dispatch={dispatchMock}
      >
        {() => <div />}
      </Retry>
    );

    setTimeout(() => {
      const instance: any = wrapper.instance();
      instance.retry();
      expect(instance.state.retryAttempt).toBe(1);
      expect(instance.state.loading).toBe(true);
      expect(instance.state.success).toBe(false);
      expect(instance.state.error).toBe(false);
      done();
    }, 0);
  });


  it('should render the child component and pass the relevant state and the retry handler', done => {
    const mockChildren = jest.fn(() => <div />);
    const call = jest.fn(() => jest.fn());
    const dispatchMock = jest.fn(() => jest.fn());

    const wrapper = shallow(
      <Retry
        thunk={{
          call,
          args: []
        }}
        dispatch={dispatchMock}
      >
        {mockChildren}
      </Retry>
    );

    setTimeout(() => {
      const instance: any = wrapper.instance();
      expect(mockChildren).toHaveBeenCalledWith(instance.state, instance.retry);
      done();
    }, 0);
  });

  it('should not render the child component while loading if a default loader is provided', done => {
    const mockChildren = jest.fn(() => <div />);
    const call = () => () => {
      return new Promise((resolve, reject) => setTimeout(resolve, 100));
    };
    const dispatchMock = jest.fn(() => jest.fn());

    shallow(
      <Retry
        thunk={{
          call,
          args: []
        }}
        loader={<div />}
        dispatch={dispatchMock}
      >
        {mockChildren}
      </Retry>
    );

    setTimeout(() => {
      expect(mockChildren).not.toHaveBeenCalled();
      done();
    }, 0);
  });
});
