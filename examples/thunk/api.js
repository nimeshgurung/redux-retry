export const initialState = {};
export const reducer = (state = initialState) => state;

let failNext = false;
export function failNextRequest() {
  failNext = true;
}

// A short delay makes the loading state visible in the demo.
export async function getPost(id) {
  const simulateFailure = failNext;
  failNext = false;
  await new Promise((resolve) => setTimeout(resolve, 700));
  if (simulateFailure) throw new Error('Simulated request failure');
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const post = await response.json();
  // Keep the response.text contract used by both original CodeSandbox examples.
  return { text: post.body };
}
