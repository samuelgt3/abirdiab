import { readJSON, writeJSON, removeKey } from './storage.js';
import { USE_MOCK_API, request, mockDelay } from './client.js';

const USER_KEY = 'abir_user';

/** POST /auth/login/ — the sample build never verifies the password, it
 * just derives a display name; a real backend performs real auth here. */
export async function login({ email, password }) {
  if (!USE_MOCK_API) return request('/auth/login/', { method: 'POST', body: { email, password } });
  const user = { name: email.split('@')[0], email };
  writeJSON(USER_KEY, user);
  return mockDelay(user);
}

/** POST /auth/signup/ */
export async function signup({ name, email, password }) {
  if (!USE_MOCK_API) return request('/auth/signup/', { method: 'POST', body: { name, email, password } });
  const user = { name, email };
  writeJSON(USER_KEY, user);
  return mockDelay(user);
}

/** POST /auth/logout/ */
export async function logout() {
  if (!USE_MOCK_API) return request('/auth/logout/', { method: 'POST' });
  removeKey(USER_KEY);
  return mockDelay(null);
}

/** GET /auth/session/ — who (if anyone) is currently signed in. */
export async function getCurrentUser() {
  if (!USE_MOCK_API) return request('/auth/session/').catch(() => null);
  return mockDelay(readJSON(USER_KEY));
}
