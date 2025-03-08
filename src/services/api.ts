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
      formattedDate = date.toISOString().split('T')[0];
    } else {
      formattedDate = String(date);
    }
    
    const url = new URL('https://api.phish.net/v5/shows/showdate.json');
    url.searchParams.append('apikey', API_KEY);
    url.searchParams.append('showdate', formattedDate);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if the API returned an error
    if (data.error && data.error !== 0) {
      return {
        success: false,
        error: data.error_message || `API Error: ${data.error}`,
        error_message: data.error_message,
        data: []
      };
    }
    
    return data;
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
 * Parse setlist data from a show
 * @param setlistdata Raw setlist data string from API
 * @returns Formatted setlist with sets and songs
 */
export function parseSetlist(setlistdata: string): { set: string; songs: string[] }[] {
  if (!setlistdata) return [];
  
  // Simple parsing logic - can be enhanced based on actual data format
  const sets = setlistdata.split(/Set \d+:/g).filter(Boolean);
  
  return sets.map((set, index) => {
    const setName = `Set ${index + 1}`;
    const songs = set.split(',').map(song => song.trim()).filter(Boolean);
    return { set: setName, songs };
  });
}

/**
 * Format show date to a human-readable format
 * @param dateString Date string in API format
 * @returns Formatted date string
 */
export function formatShowDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    return dateString;
  }
}
