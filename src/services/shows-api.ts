/**
 * API service for fetching and processing show data
 */

import { fetchFromApi } from "./api-client";
import type { RawSetlistRow, Show } from "../types/show";
import { transformShowData } from "./show-processor";
import { formatDateToString, parseIsoDate } from "./date-utils";
import { NoShowFoundError, InvalidDateError } from "./api-errors";

const isPhish = (show: Show) => show.artist_name.trim().toLowerCase() === "phish";

/**
 * Fetch the shows played on a date from the Phish.net API.
 *
 * Phish.net also tracks side projects (Trey Anastasio Band, Mike Gordon, ...),
 * so a date can have more than one show. Phish shows are listed first.
 *
 * @param date Date in YYYY-MM-DD format or Date object
 * @returns The shows on that date (never empty)
 * @throws ApiError — NoShowFoundError when nothing was played that day
 */
export async function fetchShowByDate(date: string | Date): Promise<Show[]> {
  const formattedDate = date instanceof Date ? formatDateToString(date) : String(date);

  if (!parseIsoDate(formattedDate)) {
    throw new InvalidDateError(formattedDate);
  }

  const rows = await fetchFromApi<RawSetlistRow[]>(`setlists/showdate/${formattedDate}`);
  const shows = transformShowData(rows);

  if (shows.length === 0) {
    throw new NoShowFoundError(formattedDate);
  }

  // Array.prototype.sort is stable, so shows keep the API's order otherwise.
  return shows.sort((a, b) => Number(isPhish(b)) - Number(isPhish(a)));
}
