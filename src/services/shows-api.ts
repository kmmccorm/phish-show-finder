
/**
 * API service for fetching and processing show data
 */

import { fetchFromApi } from "./api-client";
import { ShowData } from "../types/show";
import { transformShowData } from "./show-processor";
import { formatDateToString } from "./date-utils";
import {
  ApiError,
  NoShowFoundError,
  InvalidDateError,
  getUserFriendlyMessage,
} from "./api-errors";

/**
 * Fetch show details by date from Phish.net API
 * @param date Date in YYYY-MM-DD format or Date object
 * @returns Promise with show data
 */
export async function fetchShowByDate(date: string | Date): Promise<ShowData> {
  // Format date to YYYY-MM-DD if it's a Date object
  let formattedDate: string;

  if (date && typeof date === 'object' && 'toISOString' in date) {
    formattedDate = formatDateToString(date);
  } else {
    formattedDate = String(date);
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedDate)) {
    throw new InvalidDateError(formattedDate);
  }

  console.log(`Fetching show data for date: ${formattedDate}`);

  try {
    // Fetch data from the API
    const data = await fetchFromApi<any>(`setlists/showdate/${formattedDate}`);
    console.log('API response:', data);

    // Check if the API returned an error
    if (data.error && data.error !== 0 && data.error !== false) {
      const errorMessage = data.error_message || `API Error: ${data.error}`;
      return {
        success: false,
        error: errorMessage,
        error_message: errorMessage,
        data: []
      };
    }

    // API returns a successful response but with empty data
    if (!data.data || data.data.length === 0) {
      throw new NoShowFoundError(formattedDate);
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

    // Re-throw ApiError instances so they can be handled by the UI
    if (error instanceof ApiError) {
      throw error;
    }

    // Wrap unexpected errors
    return {
      success: false,
      error: getUserFriendlyMessage(error)
    };
  }
}
