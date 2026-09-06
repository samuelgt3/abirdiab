import { USE_MOCK_API, request, mockDelay } from './client.js';
import { addPurchases } from './purchases.js';

/** POST /checkout/ — sample flow: no real payment provider is called; the
 * card fields are never validated or transmitted anywhere. A real backend
 * would create a payment intent (Stripe et al.) and only grant access
 * after that provider confirms the charge. */
export async function completeCheckout({ email, courseIds }) {
  if (!USE_MOCK_API) return request('/checkout/', { method: 'POST', body: { courseIds } });
  const purchases = await addPurchases(email, courseIds);
  return mockDelay({ purchases });
}
