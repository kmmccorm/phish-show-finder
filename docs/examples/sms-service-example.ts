/**
 * Example: SMS/MMS Service (Twilio Integration)
 * Path: /api/backend/services/sms-service.ts
 *
 * Handles sending SMS and MMS messages and validating Twilio webhooks
 */

import twilio from 'twilio';
import type { VercelRequest } from '@vercel/node';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  throw new Error('Missing Twilio environment variables. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER');
}

const client = twilio(accountSid, authToken);

/**
 * Send an SMS message (text only)
 */
export async function sendSMS(to: string, body: string): Promise<void> {
  try {
    console.log(`Sending SMS to ${to}: ${body.substring(0, 50)}...`);

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to
    });

    console.log(`SMS sent successfully. SID: ${message.sid}`);
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw new Error(`SMS delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send an MMS message (text + image)
 */
export async function sendMMS(
  to: string,
  body: string,
  mediaUrl: string | string[]
): Promise<void> {
  try {
    console.log(`Sending MMS to ${to}: ${body.substring(0, 50)}...`);
    console.log(`Media: ${Array.isArray(mediaUrl) ? mediaUrl.join(', ') : mediaUrl}`);

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
      mediaUrl: Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl],
    });

    console.log(`MMS sent successfully. SID: ${message.sid}`);
  } catch (error) {
    console.error('Failed to send MMS:', error);
    throw new Error(`MMS delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send either SMS or MMS based on whether media is provided
 */
export async function sendMessage(
  to: string,
  body: string,
  mediaUrl?: string | string[]
): Promise<void> {
  if (mediaUrl) {
    await sendMMS(to, body, mediaUrl);
  } else {
    await sendSMS(to, body);
  }
}

/**
 * Validate that a webhook request came from Twilio
 * Uses Twilio's signature validation
 */
export function validateTwilioWebhook(req: VercelRequest): boolean {
  try {
    const twilioSignature = req.headers['x-twilio-signature'];

    if (!twilioSignature || typeof twilioSignature !== 'string') {
      console.error('Missing Twilio signature header');
      return false;
    }

    // Construct the full URL
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers['host'];
    const url = `${protocol}://${host}${req.url}`;

    // Validate the request
    const isValid = twilio.validateRequest(
      authToken!,
      twilioSignature,
      url,
      req.body
    );

    if (!isValid) {
      console.error('Invalid Twilio signature');
    }

    return isValid;
  } catch (error) {
    console.error('Error validating Twilio webhook:', error);
    return false;
  }
}

/**
 * Parse Twilio webhook body
 */
export interface TwilioWebhookBody {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia?: string;
  MediaUrl0?: string;
  FromCity?: string;
  FromState?: string;
  FromZip?: string;
  FromCountry?: string;
}

/**
 * Rate limiting: Track requests per phone number
 * In production, use Redis or similar
 */
const requestLog = new Map<string, number[]>();

export function checkRateLimit(phoneNumber: string, maxRequests = 5, windowMinutes = 60): {
  allowed: boolean;
  remaining: number;
  resetMinutes: number;
} {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  // Get or create request log for this number
  const requests = requestLog.get(phoneNumber) || [];

  // Filter to only recent requests within the time window
  const recentRequests = requests.filter(timestamp => now - timestamp < windowMs);

  // Check if limit exceeded
  if (recentRequests.length >= maxRequests) {
    const oldestRequest = Math.min(...recentRequests);
    const resetMinutes = Math.ceil((oldestRequest + windowMs - now) / (60 * 1000));

    return {
      allowed: false,
      remaining: 0,
      resetMinutes
    };
  }

  // Add current request
  recentRequests.push(now);
  requestLog.set(phoneNumber, recentRequests);

  // Clean up old entries (optional, helps with memory)
  if (requestLog.size > 1000) {
    cleanupOldEntries();
  }

  return {
    allowed: true,
    remaining: maxRequests - recentRequests.length,
    resetMinutes: windowMinutes
  };
}

/**
 * Clean up old rate limit entries
 */
function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [phoneNumber, requests] of requestLog.entries()) {
    const recentRequests = requests.filter(timestamp => now - timestamp < maxAge);

    if (recentRequests.length === 0) {
      requestLog.delete(phoneNumber);
    } else {
      requestLog.set(phoneNumber, recentRequests);
    }
  }
}

/**
 * Handle "STOP" opt-out requests (required by SMS regulations)
 */
const optOutList = new Set<string>();

export function handleOptOut(phoneNumber: string, message: string): boolean {
  const normalized = message.trim().toUpperCase();

  if (normalized === 'STOP' || normalized === 'UNSUBSCRIBE') {
    optOutList.add(phoneNumber);
    console.log(`Phone number ${phoneNumber} opted out`);
    return true;
  }

  if (normalized === 'START' || normalized === 'SUBSCRIBE') {
    optOutList.delete(phoneNumber);
    console.log(`Phone number ${phoneNumber} opted back in`);
    return true;
  }

  return false;
}

export function isOptedOut(phoneNumber: string): boolean {
  return optOutList.has(phoneNumber);
}

/**
 * Example: Enhanced handler with rate limiting and opt-out
 */
export async function sendSMSWithChecks(to: string, body: string): Promise<{
  success: boolean;
  error?: string;
}> {
  // Check opt-out status
  if (isOptedOut(to)) {
    console.log(`Not sending SMS to ${to} - user opted out`);
    return { success: false, error: 'User opted out' };
  }

  // Check rate limit
  const rateLimit = checkRateLimit(to);
  if (!rateLimit.allowed) {
    console.log(`Rate limit exceeded for ${to}`);
    return {
      success: false,
      error: `Too many requests. Try again in ${rateLimit.resetMinutes} minutes.`
    };
  }

  // Send the message
  try {
    await sendSMS(to, body);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    };
  }
}

/**
 * Example usage in webhook handler
 */
export async function exampleWebhookHandler(req: VercelRequest) {
  // Validate request is from Twilio
  if (!validateTwilioWebhook(req)) {
    return { status: 403, error: 'Forbidden' };
  }

  const { From, Body } = req.body as TwilioWebhookBody;

  // Handle opt-out/opt-in
  if (handleOptOut(From, Body)) {
    const response = Body.toUpperCase().includes('STOP')
      ? 'You have been unsubscribed from Phish Show Finder SMS. Reply START to resubscribe.'
      : 'Welcome back! Send a date (e.g., 7/14/23) to find a show.';

    await sendSMS(From, response);
    return { status: 200, message: 'Opt-out handled' };
  }

  // Check rate limit
  const rateLimit = checkRateLimit(From);
  if (!rateLimit.allowed) {
    await sendSMS(
      From,
      `Too many requests. Please try again in ${rateLimit.resetMinutes} minutes.`
    );
    return { status: 429, error: 'Rate limited' };
  }

  // Continue with normal processing...
  return { status: 200 };
}

/**
 * Development/testing helpers
 */
export const testing = {
  /**
   * Reset rate limit for a phone number (useful for testing)
   */
  resetRateLimit(phoneNumber: string) {
    requestLog.delete(phoneNumber);
  },

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(phoneNumber: string) {
    return checkRateLimit(phoneNumber);
  },

  /**
   * Clear all opt-outs
   */
  clearOptOuts() {
    optOutList.clear();
  }
};
