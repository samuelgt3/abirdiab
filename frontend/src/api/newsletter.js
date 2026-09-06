import { readJSON, writeJSON } from './storage.js';
import { USE_MOCK_API, request, mockDelay } from './client.js';

const STORAGE_KEY = 'abir_subscribers';

/** POST /newsletter/subscribe/ */
export async function subscribe(email) {
  if (!USE_MOCK_API) return request('/newsletter/subscribe/', { method: 'POST', body: { email } });
  const list = readJSON(STORAGE_KEY, []);
  list.push({ email, at: Date.now() });
  writeJSON(STORAGE_KEY, list);
  return mockDelay({ email });
}
