import { DEFAULT_TESTIMONIALS_EN } from '../data/testimonials-en.js';
import { DEFAULT_TESTIMONIALS_AR } from '../data/testimonials-ar.js';
import { withIds } from '../data/utils.js';
import { readJSON, writeJSON } from './storage.js';
import { USE_MOCK_API, request, mockDelay } from './client.js';

const STORAGE_KEY = 'abir_testimonials';

/** GET /testimonials/ — falls back to language-appropriate sample content
 * until the client has customized/saved their own. */
export async function getTestimonials(lang) {
  if (!USE_MOCK_API) return request('/testimonials/');
  const saved = readJSON(STORAGE_KEY);
  if (saved) return mockDelay({ list: saved, isCustom: true });
  const defaults = withIds(lang === 'ar' ? DEFAULT_TESTIMONIALS_AR : DEFAULT_TESTIMONIALS_EN);
  return mockDelay({ list: defaults, isCustom: false });
}

/** PUT (bulk) — see note in courses.js about a real backend using per-item
 * POST/PATCH/DELETE instead. */
export async function saveTestimonials(list) {
  if (!USE_MOCK_API) return request('/testimonials/bulk/', { method: 'PUT', body: list });
  writeJSON(STORAGE_KEY, list);
  return mockDelay(list);
}
