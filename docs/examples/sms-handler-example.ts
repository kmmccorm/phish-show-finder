/**
 * Example: Vercel Function - SMS Webhook Handler
 * Path: /api/sms/incoming.ts
 *
 * This would be deployed as a Vercel serverless function
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchShowByDate } from '../../src/services/shows-api';
import { getUserFriendlyMessage } from '../../src/services/api-errors';
import { parseDateFromMessage } from '../backend/utils/date-parser';
import { formatShowForSMS } from '../backend/utils/sms-formatter';
import { sendSMS, validateTwilioWebhook } from '../backend/services/sms-service';

/**
 * Main webhook handler for incoming SMS messages from Twilio
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // Extract Twilio data
    const { From: phoneNumber, Body: messageBody, MessageSid } = req.body;

    console.log(`[${MessageSid}] Received SMS from ${phoneNumber}: "${messageBody}"`);

    // Parse the date from the message
    const parseResult = parseDateFromMessage(messageBody);

    if (!parseResult.isValid) {
      // Send error message back to user
      await sendSMS(phoneNumber, parseResult.error || 'Invalid date format');
      return res.status(200).json({ status: 'error', error: parseResult.error });
    }

    console.log(`[${MessageSid}] Parsed date: ${parseResult.date}`);

    // Fetch show data using existing service
    const showResult = await fetchShowByDate(parseResult.date!);

    // Handle API errors
    if (!showResult.success || !showResult.data || showResult.data.length === 0) {
      const errorMsg = showResult.error || showResult.error_message || 'No show found for that date';
      await sendSMS(phoneNumber, errorMsg);
      return res.status(200).json({ status: 'error', error: errorMsg });
    }

    const show = showResult.data[0];
    console.log(`[${MessageSid}] Found show: ${show.showdate} at ${show.venue}`);

    // Format show data for SMS
    const messages = formatShowForSMS(show);

    console.log(`[${MessageSid}] Sending ${messages.length} SMS message(s)`);

    // Send all messages
    for (const msg of messages) {
      await sendSMS(phoneNumber, msg.text);
      // Small delay between messages to ensure order
      if (messages.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return res.status(200).json({
      status: 'success',
      messagesCount: messages.length,
      showDate: show.showdate,
      venue: show.venue
    });

  } catch (error) {
    console.error('Error handling SMS:', error);

    // Try to send user-friendly error message
    try {
      const phoneNumber = req.body.From;
      if (phoneNumber) {
        const errorMsg = getUserFriendlyMessage(error);
        await sendSMS(phoneNumber, errorMsg);
      }
    } catch (smsError) {
      console.error('Failed to send error SMS:', smsError);
    }

    return res.status(500).json({
      status: 'error',
      error: 'Internal server error'
    });
  }
}
