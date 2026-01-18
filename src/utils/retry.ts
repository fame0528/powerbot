/**
 * Retry Utility
 * 
 * @overview Exponential backoff retry logic for handling transient failures
 * in automation and scraping operations.
 * 
 * @module utils/retry
 */

import { RetryConfig } from '../types/index.js';

/**
 * Execute function with retry logic
 */
export async function retry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = { enabled: true, maxRetries: 3, delayMs: 1000, backoffMultiplier: 2 }
): Promise<T> {
  if (!config.enabled) {
    return await fn();
  }

  const maxRetries = config.maxRetries || 3;
  const delayMs = config.delayMs || 1000;
  const backoffMultiplier = config.backoffMultiplier || 2;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt >= maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt);
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Execute function with retry and custom error handling
 */
export async function retryWithHandler<T>(
  fn: () => Promise<T>,
  errorHandler: (error: Error, attempt: number) => boolean | Promise<boolean>,
  config: RetryConfig = { enabled: true, maxRetries: 3, delayMs: 1000, backoffMultiplier: 2 }
): Promise<T> {
  if (!config.enabled) {
    return await fn();
  }

  const maxRetries = config.maxRetries || 3;
  const delayMs = config.delayMs || 1000;
  const backoffMultiplier = config.backoffMultiplier || 2;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Call error handler to determine if should retry
      const shouldRetry = await errorHandler(err, attempt);
      
      if (!shouldRetry || attempt >= maxRetries) {
        throw err;
      }

      // Calculate delay with exponential backoff
      const delay = delayMs * Math.pow(backoffMultiplier, attempt);
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      
      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutError?: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(timeoutError || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Execute multiple promises with retry
 */
export async function retryBatch<T>(
  tasks: Array<() => Promise<T>>,
  config: RetryConfig = { enabled: true, maxRetries: 3, delayMs: 1000, backoffMultiplier: 2 }
): Promise<Array<T | Error>> {
  return Promise.all(
    tasks.map(task =>
      retry(task, config).catch(error => error instanceof Error ? error : new Error(String(error)))
    )
  );
}

/**
 * Execute promises sequentially with retry
 */
export async function retrySequential<T>(
  tasks: Array<() => Promise<T>>,
  config: RetryConfig = { enabled: true, maxRetries: 3, delayMs: 1000, backoffMultiplier: 2 }
): Promise<T[]> {
  const results: T[] = [];

  for (const task of tasks) {
    const result = await retry(task, config);
    results.push(result);
  }

  return results;
}
