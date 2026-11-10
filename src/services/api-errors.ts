/**
 * Custom error types for the Phish.net API
 * Each error type has a user-friendly message for display
 */

import { formatShowDate } from './date-utils';

export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'RATE_LIMITED'
  | 'INVALID_API_KEY'
  | 'NO_SHOW_FOUND'
  | 'INVALID_DATE'
  | 'UNKNOWN';

export class ApiError extends Error {
  code: ApiErrorCode;
  userMessage: string;
  statusCode?: number;

  constructor(code: ApiErrorCode, message: string, userMessage: string, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
  }
}

export class NetworkError extends ApiError {
  constructor(originalError?: Error) {
    super(
      'NETWORK_ERROR',
      originalError?.message || 'Network request failed',
      'Unable to connect to Phish.net. Please check your internet connection and try again.'
    );
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor() {
    super(
      'TIMEOUT',
      'Request timed out',
      'The request is taking too long. Please try again in a moment.'
    );
    this.name = 'TimeoutError';
  }
}

export class ServerError extends ApiError {
  constructor(statusCode: number, detail?: string) {
    super(
      'SERVER_ERROR',
      detail || `Server returned status ${statusCode}`,
      'Phish.net is experiencing issues. Please try again later.',
      statusCode
    );
    this.name = 'ServerError';
  }
}

export class RateLimitError extends ApiError {
  constructor() {
    super(
      'RATE_LIMITED',
      'Rate limit exceeded',
      'Too many requests. Please wait a moment before trying again.',
      429
    );
    this.name = 'RateLimitError';
  }
}

export class InvalidApiKeyError extends ApiError {
  constructor(detail?: string) {
    super(
      'INVALID_API_KEY',
      detail || 'Invalid or missing API key',
      'The Phish.net API key is missing or invalid, so shows cannot be loaded.',
      401
    );
    this.name = 'InvalidApiKeyError';
  }
}

export class NoShowFoundError extends ApiError {
  date: string;

  constructor(date: string) {
    super(
      'NO_SHOW_FOUND',
      `No show found for date ${date}`,
      `No show was found on ${formatShowDate(date)}. Try a different date.`
    );
    this.name = 'NoShowFoundError';
    this.date = date;
  }
}

export class InvalidDateError extends ApiError {
  constructor(date: string) {
    super(
      'INVALID_DATE',
      `Invalid date format: ${date}`,
      'The selected date is invalid. Please choose a valid date.'
    );
    this.name = 'InvalidDateError';
  }
}

/**
 * Get a user-friendly message from any error
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.userMessage;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR', 'RATE_LIMITED', 'UNKNOWN'].includes(error.code);
  }
  return false;
}
