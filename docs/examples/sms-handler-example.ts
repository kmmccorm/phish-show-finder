/**
 * Example: Complete SMS/MMS Webhook Handler
 * Path: /api/sms/incoming.ts
 *
 * Main entry point for Twilio webhooks
 * Handles both SMS and MMS requests
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchShowByDate } from '../../../src/services/shows-api';
import { getUserFriendlyMessage } from '../../../src/services/api-errors';
import { parseDateFromMessage } from '../backend/utils/date-parser';
import { formatShowForSMS } from '../backend/utils/sms-formatter';
import { formatShowForMMS, shouldUseMMS } from '../backend/utils/mms-formatter';
import {
  validateTwilioWebhook,
  sendMessage,
  handleOptOut,
  isOptedOut,
  checkRateLimit,
  TwilioWebhookBody,
} from '../backend/services/sms-service';

/**
 * Main webhook handler
 * Receives POST requests from Twilio when a message is received
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request is from Twilio
    if (!validateTwilioWebhook(req)) {
      console.error('Invalid Twilio signature');
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { From, Body } = req.body as TwilioWebhookBody;

    console.log(`Received message from ${From}: ${Body}`);

    // Handle opt-out/opt-in
    if (handleOptOut(From, Body)) {
      const response = Body.toUpperCase().includes('STOP')
        ? 'You have been unsubscribed from Phish Show Finder. Reply START to resubscribe.'
        : 'Welcome back! Send a date (e.g., 7/14/23) to find a show. Reply "7/14/23 pic" for an image.';

      await sendMessage(From, response);
      return res.status(200).json({ message: 'Opt-out handled' });
    }

    // Check if user is opted out
    if (isOptedOut(From)) {
      console.log(`User ${From} is opted out, not sending message`);
      return res.status(200).json({ message: 'User opted out' });
    }

    // Check rate limit
    const rateLimit = checkRateLimit(From);
    if (!rateLimit.allowed) {
      await sendMessage(
        From,
        `Too many requests. Please try again in ${rateLimit.resetMinutes} minutes.`
      );
      return res.status(429).json({ error: 'Rate limited' });
    }

    // Parse the date from the message
    const dateResult = parseDateFromMessage(Body);

    if (!dateResult.isValid) {
      await sendMessage(From, dateResult.error || 'Invalid input');
      return res.status(200).json({ message: 'Invalid date sent to user' });
    }

    // Fetch show data
    console.log(`Fetching show for date: ${dateResult.date}`);
    const result = await fetchShowByDate(dateResult.date!);

    // Handle errors
    if (!result.success || !result.data || result.data.length === 0) {
      const errorMsg = result.error || `No show found for ${dateResult.date}`;
      await sendMessage(From, errorMsg);
      return res.status(200).json({ message: 'No show found' });
    }

    const show = result.data[0];

    // Determine if we should send MMS or SMS
    const useMMS = process.env.ENABLE_MMS !== 'false' && shouldUseMMS(show, Body);

    if (useMMS) {
      // Generate and send MMS
      console.log(`Generating MMS for show: ${show.showdate}`);

      try {
        const mmsMessage = await formatShowForMMS(show, {
          style: 'modern',
          imageQuality: 'standard',
        });

        await sendMessage(From, mmsMessage.text, mmsMessage.mediaUrl);

        console.log(`MMS sent successfully to ${From}`);
        return res.status(200).json({
          message: 'MMS sent',
          showdate: show.showdate,
          venue: show.venue,
        });
      } catch (error) {
        // If MMS generation fails, fallback to SMS
        console.error('MMS generation failed, falling back to SMS:', error);
        // Continue to SMS flow below
      }
    }

    // Send SMS (either by default or as MMS fallback)
    console.log(`Generating SMS for show: ${show.showdate}`);

    const smsMessages = formatShowForSMS(show, {
      fullSetlist: false, // Summary only by default
      maxMessages: 2,
    });

    // Send all messages
    for (const msg of smsMessages) {
      await sendMessage(From, msg.text);
    }

    console.log(`Sent ${smsMessages.length} SMS message(s) to ${From}`);

    return res.status(200).json({
      message: 'SMS sent',
      messageCount: smsMessages.length,
      showdate: show.showdate,
      venue: show.venue,
    });
  } catch (error) {
    console.error('Error handling webhook:', error);

    // Try to send error message to user
    try {
      const { From } = req.body as TwilioWebhookBody;
      if (From) {
        const errorMsg = getUserFriendlyMessage(error);
        await sendMessage(From, errorMsg);
      }
    } catch (sendError) {
      console.error('Failed to send error message to user:', sendError);
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Optional: Handle GET requests for health checks
 */
export function handleHealthCheck(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Phish Show Finder SMS/MMS',
      features: {
        sms: true,
        mms: process.env.ENABLE_MMS !== 'false',
      },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Example usage and test data
 */
export const examples = {
  validRequests: [
    {
      from: '+15551234567',
      body: '7/14/23',
      expectedResponse: 'SMS with show summary',
    },
    {
      from: '+15551234567',
      body: '7/14/23 pic',
      expectedResponse: 'MMS with setlist image',
    },
    {
      from: '+15551234567',
      body: '12/31/23',
      expectedResponse: 'Auto-MMS for NYE show',
    },
  ],

  errorCases: [
    {
      from: '+15551234567',
      body: 'invalid',
      expectedResponse: 'Error: Invalid date format',
    },
    {
      from: '+15551234567',
      body: '1/1/2050',
      expectedResponse: 'Error: No show found',
    },
  ],

  specialCommands: [
    {
      from: '+15551234567',
      body: 'STOP',
      expectedResponse: 'Opt-out confirmation',
    },
    {
      from: '+15551234567',
      body: 'START',
      expectedResponse: 'Opt-in confirmation',
    },
  ],
};

/**
 * Configuration options
 */
export const config = {
  api: {
    bodyParser: true, // Vercel parses the body automatically
  },
};
