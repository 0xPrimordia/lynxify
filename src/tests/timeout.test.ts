import { describe, it, expect, jest } from '@jest/globals';
import { withTimeout, createTimeout } from '../app/lib/utils/timeout';

describe('Timeout Utilities', () => {
  it('should resolve when promise completes before timeout', async () => {
    const result = await withTimeout(
      Promise.resolve('success'),
      1000
    );
    expect(result).toBe('success');
  });

  it('should reject when timeout occurs before promise resolves', async () => {
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('too late'), 200));
    await expect(withTimeout(slowPromise, 100)).rejects.toThrow('Operation timed out');
  });

  it('should use custom error message when provided', async () => {
    const slowPromise = new Promise(resolve => setTimeout(() => resolve('too late'), 200));
    await expect(withTimeout(slowPromise, 100, 'Custom timeout message')).rejects.toThrow('Custom timeout message');
  });
}); 