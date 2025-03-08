
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
  short_date?: string;
  long_date?: string;
  relative_date?: string;
  url?: string;
  permalink?: string; // Added from actual API response
  gapchart?: string;
  artist_name: string;
  venueid: string;
  venue: string;
  location?: string;
  setlistnotes: string;
  setlistdata?: string;
  rating?: string;
  ratingcount?: string;
  country: string;
  city: string;
  state: string;
  zip?: string;
  tours?: Tour[];
  tags?: Tag[];
  // For setlist display
  songs?: SongItem[];
  sets?: Set[];
}

export interface Tour {
  id: string;
  name: string;
  startdate?: string;
  enddate?: string;
}

export interface Tag {
  name: string;
  count?: string;
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
  trackposition?: string;
  isjam?: string;
  isalbum?: string;
  trans_mark?: string;
  [key: string]: any; // For additional fields
}

// New interfaces for processed setlist data
export interface SongItem {
  name: string;
  set: string;
  position: number;
  transition?: string;
  footnote?: string;
  isjam?: boolean;
}

export interface Set {
  name: string;
  songs: SongItem[];
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
    
    // Process and organize the data to make it easier to display
    // Group songs by showid first
    const showsMap = new Map();
    const songsMap = new Map<string, SongItem[]>();
    
    // First pass - collect all songs and basic show info
    data.data.forEach((item: any) => {
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
          rating: item.rating,
          ratingcount: item.reviews,
          tours: item.tourname ? [{ id: item.tourid, name: item.tourname }] : [],
          // Will add songs and sets later
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
    processedData.forEach((show: any) => {
      const songItems = songsMap.get(show.showid) || [];
      show.songs = songItems;
      
      // Organize songs into sets
      const setMap = new Map<string, SongItem[]>();
      
      songItems.forEach(song => {
        if (!setMap.has(song.set)) {
          setMap.set(song.set, []);
        }
        setMap.get(song.set)?.push(song);
      });
      
      // Convert the map to an array of Set objects
      show.sets = Array.from(setMap.entries()).map(([name, songs]) => {
        // Sort songs by position within the set
        const sortedSongs = [...songs].sort((a, b) => a.position - b.position);
        return {
          name: getSetName(name),
          songs: sortedSongs
        };
      });
      
      // Sort sets in a logical order
      show.sets.sort((a, b) => {
        // Custom sorting logic for set names
        return getSetOrder(a.name) - getSetOrder(b.name);
      });
    });
    
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
 * Convert set code to display name
 */
function getSetName(setCode: string): string {
  switch(setCode) {
    case '1': return 'Set 1';
    case '2': return 'Set 2';
    case '3': return 'Set 3';
    case '4': return 'Set 4';
    case 'e': return 'Encore';
    case 'e2': return 'Encore 2';
    case 'e3': return 'Encore 3';
    default: return `Set ${setCode}`;
  }
}

/**
 * Get sort order for sets
 */
function getSetOrder(setName: string): number {
  switch(setName) {
    case 'Set 1': return 1;
    case 'Set 2': return 2;
    case 'Set 3': return 3;
    case 'Set 4': return 4;
    case 'Encore': return 90;
    case 'Encore 2': return 91;
    case 'Encore 3': return 92;
    default: return 99;
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
