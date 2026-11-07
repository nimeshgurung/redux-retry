export const initialState = {};
export const reducer = (state = initialState) => state;

// Direct CORS request; no proxy or credentials are required.
export async function getPost(id) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/posts/${id}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  const post = await response.json();
  // Keep the response.text contract used by both original CodeSandbox examples.
  return { text: post.body };
}
