import type { ReactNode } from 'react';
import type { Dispatch } from 'redux';

export type RetryFunction = (...args: never[]) => unknown;
export type SagaFunction<Args extends unknown[] = never[], Response = unknown> = (
  ...args: Args
) => Generator<unknown, Response, unknown>;

interface CallDefinition {
  call: RetryFunction;
  args?: readonly unknown[];
}

export type RetryCall<F extends RetryFunction | undefined = undefined> = F extends RetryFunction
  ? { call: F; args?: Parameters<F> }
  : CallDefinition;

export type RetryCalls = CallDefinition | readonly CallDefinition[];
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type CallArguments<F extends RetryFunction> =
  Equal<F, RetryFunction> extends true ? readonly unknown[] : Parameters<F>;
type ValidCall<C extends CallDefinition> = C & { args?: CallArguments<C['call']> };
type ValidateCalls<C extends RetryCalls> = C extends readonly CallDefinition[]
  ? { [K in keyof C]: C[K] extends CallDefinition ? ValidCall<C[K]> : never }
  : C extends CallDefinition
    ? ValidCall<C>
    : never;

type UnwrapResult<R> = R extends { unwrap(): infer U } ? Awaited<U> : Awaited<R>;
type CallResult<C extends CallDefinition> =
  ReturnType<C['call']> extends Iterator<unknown, infer R, unknown>
    ? Awaited<R>
    : ReturnType<C['call']> extends (...args: never[]) => infer R
      ? UnwrapResult<R>
      : Awaited<ReturnType<C['call']>>;

export type RetryResponse<C extends RetryCalls> = C extends readonly CallDefinition[]
  ? { -readonly [K in keyof C]: C[K] extends CallDefinition ? CallResult<C[K]> : never }
  : C extends CallDefinition
    ? CallResult<C>
    : never;

type RetryArguments<C extends RetryCalls> = C extends readonly CallDefinition[]
  ? CallArguments<C[number]['call']>
  : C extends CallDefinition
    ? CallArguments<C['call']>
    : never;

export interface RetryHandler<C extends RetryCalls = RetryCalls> {
  (): void;
  (args: RetryArguments<C>): void;
}

export interface IRetryState<Response = unknown> {
  retryAttempt: number;
  error: boolean;
  exception: unknown;
  success: boolean;
  loading: boolean;
  response: Response | undefined;
}

export type IRetryThunk<F extends RetryFunction | undefined = undefined> = RetryCall<F>;

export type RetryOptions<C extends RetryCalls = RetryCalls> = {
  skipCallOnMount?: boolean;
} & ({ saga: C & ValidateCalls<C>; thunk?: never } | { thunk: C & ValidateCalls<C>; saga?: never });

export type RetryProps<C extends RetryCalls = RetryCalls> = RetryOptions<C> & {
  loader?: ReactNode;
  children(state: IRetryState<RetryResponse<C>>, retry: RetryHandler<C>): ReactNode;
};

export type RetryDispatch = Dispatch;

export interface RetryOperation {
  promise: Promise<unknown>;
  cancel(): void;
}
