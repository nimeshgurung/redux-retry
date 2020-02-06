import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { bindActionToPromise, bindThunkToPromise, retryRoot } from "./utils";

export type SagaFunction = (args?: any) => IterableIterator<any>;

export interface IRetryState {
  retryAttempt: number;
  error: boolean;
  exception: unknown;
  success: boolean;
  loading: boolean;
  response: unknown;
}

export interface IRetryThunk {
  call: (args: any) => (dispatch: Dispatch<any>, getState: () => void) => any;
  args: any[];
}

interface ISaga {
  call: SagaFunction;
  args?: any[];
}

interface IRetryBaseProps {
  loader?: JSX.Element;
  dispatch: Dispatch<any>;
  children(state: IRetryState, retry: () => void): React.ReactNode;
}

interface IRetryThunkProps extends IRetryBaseProps {
  thunk: IRetryThunk | IRetryThunk[];
  skipCallOnMount: Boolean;
}

interface IRetrySagaProps extends IRetryBaseProps {
  saga: ISaga | ISaga[];
  skipCallOnMount: Boolean;
}

type RetryProps = IRetrySagaProps | IRetryThunkProps;

export class Retry extends React.Component<RetryProps, IRetryState> {
  private initialState = {
    error: false,
    success: false,
    exception: undefined,
    loading: true,
    response: undefined
  };

  constructor(props: RetryProps) {
    super(props);
    this.state = {
      ...this.initialState,
      retryAttempt: 0,
      loading: this.props.skipCallOnMount ? false : this.initialState.loading
    };
  }

  public componentDidMount() {
    if (this.props.skipCallOnMount) {
      return;
    }

    this.makeApiCall();
  }

  public retry = (args?: any[]) => {
    this.setState(
      {
        ...this.initialState,
        retryAttempt: this.state.retryAttempt + 1
      },
      () => this.makeApiCall(args)
    );
  };

  public render() {
    if (this.props.loader && this.state.loading) {
      return this.props.loader;
    }

    return this.props.children(this.state, this.retry);
  }

  private bindSagaToPromise = (call: SagaFunction, args: any[] = []) => {
    return bindActionToPromise(this.props.dispatch)(call, args);
  };

  private callSagaWithPromiseResolver = (args?: any[]) => {
    const props = this.props as IRetrySagaProps;

    if (Array.isArray(props.saga)) {
      return Promise.all(
        props.saga.map((item: ISaga) =>
          this.bindSagaToPromise(
            item.call,
            args && args.length ? args : item.args
          )
        )
      );
    }

    return this.bindSagaToPromise(
      props.saga.call,
      args && args.length ? args : props.saga.args
    );
  };

  private makeApiCall = async (args?: any) => {
    try {
      let response;
      if ((this.props as IRetrySagaProps).saga) {
        response = await this.callSagaWithPromiseResolver(args);
      }

      if ((this.props as IRetryThunkProps).thunk) {
        response = await bindThunkToPromise(this.props.dispatch)(
          (this.props as IRetryThunkProps).thunk
        );
      }

      this.setState({
        ...this.initialState,
        loading: false,
        success: true,
        response
      });
    } catch (ex) {
      this.setState({
        ...this.initialState,
        error: true,
        exception: ex,
        loading: false
      });
    }
  };
}

export default connect(
  null,
  dispatch => ({ dispatch })
)(Retry);
export { retryRoot };
