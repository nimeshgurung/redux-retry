import { handleRetry, handleThunkRetry } from '../utils';

describe('#Utils - handleRetry', () => {
  it('should call resolve if the saga resolves', () => {
    const mockAction = {
      saga: jest.fn(() => true),
      args: [1, 2, 3],
      resolve: jest.fn(),
      reject: jest.fn()
    };

    const gen = handleRetry(mockAction);

    const payload = gen.next().value.payload;

    expect(payload.args).toBe(mockAction.args);
    expect(payload.fn).toBe(mockAction.saga)
  });

  it('should resolve if saga was executed successfully', () => {
    const mockAction = {
      saga: jest.fn(() => true),
      args: [1, 2, 3],
      resolve: jest.fn(),
      reject: jest.fn()
    };

    const gen = handleRetry(mockAction);

    gen.next();
    gen.next();

    expect(mockAction.resolve).toHaveBeenCalled();
  });

  it('should reject if saga threw an error', () => {
    const mockAction = {
      saga: jest.fn(() => {
        throw new Error('yo');
      }),
      args: [1, 2, 3],
      resolve: jest.fn(),
      reject: jest.fn()
    };

    const gen = handleRetry(mockAction);

    gen.next();
    gen.throw();

    expect(mockAction.reject).toHaveBeenCalled();
  });
});

describe('Utils - HandleThunkRetry', () => {
  it('should call the thunk', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn(() => ({state: 'state'}));
    const resolveMock = jest.fn();
    const call = (id) => {
      return (dispatch, getState) => {
        const resp = getState().state + id;
        dispatch(resp);
        return Promise.resolve(resp);
      }
    }

    await handleThunkRetry({
      thunk: {
        call,
        args: ['_mock_id']
      },
      resolve: resolveMock,
      reject: jest.fn()
    })(dispatchMock, getStateMock);

    expect(dispatchMock).toHaveBeenCalledWith('state_mock_id')
    expect(resolveMock).toHaveBeenCalledWith('state_mock_id');
  });

  it('should handle multiple thunks', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn(() => ({state: 'state'}));
    const resolveMock = jest.fn();
    const call = (arg1, arg2) => {
      return (dispatch, getState) => {
        const resp = getState().state + arg1 + arg2;
        dispatch(resp);
        return Promise.resolve(resp);
      }
    };

    const thunk = [
      {
        call,
        args: [1, 2]
      },
      {
        call,
        args: [3, 4]
      }
    ];

    await handleThunkRetry({
      thunk,
      resolve: resolveMock,
      reject: jest.fn()
    })(dispatchMock, getStateMock);

    expect(dispatchMock).toHaveBeenCalledWith('state12');
    expect(dispatchMock).toHaveBeenCalledWith('state34');
    expect(resolveMock).toHaveBeenCalledWith(['state12', 'state34'])
  });

  it('should wait for the thunk to resolve', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn(() => ({state: 'state'}));
    const resolveMock = jest.fn();
    
    const call1 = (arg: string) => (dispatch: any) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          dispatch(arg);
          resolve(arg);
        }, 100);
      });
    };

    await handleThunkRetry({
      thunk : {
        call: call1,
        args: ['yo']
      },
      resolve: resolveMock,
      reject: jest.fn()
    })(dispatchMock, getStateMock);

    expect(dispatchMock).toHaveBeenCalledWith('yo');
    expect(resolveMock).toHaveBeenCalledWith('yo');
  });

  it('should wait for multiple promises to resolve', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn(() => ({state: 'state'}));
    const resolveMock = jest.fn();
    const call1 = (arg: string) => (dispatch: any) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          dispatch(arg);
          resolve();
        }, 100);
      });
    };

    const call2 = (arg: string) => (dispatch: any) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          dispatch(arg);
          resolve();
        }, 200);
      });
    };

    await handleThunkRetry({
      thunk: [
        {
          call: call1,
          args: ['pop']
        },
        {
          call: call2,
          args: ['rock']
        }
      ],
      resolve: resolveMock,
      reject: jest.fn()
    })(dispatchMock, getStateMock);

    
    expect(dispatchMock).toHaveBeenCalledWith('pop');
    expect(dispatchMock).toHaveBeenCalledWith('rock');
  });

  it('should throw an error if the thunk throws an error', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn(() => ({state: 'state'}));
    const resolveMock = jest.fn();
    
    const call1 = (arg: string) => (dispatch: any) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          dispatch(arg);
          reject('error');
        }, 100);
      });
    };

    try {
      await handleThunkRetry({
        thunk : {
          call: call1,
          args: ['yo']
        },
        resolve: resolveMock,
        reject: (error) => { throw error }
      })(dispatchMock, getStateMock);

      fail('Expected to throw an error');
    } catch(ex) {
      expect(ex).toBe('error');
    }
  });

  it('should wait for multiple promises to resolve', async () => {
    const dispatchMock = jest.fn();
    const getStateMock = jest.fn(() => ({state: 'state'}));
    const resolveMock = jest.fn();
    const call1 = (arg: string) => (dispatch: any) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          dispatch(arg);
          resolve();
        }, 100);
      });
    };

    const call2 = (arg: string) => (dispatch: any) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          dispatch(arg);
          reject('error');
        }, 200);
      });
    };

    try {

      await handleThunkRetry({
        thunk: [
          {
            call: call1,
            args: ['pop']
          },
          {
            call: call2,
            args: ['rock']
          }
        ],
        resolve: resolveMock,
        reject: (error) => { throw error }
      })(dispatchMock, getStateMock);

      fail('Expected to throw an error');
    } catch(ex) {
      expect(ex).toBe('error');
    }
  });
});
