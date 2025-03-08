
/**
 * Type definitions for show data
 */

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
  permalink?: string;
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
