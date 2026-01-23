
/**
 * API client for interacting with the Phish.net API
 */

// Load API key from environment variables
// Note: In a client-side app, this key is still visible in the browser
// For production apps, consider using a backend proxy to keep the key secure
const API_KEY = import.meta.env.VITE_PHISH_API_KEY;

if (!API_KEY) {
  throw new Error("VITE_PHISH_API_KEY environment variable is not set. Please check your .env.local file.");
}

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
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }
  
  return await response.json();
}
