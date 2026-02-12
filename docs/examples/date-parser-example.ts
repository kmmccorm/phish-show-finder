/**
 * Example: Date Parser Utility
 * Path: /api/backend/utils/date-parser.ts
 *
 * Parses various date formats from SMS messages
 */

import { formatDateToString } from '../../../src/services/date-utils';

export interface DateParseResult {
  isValid: boolean;
  date?: string; // YYYY-MM-DD format
  error?: string;
}

/**
 * Parse date from SMS message text
 * Supports multiple formats:
 * - 7/14/23
 * - 7-14-2023
 * - 2023-07-14
 * - July 14, 2023
 * - yesterday
 */
export function parseDateFromMessage(message: string): DateParseResult {
  const cleaned = message.trim().toLowerCase();

  // Handle special keywords
  if (cleaned === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return { isValid: true, date: formatDateToString(yesterday) };
  }

  if (cleaned === 'today') {
    return { isValid: true, date: formatDateToString(new Date()) };
  }

  // Pattern 1: M/D/YY or MM/DD/YYYY or M-D-YY
  const slashPattern = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/;
  const slashMatch = cleaned.match(slashPattern);
  if (slashMatch) {
    return parseSlashFormat(slashMatch);
  }

  // Pattern 2: YYYY-MM-DD or YYYY/MM/DD
  const isoPattern = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/;
  const isoMatch = cleaned.match(isoPattern);
  if (isoMatch) {
    return parseISOFormat(isoMatch);
  }

  // Pattern 3: Month DD, YYYY (e.g., "July 14, 2023")
  const textPattern = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})$/;
  const textMatch = cleaned.match(textPattern);
  if (textMatch) {
    return parseTextFormat(textMatch);
  }

  // Pattern 4: Month DD (current year assumed)
  const shortTextPattern = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})$/;
  const shortTextMatch = cleaned.match(shortTextPattern);
  if (shortTextMatch) {
    return parseShortTextFormat(shortTextMatch);
  }

  // No pattern matched
  return {
    isValid: false,
    error: 'Invalid date format. Try: 7/14/23, 2023-07-14, or "yesterday"'
  };
}

/**
 * Parse M/D/YY or MM/DD/YYYY format
 */
function parseSlashFormat(match: RegExpMatchArray): DateParseResult {
  let month = parseInt(match[1], 10);
  let day = parseInt(match[2], 10);
  let year = parseInt(match[3], 10);

  // Convert 2-digit year to 4-digit
  if (year < 100) {
    // Assume 1900s for years >= 83 (band formed), 2000s otherwise
    year += year >= 83 ? 1900 : 2000;
  }

  // Validate ranges
  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Invalid month. Must be 1-12.' };
  }
  if (day < 1 || day > 31) {
    return { isValid: false, error: 'Invalid day. Must be 1-31.' };
  }
  if (year < 1983) {
    return { isValid: false, error: 'Phish was formed in 1983. Try a later year.' };
  }

  // Create date and validate it's real (handles Feb 30, etc.)
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1) {
    return { isValid: false, error: 'Invalid date (e.g., Feb 30 doesn\'t exist).' };
  }

  // Format as YYYY-MM-DD
  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { isValid: true, date: formatted };
}

/**
 * Parse YYYY-MM-DD format
 */
function parseISOFormat(match: RegExpMatchArray): DateParseResult {
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // Validate ranges
  if (month < 1 || month > 12) {
    return { isValid: false, error: 'Invalid month. Must be 1-12.' };
  }
  if (day < 1 || day > 31) {
    return { isValid: false, error: 'Invalid day. Must be 1-31.' };
  }
  if (year < 1983) {
    return { isValid: false, error: 'Phish was formed in 1983. Try a later year.' };
  }

  // Validate date is real
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1) {
    return { isValid: false, error: 'Invalid date.' };
  }

  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { isValid: true, date: formatted };
}

/**
 * Parse "Month DD, YYYY" format
 */
function parseTextFormat(match: RegExpMatchArray): DateParseResult {
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];

  const monthName = match[1].toLowerCase();
  const month = monthNames.indexOf(monthName) + 1;
  const day = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month === 0) {
    return { isValid: false, error: 'Invalid month name.' };
  }

  // Validate date
  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1) {
    return { isValid: false, error: 'Invalid date.' };
  }

  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { isValid: true, date: formatted };
}

/**
 * Parse "Month DD" format (assumes current year)
 */
function parseShortTextFormat(match: RegExpMatchArray): DateParseResult {
  const monthAbbrevs = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const monthAbbrev = match[1].toLowerCase();
  const month = monthAbbrevs.indexOf(monthAbbrev) + 1;
  const day = parseInt(match[2], 10);
  const year = new Date().getFullYear();

  if (month === 0) {
    return { isValid: false, error: 'Invalid month abbreviation.' };
  }

  const date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1) {
    return { isValid: false, error: 'Invalid date.' };
  }

  const formatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { isValid: true, date: formatted };
}

/**
 * Example tests
 */
export const examples = {
  valid: [
    { input: '7/14/23', expected: '2023-07-14' },
    { input: '12-31-1999', expected: '1999-12-31' },
    { input: '2023-07-14', expected: '2023-07-14' },
    { input: 'July 14, 2023', expected: '2023-07-14' },
    { input: 'jul 14', expected: `${new Date().getFullYear()}-07-14` },
    { input: 'yesterday', expected: '[day before current date]' },
  ],
  invalid: [
    { input: 'invalid', expected: 'error' },
    { input: '13/14/23', expected: 'error' },
    { input: '2/30/23', expected: 'error' },
    { input: '1982-01-01', expected: 'error (before 1983)' },
  ]
};
