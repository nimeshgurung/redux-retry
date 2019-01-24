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

// TODO: Add support for thunk later
// describe('Retry - Thunk', () => {
//   const mockedSingleton = singleton as jest.Mocked<any>;

//   beforeEach(() => {
//     mockedSingleton.dispatch.mockReset();
//   });

//   it('should make the api call on initial load', () => {
//     const mockFunction = jest.fn();
//     const call = jest.fn(() => mockFunction);

//     shallow(
//       <Retry
//         thunk={{
//           call,
//           args: [1, 2]
//         }}
//       >
//         {() => <div />}
//       </Retry>
//     );

//     expect(call).toHaveBeenCalledWith(1, 2);
//   });

//   it('should handle error state', done => {
//     const call = () => () => {
//       throw new Error('yo');
//     };

//     const wrapper = shallow(
//       <Retry
//         thunk={{
//           call,
//           args: [1, 2]
//         }}
//       >
//         {() => <div />}
//       </Retry>
//     );

//     setTimeout(() => {
//       const instance: any = wrapper.instance();
//       expect(instance.state.error).not.toBe(undefined);
//       expect(instance.state.error.exception).toBe('yo');
//       expect(instance.state.loading).toBe(false);
//       expect(instance.state.success).toBe(false);
//       done();
//     }, 0);
//   });

//   it('it should handle the success state', done => {
//     const call = () => () => {
//       return new Promise(resolve =>
//         setTimeout(() => resolve({ status: 200 }), 100)
//       );
//     };

//     const wrapper = shallow(
//       <Retry
//         thunk={{
//           call,
//           args: [1, 2]
//         }}
//       >
//         {() => <div />}
//       </Retry>
//     );

//     setTimeout(() => {
//       const instance: any = wrapper.instance();
//       expect(instance.state.error).toBe(undefined);
//       expect(instance.state.loading).toBe(false);
//       expect(instance.state.success).toBe(true);
//       expect(instance.state.response).toEqual({ status: 200 });
//       done();
//     }, 150);
//   });

//   it('should bump the retry count number when retrying', done => {
//     const call = () => () => {
//       return new Promise((resolve, reject) => setTimeout(reject, 100));
//     };

//     const wrapper = shallow(
//       <Retry
//         thunk={{
//           call,
//           args: [1, 2]
//         }}
//       >
//         {() => <div />}
//       </Retry>
//     );

//     setTimeout(() => {
//       const instance: any = wrapper.instance();
//       instance.retry();
//       expect(instance.state.retryAttempt).toBe(1);
//       expect(instance.state.loading).toBe(true);
//       expect(instance.state.success).toBe(false);
//       expect(instance.state.error).toBe(undefined);
//       done();
//     }, 0);
//   });

//   it('should wait for all the thunks to resolve if multiple thunks are provided', done => {
//     const call1 = () => () => {
//       return new Promise((resolve, reject) =>
//         setTimeout(() => resolve('ho'), 100)
//       );
//     };

//     const call2 = () => () => {
//       return new Promise((resolve, reject) =>
//         setTimeout(() => resolve('ko'), 100)
//       );
//     };

//     const wrapper = shallow(
//       <Retry
//         thunk={[
//           {
//             call: call1,
//             args: []
//           },
//           {
//             call: call2,
//             args: []
//           }
//         ]}
//       >
//         {() => <div />}
//       </Retry>
//     );

//     const instance: any = wrapper.instance();

//     expect(instance.state.loading).toBe(true);

//     setTimeout(() => {
//       expect(instance.state.loading).toBe(false);
//       expect(instance.state.success).toBe(true);
//       expect(instance.state.error).toBe(undefined);
//       expect(instance.state.response).toEqual(['ho', 'ko']);
//       done();
//     }, 200);
//   });

//   it('should fail if one of thunk throws an error when multiple thunks are passed', done => {
//     const call1 = () => () => {
//       return new Promise((resolve, reject) => setTimeout(resolve, 100));
//     };

//     const call2 = () => () => {
//       return new Promise((resolve, reject) =>
//         setTimeout(() => reject('yo'), 100)
//       );
//     };

//     const wrapper = shallow(
//       <Retry
//         thunk={[
//           {
//             call: call1,
//             args: []
//           },
//           {
//             call: call2,
//             args: []
//           }
//         ]}
//       >
//         {() => <div />}
//       </Retry>
//     );

//     setTimeout(() => {
//       const instance: any = wrapper.instance();
//       expect(instance.state.loading).toBe(false);
//       expect(instance.state.success).toBe(false);
//       expect(instance.state.error.exception).toBe('yo');
//       done();
//     }, 150);
//   });

//   it('should render the child component and pass the relevant state and the retry handler', done => {
//     const mockChildren = jest.fn(() => <div />);
//     const call = jest.fn(() => jest.fn());

//     const wrapper = shallow(
//       <Retry
//         thunk={{
//           call,
//           args: []
//         }}
//       >
//         {mockChildren}
//       </Retry>
//     );

//     setTimeout(() => {
//       const instance: any = wrapper.instance();
//       expect(mockChildren).toHaveBeenCalledWith(instance.state, instance.retry);
//       done();
//     }, 0);
//   });

//   it('should not render the child component while loading if a default loader is provided', done => {
//     const mockChildren = jest.fn(() => <div />);
//     const call = () => () => {
//       return new Promise((resolve, reject) => setTimeout(resolve, 100));
//     };

//     shallow(
//       <Retry
//         thunk={{
//           call,
//           args: []
//         }}
//         loader={<div />}
//       >
//         {mockChildren}
//       </Retry>
//     );

//     setTimeout(() => {
//       expect(mockChildren).not.toHaveBeenCalled();
//       done();
//     }, 0);
//   });

//   it('should render the child component while loading if a default loader is not provided', done => {
//     const mockChildren = jest.fn(() => <div />);
//     const call = () => () => {
//       return new Promise((resolve, reject) => setTimeout(resolve, 100));
//     };

//     shallow(
//       <Retry
//         thunk={{
//           call,
//           args: []
//         }}
//       >
//         {mockChildren}
//       </Retry>
//     );

//     setTimeout(() => {
//       expect(mockChildren).toHaveBeenCalled();
//       done();
//     }, 0);
//   });

//   it('should call the thunk if the thunk is provided', () => {
//     const mockChildren = jest.fn(() => <div />);

//     shallow(
//       <Retry
//         thunk={{
//           call: () => () => {},
//           args: ['123']
//         }}
//       >
//         {mockChildren}
//       </Retry>
//     );

//     expect(mockChildren).toHaveBeenCalled();
//   });
// });
