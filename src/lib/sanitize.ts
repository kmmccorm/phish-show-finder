/**
 * Utility functions for sanitizing HTML content to prevent XSS attacks
 */

import DOMPurify from "dompurify";

/**
 * Configuration for different sanitization levels
 */
export const SANITIZE_CONFIG = {
  // Strict: Only basic formatting tags
  strict: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i'],
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  },
  // Standard: Common formatting and links
  standard: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'b', 'i', 'blockquote'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  },
  // Relaxed: Most common HTML tags
  relaxed: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'b', 'i',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
    ALLOW_DATA_ATTR: false,
  },
} as const;

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html Raw HTML string
 * @param level Sanitization level: 'strict', 'standard', or 'relaxed'
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(
  html: string,
  level: keyof typeof SANITIZE_CONFIG = 'standard'
): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, SANITIZE_CONFIG[level]);
}

/**
 * Strip all HTML tags and return plain text
 * @param html HTML string
 * @returns Plain text without HTML tags
 */
export function stripHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

/**
 * Check if a string contains potentially dangerous HTML
 * @param html HTML string to check
 * @returns true if the content was modified during sanitization
 */
export function containsDangerousHtml(html: string): boolean {
  if (!html) return false;

  const sanitized = DOMPurify.sanitize(html);
  return html.trim() !== sanitized.trim();
}

/**
 * Fix common encoding issues (mojibake) in text
 * These occur when UTF-8 text is incorrectly decoded as Windows-1252/ISO-8859-1
 * @param text Text with potential encoding issues
 * @returns Cleaned text with proper characters
 */
export function fixEncodingIssues(text: string): string {
  if (!text) return '';

  let result = text;

  // Common UTF-8 mojibake patterns when decoded as Windows-1252
  const replacements: [RegExp, string][] = [
    // Apostrophes - â between letters (e.g., "didn't", "clock's")
    [/(\w)â(\w)/g, "$1'$2"],

    // Opening smart quotes - â after space/start or before word
    [/(^|[\s(])â(\w)/g, '$1"$2'],

    // Closing smart quotes - â after word, before space/punctuation/end
    [/(\w)â([\s.,;:!?)"]|$)/g, '$1"$2'],

    // Any remaining standalone â likely a quote
    [/â/g, '"'],

    // Orphaned Â in various positions
    [/Â /g, ' '],           // Â followed by space
    [/ Â/g, ' '],           // Space followed by Â
    [/(\w)Â(\w)/g, '$1 $2'], // Â between words - replace with space
    [/(\.)Â /g, '. '],      // Â after period
    [/Â(?=[A-Z])/g, ' '],   // Â before capital letter (likely sentence boundary)
    [/Â/g, ''],             // Remove any remaining Â

    // Multi-byte mojibake sequences (less common but possible)
    [/â€™/g, "'"],      // Right single quote
    [/â€˜/g, "'"],      // Left single quote
    [/â€œ/g, '"'],      // Left double quote
    [/â€/g, '"'],      // Right double quote
    [/â€"/g, '—'],      // Em dash
    [/â€"/g, '–'],      // En dash
    [/â€¦/g, '…'],      // Ellipsis

    // Accented characters
    [/Ã©/g, 'é'],       // e with acute
    [/Ã¨/g, 'è'],       // e with grave
    [/Ã¢/g, 'â'],       // a with circumflex
    [/Ã®/g, 'î'],       // i with circumflex
    [/Ã´/g, 'ô'],       // o with circumflex
    [/Ã»/g, 'û'],       // u with circumflex
    [/Ã /g, 'à'],       // a with grave
    [/Ã¹/g, 'ù'],       // u with grave
    [/Ã§/g, 'ç'],       // c with cedilla
    [/Ã±/g, 'ñ'],       // n with tilde
    [/Ã¶/g, 'ö'],       // o with umlaut
    [/Ã¼/g, 'ü'],       // u with umlaut
    [/Ã¤/g, 'ä'],       // a with umlaut
    [/Ã«/g, 'ë'],       // e with umlaut
    [/Ã¯/g, 'ï'],       // i with umlaut
    [/Ã¿/g, 'ÿ'],       // y with umlaut

    // Control characters
    [/\u0080/g, ''],    // PAD control character
    [/\u0081/g, ''],    // HOP control character
    [/\u008D/g, ''],    // RI control character
    [/\u008F/g, ''],    // SS3 control character
    [/\u0090/g, ''],    // DCS control character
    [/\u009D/g, ''],    // OSC control character
  ];

  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  // Final cleanup: normalize multiple spaces
  result = result.replace(/  +/g, ' ').trim();

  return result;
}
