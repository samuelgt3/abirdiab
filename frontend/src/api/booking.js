import { USE_MOCK_API, request, mockDelay } from './client.js';

/** POST /bookings/ — sample flow: confirms instantly with a fixed sample
 * Zoom link. A real backend would check real availability and return a
 * real meeting link. */
export async function createBooking(payload) {
  if (!USE_MOCK_API) return request('/bookings/', { method: 'POST', body: payload });
  return mockDelay({ ...payload, zoomLink: 'https://zoom.us/j/8827301944' });
}
