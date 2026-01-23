
/**
 * Utility functions for date handling in the application
 */

/**
 * Format a date string to a human-readable format
 * @param dateString Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export function formatShowDate(dateString: string): string {
  try {
    // Validate input
    if (!dateString || typeof dateString !== 'string') {
      console.warn("Invalid date string provided:", dateString);
      return String(dateString || '');
    }

    // Validate YYYY-MM-DD format using regex
    const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateFormatRegex.test(dateString)) {
      console.warn(`Date string "${dateString}" is not in YYYY-MM-DD format`);
      return dateString;
    }

    // Parse the date - make sure to handle YYYY-MM-DD format correctly
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      console.warn(`Invalid date parts for "${dateString}"`);
      return dateString;
    }

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    // Validate parsed values are valid numbers
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn(`Failed to parse date components from "${dateString}"`);
      return dateString;
    }

    // Validate month and day ranges
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn(`Invalid month or day in "${dateString}"`);
      return dateString;
    }

    // Create date and validate it's not invalid (e.g., Feb 30)
    const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date

    // Check if the date is valid (Date object could be Invalid Date)
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date created from "${dateString}"`);
      return dateString;
    }

    // Verify the date components match (catches invalid dates like Feb 30 which roll over)
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      console.warn(`Date "${dateString}" rolled over to different date`);
      return dateString;
    }

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return String(dateString || '');
  }
}

/**
 * Format a Date object to YYYY-MM-DD string
 * @param date Date object
 * @returns Formatted date string
 */
export function formatDateToString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}
