import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import TestCardForm from './TestCardForm.jsx';

describe('test payment box', () => {
  it('is clearly marked as a test and cannot take real card details', () => {
    const html = renderToString(<TestCardForm card={{ p: 'x', sig: 'y' }} lang="en" onPaid={() => {}} />);
    expect(html).toContain('Test payment');
    expect(html).toContain('Pay (test)');
    expect(html).not.toContain('<input'); // demo values are plain text: nothing real can be typed
  });
  it('is available in Arabic', () => {
    expect(renderToString(<TestCardForm card={{}} lang="ar" onPaid={() => {}} />)).toContain('دفع تجريبي');
  });
});
