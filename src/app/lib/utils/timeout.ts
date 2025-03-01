/**
 * Creates a promise that rejects after the specified timeout
 * @param ms Timeout in milliseconds
 * @param errorMessage Custom error message
 */
export const createTimeout = (ms: number, errorMessage: string = 'Operation timed out'): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), ms);
  });
};

/**
 * Executes a promise with a timeout
 * @param promise The promise to execute
 * @param ms Timeout in milliseconds
 * @param errorMessage Custom error message
 */
export const withTimeout = <T>(
  promise: Promise<T>, 
  ms: number, 
  errorMessage: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    createTimeout(ms, errorMessage)
  ]);
}; 