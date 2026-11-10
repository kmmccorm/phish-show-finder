/**
 * API client for interacting with the Phish.net API
 */

import {
  ApiError,
  NetworkError,
  ServerError,
  RateLimitError,
  InvalidApiKeyError,
  TimeoutError,
} from './api-errors';
import type { ApiEnvelope } from '../types/show';

// Note: this is a client-side app, so the key is embedded in the built bundle
// and visible to anyone who opens the site. Keeping it secret would require a
// backend proxy.
const API_KEY: string | undefined = import.meta.env.VITE_PHISH_API_KEY;

const API_BASE_URL = 'https://api.phish.net/v5';
const REQUEST_TIMEOUT_MS = 15000;

/**
 * Fetch data from the Phish.net API
 * @param endpoint API endpoint, e.g. `setlists/showdate/1997-12-31`
 * @param params Additional URL parameters
 * @returns The `data` payload of the response
 * @throws ApiError describing what went wrong
 */
export async function fetchFromApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  if (!API_KEY) {
    // Checked per request rather than at import time, so a missing key shows
    // the error screen instead of a blank page.
    throw new InvalidApiKeyError('VITE_PHISH_API_KEY is not set');
  }

  const queryParams = new URLSearchParams({ ...params, apikey: API_KEY }).toString();
  const url = `${API_BASE_URL}/${endpoint}.json?${queryParams}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (error) {
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
    throw new ServerError(response.status);
  }

  let body: ApiEnvelope<T>;
  try {
    body = await response.json();
  } catch {
    throw new ServerError(response.status, 'Response was not valid JSON');
  }

  // Phish.net reports most failures with HTTP 200 and an `error` flag.
  if (body.error && body.error !== '0') {
    const message = body.error_message || `API error ${body.error}`;
    if (/api\s*key/i.test(message)) {
      throw new InvalidApiKeyError(message);
    }
    throw new ApiError('UNKNOWN', message, 'Phish.net returned an error. Please try again later.');
  }

  return body.data as T;
}
