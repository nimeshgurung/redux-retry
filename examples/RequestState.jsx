export function RequestState({ state, retry, failNextRequest }) {
  if (state.loading)
    return (
      <div className="loading" role="status" aria-label="Loading">
        <img
          className="spinner"
          src="https://raw.githubusercontent.com/nimeshgurung/redux-retry/a6cabd9ca4384b5e9324a7773f0060919a0f8444/docs/retry-sticker.png"
          alt=""
          width="84"
          height="84"
        />
        <p>Loading…</p>
      </div>
    );
  if (!state.success && !state.error) return null;
  return (
    <article className="card" aria-label={state.error ? 'Request failed' : 'Request successful'}>
      <p className="label">{state.error ? 'Error' : 'Success'}</p>
      <h1>{state.error ? 'The internet tripped.' : 'Well, that worked.'}</h1>
      <p className="response" data-testid={state.success ? 'response' : undefined}>
        {state.error ? 'Something went wrong. Please try again.' : state.response.text}
      </p>
      <div className="actions">
        <button type="button" onClick={retry}>
          Retry
        </button>
        {state.success && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              failNextRequest();
              retry();
            }}
          >
            Try an error
          </button>
        )}
      </div>
      <p className="attempts">
        Retries: <span data-testid="attempt">{state.retryAttempt}</span>
      </p>
    </article>
  );
}
