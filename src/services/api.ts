/**
 * API service for interacting with the Phish.net API
 */

// Types for API responses
export interface ShowData {
  success: boolean;
  error?: string;
  error_message?: string;
  data?: Show[];
}

export interface Show {
  showid: string;
  showdate: string;
  short_date: string;
  long_date: string;
  relative_date: string;
  url: string;
  gapchart: string;
  artist_name: string;
  venueid: string;
  venue: string;
  location: string;
  setlistnotes: string;
  setlistdata: string;
  rating: string;
  ratingcount: string;
  country: string;
  city: string;
  state: string;
  zip: string;
  tours: Tour[];
  tags: Tag[];
  tierset: Tierset;
}

export interface Tour {
  id: string;
  name: string;
  startdate: string;
  enddate: string;
}

export interface Tag {
  name: string;
  count: string;
}

export interface Tierset {
  tiers: Tier[];
}

export interface Tier {
  name: string;
  songs: Song[];
}

export interface Song {
  id: string;
  name: string;
  slug: string;
  trackposition: string;
  isjam: string;
  isalbum: string;
  trans_mark?: string;
  [key: string]: any; // For additional fields
}

// Updated API key for Phish.net v5 API
// For a public app like this, it's okay to hardcode the API key
// For more sensitive apps, consider server-side proxy or user-provided keys
const API_KEY = "ADB07055FF645FD21980";

/**
 * Fetch show details by date from Phish.net API
 * @param date Date in YYYY-MM-DD format
 * @returns Promise with show data
 */
export async function fetchShowByDate(date: string | Date): Promise<ShowData> {
  try {
    // Format date to YYYY-MM-DD if it's a Date object
    let formattedDate: string;
    
    if (date && typeof date === 'object' && 'toISOString' in date) {
      // Fix timezone issue by ensuring we use the local date, not UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      formattedDate = `${year}-${month}-${day}`;
    } else {
      formattedDate = String(date);
    }
    
    // Updated URL to use the setlists endpoint
    const url = `https://api.phish.net/v5/setlists/showdate/${formattedDate}.json?apikey=${API_KEY}`;
    
    console.log(`Fetching show data for date: ${formattedDate}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API response:', data);
    
    // Check if the API returned an error
    if (data.error && data.error !== 0) {
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
    
    // Process the data to ensure proper structure
    const processedData = data.data.map((show: any) => {
      // Ensure tierset is properly structured
      if (show.setlistdata && typeof show.setlistdata === 'string') {
        try {
          // Some responses might have the setlist in JSON format that needs parsing
          const setlistDataObj = JSON.parse(show.setlistdata);
          if (setlistDataObj && typeof setlistDataObj === 'object') {
            show.setlistdata = setlistDataObj;
          }
        } catch (e) {
          // If it's not valid JSON, that's fine - we'll keep the string
          console.log("Setlist is not JSON format, keeping as string");
        }
      }
      
      return show;
    });
    
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

/**
 * Format show date to a human-readable format
 * @param dateString Date string in API format
 * @returns Formatted date string
 */
export function formatShowDate(dateString: string): string {
  try {
    // Parse the date - make sure to handle YYYY-MM-DD format correctly
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
}
