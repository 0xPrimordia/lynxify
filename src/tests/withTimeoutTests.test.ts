/**
 * @jest-environment jsdom
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { withTimeout } from '../app/lib/utils/timeout';

describe('withTimeout Function Tests', () => {
  it('should resolve if the promise resolves before timeout', async () => {
    const mockResult = { success: true };
    const mockPromise = Promise.resolve(mockResult);
    
    const result = await withTimeout(mockPromise, 1000);
    expect(result).toEqual(mockResult);
  });
  
  it('should reject with timeout error if promise takes too long', async () => {
    // Create a promise that never resolves
    const neverResolving = new Promise(() => {});
    
    // Set a shorter timeout for the test
    await expect(withTimeout(neverResolving, 10)).rejects.toThrow('Operation timed out');
  });
  
  it('should reject if the original promise rejects', async () => {
    const mockError = new Error('Original promise error');
    const mockPromise = Promise.reject(mockError);
    
    await expect(withTimeout(mockPromise, 1000)).rejects.toThrow('Original promise error');
  });
}); 