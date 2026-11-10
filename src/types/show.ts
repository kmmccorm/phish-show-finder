/**
 * Type definitions for show data
 */

/**
 * One row of the Phish.net v5 `setlists` response. The API returns one row
 * per song, with the show's details repeated on every row. Numeric fields
 * arrive as numbers or numeric strings depending on the field, so both are
 * accepted here and normalised in show-processor.
 */
export interface RawSetlistRow {
  showid?: string | number;
  showdate?: string;
  permalink?: string;
  setlistnotes?: string;
  soundcheck?: string;
  artistid?: string | number;
  artist_name?: string;
  venueid?: string | number;
  venue?: string;
  city?: string;
  state?: string;
  country?: string;
  tourid?: string | number;
  tourname?: string;
  rating?: string | number;
  ratingcount?: string | number;
  tags?: Tag[];
  // Per-song fields
  song?: string;
  set?: string | number;
  position?: string | number;
  trans_mark?: string;
  footnote?: string;
  isjam?: string | number | boolean;
}

/** Raw envelope returned by every Phish.net v5 endpoint. */
export interface ApiEnvelope<T> {
  error?: boolean | number | string;
  error_message?: string;
  data?: T;
}

export interface Show {
  showid: string;
  showdate: string;
  permalink?: string;
  artist_name: string;
  venueid: string;
  venue: string;
  setlistnotes: string;
  soundcheck?: string;
  rating?: string;
  ratingcount?: string;
  country: string;
  city: string;
  state: string;
  tours?: Tour[];
  tags?: Tag[];
  // For setlist display
  songs?: SongItem[];
  sets?: Set[];
}

export interface Tour {
  id: string;
  name: string;
}

export interface Tag {
  name: string;
  count?: string;
}

// Processed setlist data
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
