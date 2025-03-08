
/**
 * API client for interacting with the Phish.net API
 */

// Updated API key for Phish.net v5 API
// For a public app like this, it's okay to hardcode the API key
// For more sensitive apps, consider server-side proxy or user-provided keys
const API_KEY = "ADB07055FF645FD21980";

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
