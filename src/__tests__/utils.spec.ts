import { handleRetry } from '../utils';

describe('#Utils', () => {
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

  // TODO: Uncomment when support for thunk is added
  // it('should call the thunk with dispatch and getState', () => {
  //   const mockFunction = jest.fn();
  //   const call = () => mockFunction;

  //   handleThunk({
  //     call,
  //     args: [1, 2]
  //   });

  //   expect(mockFunction).toHaveBeenCalledWith(
  //     singleton.dispatch,
  //     singleton.getState
  //   );
  // });

  // TODO: Fix thunks later
  // it('should call the thunk with the correct parameters', () => {
  //   const call = jest.fn(() => jest.fn());
  //   handleThunk({
  //     call,
  //     args: [1, 2]
  //   });

  //   expect(call).toHaveBeenCalledWith(1, 2);
  // });

  // it('should handle multiple thunks', async () => {
  //   const call1 = jest.fn(() => jest.fn());
  //   const call2 = jest.fn(() => jest.fn());

  //   const call = [
  //     {
  //       call: call1,
  //       args: [1, 2]
  //     },
  //     {
  //       call: call2,
  //       args: [3, 4]
  //     }
  //   ];

  //   await handleThunk(call);

  //   expect(call1).toHaveBeenCalledWith(1, 2);
  //   expect(call2).toHaveBeenCalledWith(3, 4);
  // });

  // it('should call the thunks return function with the distpatch and get state function', async () => {
  //   const mockThunk1 = jest.fn();
  //   const mockThunk2 = jest.fn();
  //   const call1 = () => mockThunk1;
  //   const call2 = () => mockThunk2;

  //   const call = [
  //     {
  //       call: call1,
  //       args: [1, 2]
  //     },
  //     {
  //       call: call2,
  //       args: [3, 4]
  //     }
  //   ];

  //   await handleThunk(call);

  //   expect(mockThunk1).toHaveBeenCalledWith(
  //     singleton.dispatch,
  //     singleton.getState
  //   );
  //   expect(mockThunk2).toHaveBeenCalledWith(
  //     singleton.dispatch,
  //     singleton.getState
  //   );
  // });

  // it('should wait for the thunk to resolve', async () => {
  //   const call1 = (arg: string) => (dispatch: any) => {
  //     return new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         dispatch(arg);
  //         resolve();
  //       }, 100);
  //     });
  //   };

  //   await handleThunk({
  //     call: call1,
  //     args: ['yo']
  //   });

  //   expect(singleton.dispatch).toHaveBeenCalledWith('yo');
  // });

  // it('should wait for multiple promises to resolve', async () => {
  //   const call1 = (arg: string) => (dispatch: any) => {
  //     return new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         dispatch(arg);
  //         resolve();
  //       }, 100);
  //     });
  //   };

  //   const call2 = (arg: string) => (dispatch: any) => {
  //     return new Promise((resolve, reject) => {
  //       setTimeout(() => {
  //         dispatch(arg);
  //         resolve();
  //       }, 200);
  //     });
  //   };

  //   await handleThunk([
  //     {
  //       call: call1,
  //       args: ['pop']
  //     },
  //     {
  //       call: call2,
  //       args: ['rock']
  //     }
  //   ]);

  //   expect(singleton.dispatch).toHaveBeenCalledWith('pop');
  //   expect(singleton.dispatch).toHaveBeenCalledWith('rock');
  // });

  // it('should throw an error if the thunk throws an error', async () => {
  //   try {
  //     const call = (arg: string) => (dispatch: any) => {
  //       return new Promise((resolve, reject) => {
  //         setTimeout(() => {
  //           dispatch(arg);
  //           reject('yo');
  //         }, 100);
  //       });
  //     };

  //     await handleThunk({
  //       call,
  //       args: [1, 2]
  //     });
  //   } catch (ex) {
  //     expect(ex).toBe('yo');
  //   }
  // });

  // it('should throw an error if any one of the promises throws an error', async () => {
  //   try {
  //     const call1 = (arg: string) => (dispatch: any) => {
  //       return new Promise((resolve, reject) => {
  //         setTimeout(() => {
  //           dispatch(arg);
  //           resolve();
  //         }, 100);
  //       });
  //     };

  //     const call2 = (arg: string) => (dispatch: any) => {
  //       return new Promise((resolve, reject) => {
  //         setTimeout(() => {
  //           dispatch(arg);
  //           reject('call2');
  //         }, 200);
  //       });
  //     };

  //     await handleThunk([
  //       {
  //         call: call1,
  //         args: ['pop']
  //       },
  //       {
  //         call: call2,
  //         args: ['rock']
  //       }
  //     ]);
  //   } catch (ex) {
  //     expect(ex).toBe('call2');
  //   }
  // });
});
