/**
 * Utility functions for date handling in the application
 */

/** Phish's first show: December 2, 1983. */
export const FIRST_SHOW_DATE = new Date(1983, 11, 2);

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * Build a local-midnight Date, or null if the components don't form a real
 * calendar date (e.g. Feb 30, which `new Date` would silently roll over).
 */
function buildDate(year: number, month: number, day: number): Date | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * Expand a two-digit year. Phish started in 1983, so 83-99 means the 1900s
 * and everything else means the 2000s.
 */
function expandYear(year: number): number {
  return year >= 83 ? 1900 + year : 2000 + year;
}

function monthFromName(name: string): number | null {
  const lower = name.toLowerCase().replace(/\.$/, '');
  if (lower.length < 3) return null;
  const index = MONTH_NAMES.findIndex(
    (month) => month === lower || month.slice(0, 3) === lower || (lower === 'sept' && month === 'september')
  );
  return index === -1 ? null : index + 1;
}

/**
 * Strictly parse a YYYY-MM-DD string into a local-midnight Date.
 * @returns the Date, or null if the string isn't a real date in that format
 */
export function parseIsoDate(dateString: string | null | undefined): Date | null {
  if (typeof dateString !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return null;
  return buildDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

export interface ParseDateOptions {
  /**
   * Accept two-digit years ("12/31/95"). Turn this off while the user is
   * still typing, so "12/31/19" isn't read as 2019 on the way to "1995".
   */
  allowTwoDigitYear?: boolean;
}

/**
 * Parse a date the way a person would type it. Month comes first in numeric
 * dates (US order), matching how Phish dates are conventionally written.
 *
 * Accepts: 12/31/1995, 12-31-95, 12.31.1995, 12311995, 1995-12-31,
 * Dec 31 1995, December 31st, 1995, 31 Dec 1995.
 *
 * @returns a local-midnight Date, or null if the text isn't a real date
 */
export function parseDateInput(text: string, options: ParseDateOptions = {}): Date | null {
  const { allowTwoDigitYear = true } = options;
  if (typeof text !== 'string') return null;
  const input = text.trim();
  if (!input) return null;

  const toYear = (raw: string): number | null => {
    if (raw.length === 4) return Number(raw);
    if (raw.length === 2 && allowTwoDigitYear) return expandYear(Number(raw));
    return null;
  };

  let match: RegExpExecArray | null;

  // 1995-12-31 (also 1995/12/31)
  if ((match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(input))) {
    return buildDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  // 12/31/1995, 12-31-95, 12.31.1995
  if ((match = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(input))) {
    const year = toYear(match[3]);
    return year === null ? null : buildDate(year, Number(match[1]), Number(match[2]));
  }

  // 12311995
  if ((match = /^(\d{2})(\d{2})(\d{4})$/.exec(input))) {
    return buildDate(Number(match[3]), Number(match[1]), Number(match[2]));
  }

  // Dec 31 1995, December 31st, 1995
  if ((match = /^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2}|\d{4})$/i.exec(input))) {
    const month = monthFromName(match[1]);
    const year = toYear(match[3]);
    return month === null || year === null ? null : buildDate(year, month, Number(match[2]));
  }

  // 31 Dec 1995, 31st December, 1995
  if ((match = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?,?\s+(\d{2}|\d{4})$/i.exec(input))) {
    const month = monthFromName(match[2]);
    const year = toYear(match[3]);
    return month === null || year === null ? null : buildDate(year, month, Number(match[1]));
  }

  return null;
}

/**
 * Format a date string to a human-readable format
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Formatted date string, or the input unchanged if it isn't a valid date
 */
export function formatShowDate(dateString: string): string {
  const date = parseIsoDate(dateString);
  if (!date) return String(dateString || '');

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a Date object to YYYY-MM-DD string (in local time)
 * @param date Date object
 * @returns Formatted date string
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
