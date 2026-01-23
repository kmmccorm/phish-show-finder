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
