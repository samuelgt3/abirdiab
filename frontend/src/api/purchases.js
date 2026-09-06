import { readJSON, writeJSON } from './storage.js';
import { USE_MOCK_API, request, mockDelay } from './client.js';

const STORAGE_KEY = 'abir_purchases';

/** GET /account/purchases/ — course ids the given user has bought. */
export async function getPurchases(email) {
  if (!USE_MOCK_API) return request('/account/purchases/');
  if (!email) return mockDelay([]);
  const all = readJSON(STORAGE_KEY, {});
  return mockDelay(all[email] || []);
}

/** Called after a successful mock checkout; a real backend would instead
 * record purchases server-side as part of the /checkout/ response. */
export async function addPurchases(email, courseIds) {
  if (!USE_MOCK_API) return request('/account/purchases/', { method: 'POST', body: { courseIds } });
  if (!email) return mockDelay([]);
  const all = readJSON(STORAGE_KEY, {});
  const merged = Array.from(new Set((all[email] || []).concat(courseIds)));
  all[email] = merged;
  writeJSON(STORAGE_KEY, all);
  return mockDelay(merged);
}
