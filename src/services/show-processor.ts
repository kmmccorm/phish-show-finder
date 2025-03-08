
/**
 * Utility functions for processing show data from the API
 */

import { Show, SongItem, Set } from "../types/show";
import { organizeSongsIntoSets } from "./setlist-utils";

/**
 * Transform raw API data into structured show objects
 * @param rawData Raw data from the Phish.net API
 * @returns Array of processed Show objects
 */
export function transformShowData(rawData: any[]): Show[] {
  if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
    console.warn("No data to process in transformShowData");
    return [];
  }

  try {
    // Group songs by showid first
    const showsMap = new Map<string, Show>();
    const songsMap = new Map<string, SongItem[]>();
    
    // First pass - collect all songs and basic show info
    rawData.forEach((item: any) => {
      if (!item || typeof item !== "object") {
        console.warn("Invalid item in rawData", item);
        return; // Skip invalid items
      }

      const showId = item.showid;
      if (!showId) {
        console.warn("Item missing showid", item);
        return; // Skip items without showid
      }
      
      // Initialize the songs array for this show if it doesn't exist yet
      if (!songsMap.has(showId)) {
        songsMap.set(showId, []);
        
        // Initialize the show object
        showsMap.set(showId, {
          showid: item.showid || "",
          showdate: item.showdate || "",
          permalink: item.permalink || "",
          venue: item.venue || "Unknown Venue",
          city: item.city || "",
          state: item.state || "",
          country: item.country || "",
          setlistnotes: item.setlistnotes || "",
          artist_name: item.artist_name || "Phish",
          venueid: item.venueid || "",
          rating: item.rating || "",
          ratingcount: item.reviews || "0",
          tours: item.tourname ? [{ id: item.tourid || "0", name: item.tourname }] : [],
        });
      }
      
      // Add this song to the show's songs array if it has a valid position
      if (item.position && item.set) {
        songsMap.get(showId)?.push({
          name: item.song || "Unknown Song",
          set: item.set,
          position: parseInt(item.position, 10),
          transition: item.trans_mark || "",
          footnote: item.footnote || "",
          isjam: item.isjam === '1'
        });
      }
    });
    
    // Convert the Maps to arrays for the response
    const processedShows = Array.from(showsMap.values());
    
    // Add songs to each show and organize them into sets
    processedShows.forEach((show) => {
      const songItems = songsMap.get(show.showid) || [];
      show.songs = songItems;
      
      // Organize songs into sets
      show.sets = organizeSongsIntoSets(songItems);
    });
    
    return processedShows;
  } catch (error) {
    console.error("Error in transformShowData:", error);
    return [];
  }
}

/**
 * Extract tags from raw API data
 * @param rawData Raw data from the API
 * @returns Tags for each show
 */
export function extractShowTags(rawData: any[]): Record<string, any[]> {
  const showTags: Record<string, any[]> = {};
  
  try {
    rawData.forEach(item => {
      if (!item || !item.showid || !item.tags) return;
      
      if (!showTags[item.showid]) {
        showTags[item.showid] = [];
      }
      
      // Only add unique tags
      if (Array.isArray(item.tags)) {
        item.tags.forEach((tag: any) => {
          if (!showTags[item.showid].some(t => t.name === tag.name)) {
            showTags[item.showid].push(tag);
          }
        });
      }
    });
    
    return showTags;
  } catch (error) {
    console.error("Error in extractShowTags:", error);
    return {};
  }
}

