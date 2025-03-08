
/**
 * API service for fetching and processing show data
 */

import { fetchFromApi } from "./api-client";
import { ShowData, Show, SongItem } from "../types/show";
import { organizeSongsIntoSets } from "./setlist-utils";
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
    
    // Process and organize the data
    const processedData = processShowData(data.data);
    
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

/**
 * Process raw API data into a structured format
 * @param rawData Raw data from the API
 * @returns Processed show data
 */
function processShowData(rawData: any[]): Show[] {
  // Group songs by showid first
  const showsMap = new Map<string, Show>();
  const songsMap = new Map<string, SongItem[]>();
  
  // First pass - collect all songs and basic show info
  rawData.forEach((item: any) => {
    const showId = item.showid;
    
    // Initialize the songs array for this show if it doesn't exist yet
    if (!songsMap.has(showId)) {
      songsMap.set(showId, []);
      
      // Initialize the show object
      showsMap.set(showId, {
        showid: item.showid,
        showdate: item.showdate,
        permalink: item.permalink,
        venue: item.venue,
        city: item.city,
        state: item.state,
        country: item.country,
        setlistnotes: item.setlistnotes,
        artist_name: item.artist_name,
        venueid: item.venueid,
        rating: item.rating,
        ratingcount: item.reviews,
        tours: item.tourname ? [{ id: item.tourid, name: item.tourname }] : [],
      });
    }
    
    // Add this song to the show's songs array if it has a valid position
    if (item.position && item.set) {
      songsMap.get(showId)?.push({
        name: item.song,
        set: item.set,
        position: parseInt(item.position, 10),
        transition: item.trans_mark,
        footnote: item.footnote,
        isjam: item.isjam === '1'
      });
    }
  });
  
  // Convert the Maps to arrays for the response
  const processedData = Array.from(showsMap.values());
  
  // Add songs to each show and organize them into sets
  processedData.forEach((show) => {
    const songItems = songsMap.get(show.showid) || [];
    show.songs = songItems;
    
    // Organize songs into sets
    show.sets = organizeSongsIntoSets(songItems);
  });
  
  return processedData;
}
