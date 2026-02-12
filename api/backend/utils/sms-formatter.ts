/**
 * SMS Formatter Utility
 * Formats show data for SMS delivery
 */

import type { Show, Set } from '../../../src/types/show';
import { formatShowDate } from '../../../src/services/date-utils';

export interface SMSMessage {
  text: string;
  order: number;
}

const MAX_SMS_LENGTH = 160;

/**
 * Format show data as SMS-friendly text message(s)
 * Returns array of messages to send in sequence
 */
export function formatShowForSMS(
  show: Show,
  options?: {
    fullSetlist?: boolean;
    maxMessages?: number;
  }
): SMSMessage[] {
  const { fullSetlist = false, maxMessages = 3 } = options || {};

  const messages: SMSMessage[] = [];

  // Message 1: Header + Summary
  const header = formatHeader(show);
  const summary = formatSetSummary(show.sets || []);
  const footer = getFooter(show);

  const firstMessage = `${header}\n\n${summary}\n\n${footer}`.trim();

  messages.push({
    order: 1,
    text: firstMessage,
  });

  // Additional messages: Full setlist (if requested)
  if (fullSetlist && show.sets && show.sets.length > 0) {
    const setlistMessages = formatFullSetlist(show.sets, maxMessages - 1);
    setlistMessages.forEach((msg, idx) => {
      messages.push({
        order: idx + 2,
        text: msg,
      });
    });
  }

  return messages;
}

/**
 * Format the show header (venue, date, rating)
 */
function formatHeader(show: Show): string {
  const parts: string[] = [];

  // Artist and date
  const formattedDate = formatShowDate(show.showdate);
  parts.push(`🎸 ${show.artist_name}`);
  parts.push(formattedDate);

  // Location
  parts.push(`📍 ${show.venue}`);
  parts.push(`${show.city}, ${show.state}`);

  // Rating (if available)
  if (show.rating && parseFloat(show.rating) > 0) {
    const stars = '⭐'.repeat(Math.round(parseFloat(show.rating)));
    parts.push(`${stars} ${show.rating}/5`);
    if (show.ratingcount) {
      parts[parts.length - 1] += ` (${show.ratingcount} ratings)`;
    }
  }

  return parts.join('\n');
}

/**
 * Format sets as a summary (first 3 songs + count)
 */
function formatSetSummary(sets: Set[]): string {
  if (!sets || sets.length === 0) {
    return '❌ No setlist available';
  }

  return sets
    .map((set) => {
      if (!set.songs || set.songs.length === 0) {
        return `${set.name}: (empty)`;
      }

      const firstThree = set.songs
        .slice(0, 3)
        .map((s) => s.name)
        .join(', ');

      const remaining = set.songs.length - 3;
      const suffix = remaining > 0 ? `... +${remaining} more` : '';

      return `${set.name}:\n${firstThree}${suffix}`;
    })
    .join('\n\n');
}

/**
 * Format full setlist across multiple messages
 */
function formatFullSetlist(sets: Set[], maxMessages: number): string[] {
  const messages: string[] = [];

  // Build complete setlist text
  const fullText = sets
    .map((set) => {
      const songList = set.songs
        .map((song) => {
          let text = `• ${song.name}`;

          // Add transition marker
          if (song.transition && song.transition.trim()) {
            text += ` ${song.transition.trim()}`;
          }

          // Add jam indicator
          if (song.isjam) {
            text += ' 🎸';
          }

          return text;
        })
        .join('\n');

      return `${set.name}:\n${songList}`;
    })
    .join('\n\n');

  // Chunk into multiple messages (simple approach - split at reasonable boundaries)
  const chunks = chunkText(fullText, 140); // Leave room for [2/3] prefix

  // Limit to maxMessages
  const limitedChunks = chunks.slice(0, maxMessages);
  const totalMessages = limitedChunks.length;

  limitedChunks.forEach((chunk, idx) => {
    const prefix = `[${idx + 2}/${totalMessages + 1}]\n`;
    messages.push(prefix + chunk);
  });

  return messages;
}

/**
 * Get footer with link
 */
function getFooter(show: Show): string {
  const parts: string[] = [];

  parts.push('Reply PIC for image');

  if (show.permalink) {
    parts.push(`🔗 ${show.permalink}`);
  }

  return parts.join('\n');
}

/**
 * Split text into chunks at natural boundaries (newlines)
 */
function chunkText(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  const lines = text.split('\n');

  let currentChunk = '';

  for (const line of lines) {
    const testChunk = currentChunk + (currentChunk ? '\n' : '') + line;

    if (testChunk.length <= maxLength) {
      currentChunk = testChunk;
    } else {
      // Current chunk is full, save it
      if (currentChunk) {
        chunks.push(currentChunk);
      }

      // If single line is too long, split it
      if (line.length > maxLength) {
        const subChunks = splitLongLine(line, maxLength);
        chunks.push(...subChunks.slice(0, -1));
        currentChunk = subChunks[subChunks.length - 1];
      } else {
        currentChunk = line;
      }
    }
  }

  // Add final chunk
  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Split a single long line into multiple chunks
 */
function splitLongLine(line: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = line;

  while (remaining.length > maxLength) {
    // Try to split at word boundary
    let splitPoint = remaining.lastIndexOf(' ', maxLength);
    if (splitPoint === -1 || splitPoint < maxLength * 0.7) {
      splitPoint = maxLength;
    }

    chunks.push(remaining.substring(0, splitPoint).trim());
    remaining = remaining.substring(splitPoint).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}
