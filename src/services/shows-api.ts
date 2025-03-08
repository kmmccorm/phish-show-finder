
/**
 * API service for fetching and processing show data
 */

import { fetchFromApi } from "./api-client";
import { ShowData } from "../types/show";
import { transformShowData } from "./show-processor";
import { formatDateToString } from "./date-utils";

/**
 * Fetch show details by date from Phish.net API
 * @param date Date in YYYY-MM-DD format or Date object
 * @returns Promise with show data
 */
export async function fetchShowByDate(date: string | Date): Promise<ShowData> {
  try {
    // Format date to YYYY-MM-DD if it's a Date object
    let formattedDate: string;
    
    if (date && typeof date === 'object' && 'toISOString' in date) {
      formattedDate = formatDateToString(date);
    } else {
      formattedDate = String(date);
    }
    
    console.log(`Fetching show data for date: ${formattedDate}`);
    
    // Fetch data from the API
    const data = await fetchFromApi<any>(`setlists/showdate/${formattedDate}`);
    console.log('API response:', data);
    
    // Check if the API returned an error
    if (data.error && data.error !== 0 && data.error !== false) {
      return {
        success: false,
        error: data.error_message || `API Error: ${data.error}`,
        error_message: data.error_message,
        data: []
      };
    }
    
    // API returns a successful response but with empty data
    if (!data.data || data.data.length === 0) {
      return {
        success: false,
        error: `No shows found for ${formattedDate}`,
        error_message: `No shows found for ${formattedDate}`,
        data: []
      };
    }
    
    // Process and organize the data using our utility function
    const processedData = transformShowData(data.data);
    
    console.log("Processed data:", processedData);
    
    return {
      success: true,
      data: processedData
    };
  } catch (error) {
    console.error('Error fetching show data:', error);
    return {
      success: false,
      error: error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : 'An unknown error occurred'
    };
  }
}
