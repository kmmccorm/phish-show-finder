/**
 * Tests for date utility functions
 */

import { describe, expect, test } from 'vitest';
import { formatShowDate, formatDateToString, parseDateInput, parseIsoDate } from '../services/date-utils';

describe('formatShowDate', () => {
  test('should format valid YYYY-MM-DD date strings', () => {
    const result = formatShowDate('2023-06-15');
    expect(result).toContain('June');
    expect(result).toContain('15');
    expect(result).toContain('2023');
  });

  test('should format Phish first show date correctly', () => {
    const result = formatShowDate('1983-12-02');
    expect(result).toContain('December');
    expect(result).toContain('2');
    expect(result).toContain('1983');
  });

  test('should handle dates with leading zeros', () => {
    const result = formatShowDate('2023-01-05');
    expect(result).toContain('January');
    expect(result).toContain('5');
    expect(result).toContain('2023');
  });

  test('should return original string for invalid format', () => {
    expect(formatShowDate('12/31/2023')).toBe('12/31/2023');
    expect(formatShowDate('2023/12/31')).toBe('2023/12/31');
    expect(formatShowDate('not-a-date')).toBe('not-a-date');
  });

  test('should return original string for invalid date components', () => {
    expect(formatShowDate('2023-13-01')).toBe('2023-13-01'); // Invalid month
    expect(formatShowDate('2023-00-01')).toBe('2023-00-01'); // Invalid month
    expect(formatShowDate('2023-01-32')).toBe('2023-01-32'); // Invalid day
    expect(formatShowDate('2023-01-00')).toBe('2023-01-00'); // Invalid day
  });

  test('should handle invalid dates that roll over', () => {
    // Feb 30 doesn't exist
    expect(formatShowDate('2023-02-30')).toBe('2023-02-30');
    // April 31 doesn't exist
    expect(formatShowDate('2023-04-31')).toBe('2023-04-31');
  });

  test('should handle non-numeric components', () => {
    expect(formatShowDate('abcd-ef-gh')).toBe('abcd-ef-gh');
    expect(formatShowDate('2023-ab-12')).toBe('2023-ab-12');
  });

  test('should handle empty or null input', () => {
    expect(formatShowDate('')).toBe('');
    expect(formatShowDate(null as never)).toBe('');
    expect(formatShowDate(undefined as never)).toBe('');
  });

  test('should handle malformed strings', () => {
    expect(formatShowDate('2023-12')).toBe('2023-12'); // Missing day
    expect(formatShowDate('2023')).toBe('2023'); // Only year
    expect(formatShowDate('12-31')).toBe('12-31'); // Missing year
  });

  test('should handle extra components', () => {
    // More than 3 components (though regex should catch this)
    expect(formatShowDate('2023-12-31-extra')).toBe('2023-12-31-extra');
  });

  test('should validate leap years correctly', () => {
    // Valid leap year date
    const leapDay = formatShowDate('2024-02-29');
    expect(leapDay).toContain('February');
    expect(leapDay).toContain('29');

    // Invalid - not a leap year
    expect(formatShowDate('2023-02-29')).toBe('2023-02-29');
  });
});

describe('formatDateToString', () => {
  test('should format Date object to YYYY-MM-DD', () => {
    const date = new Date(2023, 5, 15); // June 15, 2023
    expect(formatDateToString(date)).toBe('2023-06-15');
  });

  test('should pad single digit months and days', () => {
    const date = new Date(2023, 0, 5); // January 5, 2023
    expect(formatDateToString(date)).toBe('2023-01-05');
  });

  test('should handle end of year', () => {
    const date = new Date(2023, 11, 31); // December 31, 2023
    expect(formatDateToString(date)).toBe('2023-12-31');
  });

  test('should handle beginning of year', () => {
    const date = new Date(2023, 0, 1); // January 1, 2023
    expect(formatDateToString(date)).toBe('2023-01-01');
  });

  test('should handle Phish first show date', () => {
    const date = new Date(1983, 11, 2); // December 2, 1983
    expect(formatDateToString(date)).toBe('1983-12-02');
  });

  test('should handle leap year date', () => {
    const date = new Date(2024, 1, 29); // February 29, 2024
    expect(formatDateToString(date)).toBe('2024-02-29');
  });
});

describe('parseIsoDate', () => {
  test('parses a valid date at local midnight', () => {
    expect(parseIsoDate('1997-12-31')).toEqual(new Date(1997, 11, 31));
  });

  test('rejects anything that is not a real YYYY-MM-DD date', () => {
    expect(parseIsoDate('2023-02-30')).toBeNull();
    expect(parseIsoDate('1997-12-3')).toBeNull();
    expect(parseIsoDate('12/31/1997')).toBeNull();
    expect(parseIsoDate('')).toBeNull();
    expect(parseIsoDate(null as never)).toBeNull();
  });
});

describe('parseDateInput', () => {
  const nye95 = new Date(1995, 11, 31);

  test.each([
    '12/31/1995',
    '12-31-1995',
    '12.31.1995',
    '12/31/95',
    '12311995',
    '1995-12-31',
    'Dec 31 1995',
    'dec. 31, 1995',
    'December 31st, 1995',
    '31 Dec 1995',
    '31st December 95',
    '  12/31/1995  ',
  ])('parses %s', (input) => {
    expect(parseDateInput(input)).toEqual(nye95);
  });

  test('parses single-digit months and days', () => {
    expect(parseDateInput('7/4/2000')).toEqual(new Date(2000, 6, 4));
    expect(parseDateInput('Sept 9 1999')).toEqual(new Date(1999, 8, 9));
  });

  test('expands two-digit years around the first show in 1983', () => {
    expect(parseDateInput('12/2/83')?.getFullYear()).toBe(1983);
    expect(parseDateInput('12/31/99')?.getFullYear()).toBe(1999);
    expect(parseDateInput('8/7/09')?.getFullYear()).toBe(2009);
    expect(parseDateInput('8/7/24')?.getFullYear()).toBe(2024);
  });

  test('can require a four-digit year', () => {
    expect(parseDateInput('12/31/19', { allowTwoDigitYear: false })).toBeNull();
    expect(parseDateInput('12/31/1995', { allowTwoDigitYear: false })).toEqual(nye95);
  });

  test('rejects dates that do not exist', () => {
    expect(parseDateInput('2/30/1995')).toBeNull();
    expect(parseDateInput('13/1/1995')).toBeNull();
    expect(parseDateInput('Feb 29 2023')).toBeNull();
  });

  test('rejects text that is not a date', () => {
    expect(parseDateInput('')).toBeNull();
    expect(parseDateInput('tweezer')).toBeNull();
    expect(parseDateInput('Foo 31 1995')).toBeNull();
    expect(parseDateInput('12/31')).toBeNull();
    expect(parseDateInput('12/31/199')).toBeNull();
  });
});
