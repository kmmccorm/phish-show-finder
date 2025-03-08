
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
    // Parse the date - make sure to handle YYYY-MM-DD format correctly
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
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
