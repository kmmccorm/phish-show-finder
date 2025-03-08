
/**
 * Utility functions for processing setlist data
 */

import { SongItem, Set } from "../types/show";

/**
 * Convert set code to display name
 */
export function getSetName(setCode: string): string {
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
export function getSetOrder(setName: string): number {
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
 * Process raw API data to create organized sets
 * @param songs Array of song items
 * @returns Array of sets with organized songs
 */
export function organizeSongsIntoSets(songs: SongItem[]): Set[] {
  // Organize songs into sets
  const setMap = new Map<string, SongItem[]>();
  
  songs.forEach(song => {
    if (!setMap.has(song.set)) {
      setMap.set(song.set, []);
    }
    setMap.get(song.set)?.push(song);
  });
  
  // Convert the map to an array of Set objects
  const sets = Array.from(setMap.entries()).map(([name, songs]) => {
    // Sort songs by position within the set
    const sortedSongs = [...songs].sort((a, b) => a.position - b.position);
    return {
      name: getSetName(name),
      songs: sortedSongs
    };
  });
  
  // Sort sets in a logical order
  return sets.sort((a, b) => getSetOrder(a.name) - getSetOrder(b.name));
}
