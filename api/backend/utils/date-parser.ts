/**
 * Date Parser Utility
 * Parses various date formats from SMS messages
 */

import { format, subDays, parse, isValid } from 'date-fns';

export interface DateParseResult {
  isValid: boolean;
  date?: string; // YYYY-MM-DD format
  error?: string;
}

/**
 * Parse date from SMS message
 * Supports multiple formats: M/D/YY, M-D-YYYY, YYYY-MM-DD, "yesterday", etc.
 */
export function parseDateFromMessage(message: string): DateParseResult {
  const cleaned = message.trim().toLowerCase();

  // Handle special cases
  if (cleaned === 'yesterday') {
    const date = subDays(new Date(), 1);
    return {
      isValid: true,
      date: format(date, 'yyyy-MM-dd'),
    };
  }

  if (cleaned === 'today') {
    return {
      isValid: true,
      date: format(new Date(), 'yyyy-MM-dd'),
    };
  }

  // Try various date formats
  const patterns = [
    // M/D/YY or M/D/YYYY
    {
      regex: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/,
      parse: (match: RegExpMatchArray) => parseSlashFormat(match),
    },
    // M-D-YY or M-D-YYYY
    {
      regex: /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/,
      parse: (match: RegExpMatchArray) => parseDashFormat(match),
    },
    // YYYY-MM-DD or YYYY/MM/DD
    {
      regex: /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/,
      parse: (match: RegExpMatchArray) => parseISOFormat(match),
    },
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern.regex);
    if (match) {
      return pattern.parse(match);
    }
  }

  return {
    isValid: false,
    error: 'Invalid date. Try: 7/14/23 or 2023-07-14',
  };
}

/**
 * Parse M/D/YY or M/D/YYYY format
 */
function parseSlashFormat(match: RegExpMatchArray): DateParseResult {
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // Handle 2-digit year
  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }

  return validateAndFormat(year, month, day);
}

/**
 * Parse M-D-YY or M-D-YYYY format
 */
function parseDashFormat(match: RegExpMatchArray): DateParseResult {
  const month = parseInt(match[1], 10);
  const day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // Handle 2-digit year
  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }

  return validateAndFormat(year, month, day);
}

/**
 * Parse YYYY-MM-DD or YYYY/MM/DD format
 */
function parseISOFormat(match: RegExpMatchArray): DateParseResult {
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  return validateAndFormat(year, month, day);
}

/**
 * Validate date components and format as YYYY-MM-DD
 */
function validateAndFormat(
  year: number,
  month: number,
  day: number
): DateParseResult {
  // Basic validation
  if (month < 1 || month > 12) {
    return {
      isValid: false,
      error: 'Invalid month. Month must be between 1 and 12.',
    };
  }

  if (day < 1 || day > 31) {
    return {
      isValid: false,
      error: 'Invalid day. Day must be between 1 and 31.',
    };
  }

  // Create date and check if it's valid
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date());

  if (!isValid(parsedDate)) {
    return {
      isValid: false,
      error: 'Invalid date. Please check the date is correct.',
    };
  }

  // Check year is reasonable (Phish formed in 1983)
  if (year < 1983 || year > new Date().getFullYear() + 1) {
    return {
      isValid: false,
      error: `Invalid year. Year must be between 1983 and ${new Date().getFullYear() + 1}.`,
    };
  }

  return {
    isValid: true,
    date: dateString,
  };
}
