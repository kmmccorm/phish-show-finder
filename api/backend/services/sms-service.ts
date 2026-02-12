/**
 * SMS/MMS Service (Twilio Integration)
 * Handles sending SMS and MMS messages and validating Twilio webhooks
 */

import twilio from 'twilio';
import type { VercelRequest } from '@vercel/node';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error('Missing Twilio environment variables');
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

/**
 * Send an SMS message (text only)
 */
export async function sendSMS(to: string, body: string): Promise<void> {
  if (!client || !twilioPhoneNumber) {
    throw new Error('Twilio client not initialized. Check environment variables.');
  }

  try {
    console.log(`Sending SMS to ${to}: ${body.substring(0, 50)}...`);

    const message = await client.messages.create({
      body,
      from: twilioPhoneNumber,
      to,
    });

    console.log(`SMS sent successfully. SID: ${message.sid}`);
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw new Error(
      `SMS delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
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
  if (!client || !twilioPhoneNumber) {
    throw new Error('Twilio client not initialized. Check environment variables.');
  }

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
    throw new Error(
      `MMS delivery failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
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
  if (!authToken) {
    console.error('Cannot validate webhook: missing auth token');
    return false;
  }

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
    const isValid = twilio.validateRequest(authToken, twilioSignature, url, req.body);

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

export function checkRateLimit(
  phoneNumber: string,
  maxRequests = 5,
  windowMinutes = 60
): {
  allowed: boolean;
  remaining: number;
  resetMinutes: number;
} {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  // Get or create request log for this number
  const requests = requestLog.get(phoneNumber) || [];

  // Filter to only recent requests within the time window
  const recentRequests = requests.filter((timestamp) => now - timestamp < windowMs);

  // Check if limit exceeded
  if (recentRequests.length >= maxRequests) {
    const oldestRequest = Math.min(...recentRequests);
    const resetMinutes = Math.ceil((oldestRequest + windowMs - now) / (60 * 1000));

    return {
      allowed: false,
      remaining: 0,
      resetMinutes,
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
    resetMinutes: windowMinutes,
  };
}

/**
 * Clean up old rate limit entries
 */
function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [phoneNumber, requests] of requestLog.entries()) {
    const recentRequests = requests.filter((timestamp) => now - timestamp < maxAge);

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
