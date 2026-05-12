import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  describe('component structure', () => {
    it('is a class component (required for error boundaries)', () => {
      // Error boundaries must be class components - verify this is one
      expect(ErrorBoundary.prototype).toBeDefined();
      expect(ErrorBoundary.prototype.render).toBeDefined();
      expect(ErrorBoundary.prototype.componentDidCatch).toBeDefined();
    });

    it('has getDerivedStateFromError static method', () => {
      expect(ErrorBoundary.getDerivedStateFromError).toBeDefined();
      expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
    });

    it('getDerivedStateFromError returns correct error state', () => {
      const testError = new Error('Test error');
      const result = ErrorBoundary.getDerivedStateFromError(testError);

      expect(result).toEqual({
        hasError: true,
        error: testError,
      });
    });

    it('getDerivedStateFromError preserves the error reference', () => {
      const testError = new Error('Specific error message');
      const result = ErrorBoundary.getDerivedStateFromError(testError);

      expect(result.error).toBe(testError);
      expect(result.error?.message).toBe('Specific error message');
    });

    it('initial state has no error', () => {
      const instance = new ErrorBoundary({ children: null });
      expect(instance.state).toEqual({
        hasError: false,
        error: null,
      });
    });

    it('handleReset resets error state', () => {
      const instance = new ErrorBoundary({ children: null });
      // Simulate error state
      instance.state = { hasError: true, error: new Error('test') };

      // Mock setState to capture the new state
      let newState: unknown = null;
      instance.setState = ((state: unknown) => {
        newState = state;
      }) as typeof instance.setState;

      instance.handleReset();

      expect(newState).toEqual({ hasError: false, error: null });
    });
  });
});
