/**
 * Utility functions for processing show data from the API
 */

import type { RawSetlistRow, Show, SongItem, Tag } from "../types/show";
import { organizeSongsIntoSets } from "./setlist-utils";
import { fixEncodingIssues } from "../lib/encoding";

const text = (value: unknown): string => (value === null || value === undefined ? "" : String(value));

/**
 * Transform raw API data into structured show objects.
 *
 * The API returns one row per song with the show's details repeated on each
 * row; this groups those rows back into one object per show.
 *
 * @param rawData Raw rows from the Phish.net API
 * @returns Array of processed Show objects, in the order first seen
 */
export function transformShowData(rawData: RawSetlistRow[]): Show[] {
  if (!Array.isArray(rawData)) {
    return [];
  }

  // Map preserves insertion order, so shows come out in the order the API listed them.
  const shows = new Map<string, Show & { songs: SongItem[]; tags: Tag[] }>();

  for (const item of rawData) {
    if (!item || typeof item !== "object") continue;

    // showid is numeric in the API; normalise so 123 and "123" are one show.
    const showId = text(item.showid);
    if (!showId) continue;

    let show = shows.get(showId);
    if (!show) {
      show = {
        showid: showId,
        showdate: text(item.showdate),
        permalink: text(item.permalink),
        venue: fixEncodingIssues(text(item.venue)) || "Unknown Venue",
        city: fixEncodingIssues(text(item.city)),
        state: text(item.state),
        country: text(item.country),
        setlistnotes: fixEncodingIssues(text(item.setlistnotes)),
        soundcheck: fixEncodingIssues(text(item.soundcheck)),
        artist_name: text(item.artist_name) || "Phish",
        venueid: text(item.venueid),
        rating: text(item.rating),
        ratingcount: text(item.ratingcount),
        tours: item.tourname ? [{ id: text(item.tourid) || "0", name: item.tourname }] : [],
        tags: [],
        songs: [],
      };
      shows.set(showId, show);
    }

    if (Array.isArray(item.tags)) {
      for (const tag of item.tags) {
        if (tag?.name && !show.tags.some((existing) => existing.name === tag.name)) {
          show.tags.push(tag);
        }
      }
    }

    // A row is a song only if it has a set and a positive position.
    const position = parseInt(text(item.position), 10);
    const set = text(item.set);
    if (set && Number.isFinite(position) && position > 0) {
      show.songs.push({
        name: fixEncodingIssues(text(item.song)) || "Unknown Song",
        set,
        position,
        transition: text(item.trans_mark),
        footnote: fixEncodingIssues(text(item.footnote)),
        // The API sends this as 1/"1"; accept either.
        isjam: Number(item.isjam) === 1,
      });
    }
  }

  return Array.from(shows.values(), (show) => ({
    ...show,
    sets: organizeSongsIntoSets(show.songs),
  }));
}
