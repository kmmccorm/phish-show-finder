
/**
 * API client for interacting with the Phish.net API
 */

import {
  NetworkError,
  ServerError,
  RateLimitError,
  InvalidApiKeyError,
  TimeoutError,
} from './api-errors';

// Load API key from environment variables
// Note: In a client-side app, this key is still visible in the browser
// For production apps, consider using a backend proxy to keep the key secure
const API_KEY = import.meta.env.VITE_PHISH_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_PHISH_API_KEY environment variable is not set. Please check your .env.local file.");
}

const REQUEST_TIMEOUT_MS = 15000;

/**
 * Fetch data from the Phish.net API
 * @param endpoint API endpoint
 * @param params Additional URL parameters
 * @returns Promise with response data
 */
export async function fetchFromApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  // Construct query string from params
  const queryParams = new URLSearchParams({
    apikey: API_KEY,
    ...params
  }).toString();

  const url = `https://api.phish.net/v5/${endpoint}.json?${queryParams}`;

  console.log(`Fetching from API: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new NetworkError(error instanceof Error ? error : undefined);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new InvalidApiKeyError();
    }
    if (response.status === 429) {
      throw new RateLimitError();
    }
    if (response.status >= 500) {
      throw new ServerError(response.status);
    }
    throw new ServerError(response.status);
  }

  return await response.json();
}
