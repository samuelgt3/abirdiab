import { describe, it, expect } from 'vitest';
import ErrorBoundary from './ErrorBoundary.jsx';

describe('error boundary', () => {
  it('switches to the friendly page when something below it crashes', () => {
    expect(ErrorBoundary.getDerivedStateFromError(new Error('boom'))).toEqual({ failed: true });
  });
});
