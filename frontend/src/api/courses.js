import { DEFAULT_COURSES } from '../data/default-courses.js';
import { withIds } from '../data/utils.js';
import { readJSON, writeJSON } from './storage.js';
import { USE_MOCK_API, request, mockDelay } from './client.js';

const STORAGE_KEY = 'abir_courses';

function isValidCourseList(list) {
  return Array.isArray(list) && list.length > 0 && list.every((c) => c && c.title && c.type);
}

/** GET /courses/ */
export async function getCourses() {
  if (!USE_MOCK_API) return request('/courses/');
  const saved = readJSON(STORAGE_KEY);
  const list = isValidCourseList(saved) ? saved : withIds(DEFAULT_COURSES);
  return mockDelay(list);
}

/** PUT (bulk) — mock persistence only; a real backend would issue individual
 * POST/PATCH/DELETE calls per course instead of replacing the whole list. */
export async function saveCourses(list) {
  if (!USE_MOCK_API) return request('/courses/bulk/', { method: 'PUT', body: list });
  writeJSON(STORAGE_KEY, list);
  return mockDelay(list);
}
