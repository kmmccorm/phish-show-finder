/**
 * Utility functions for processing setlist data
 */

import type { SongItem, Set } from "../types/show";

/**
 * Convert an API set code ("1", "2", "e", "e2", "s") to a display name
 */
export function getSetName(setCode: string): string {
  const code = setCode.toLowerCase();
  if (code === "s") return "Soundcheck";
  if (code === "e") return "Encore";
  const encore = /^e(\d+)$/.exec(code);
  if (encore) return `Encore ${encore[1]}`;
  return `Set ${setCode}`;
}

/**
 * Get sort order for a set code: soundcheck, numbered sets, then encores
 */
export function getSetOrder(setCode: string): number {
  const code = setCode.toLowerCase();
  if (code === "s") return 0;
  if (code === "e") return 1001;
  const encore = /^e(\d+)$/.exec(code);
  if (encore) return 1000 + Number(encore[1]);
  const setNumber = Number(code);
  return Number.isFinite(setNumber) ? setNumber : 999;
}

/**
 * Group songs into sets, with sets and the songs within them in show order
 * @param songs Array of song items
 * @returns Array of sets with organized songs
 */
export function organizeSongsIntoSets(songs: SongItem[]): Set[] {
  const setMap = new Map<string, SongItem[]>();

  for (const song of songs) {
    const group = setMap.get(song.set);
    if (group) {
      group.push(song);
    } else {
      setMap.set(song.set, [song]);
    }
  }

  return Array.from(setMap.entries())
    .sort(([a], [b]) => getSetOrder(a) - getSetOrder(b))
    .map(([code, setSongs]) => ({
      name: getSetName(code),
      songs: [...setSongs].sort((a, b) => a.position - b.position),
    }));
}
