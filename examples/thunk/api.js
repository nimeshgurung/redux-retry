export const initialState = {};
export const reducer = (state = initialState) => state;

let failNext = false;
export function failNextRequest() {
  failNext = true;
}

// A short delay makes the loading state visible in the demo.
export async function getProfile(id) {
  const simulateFailure = failNext;
  failNext = false;
  await new Promise((resolve) => setTimeout(resolve, 700));
  if (simulateFailure) throw new Error('Simulated request failure');
  const response = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const profile = await response.json();
  // Keep the response.text contract used by both original CodeSandbox examples.
  return { text: profile.name, email: profile.email };
}
