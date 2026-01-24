/**
 * Example: SMS Formatter Utility
 * Path: /api/backend/utils/sms-formatter.ts
 *
 * Formats show data for SMS delivery
 */

import { Show, Set } from '../../../src/types/show';
import { formatShowDate } from '../../../src/services/api';

export interface SMSMessage {
  text: string;
  order: number;
}

const MAX_SMS_LENGTH = 160;
const MESSAGE_PREFIX_LENGTH = 10; // "[1/3] " + buffer

/**
 * Format show data as SMS-friendly text message(s)
 * Returns array of messages to send in sequence
 */
export function formatShowForSMS(show: Show, options?: {
  fullSetlist?: boolean;
  maxMessages?: number;
}): SMSMessage[] {
  const { fullSetlist = true, maxMessages = 5 } = options || {};

  const messages: SMSMessage[] = [];

  // Message 1: Header + Summary
  const header = formatHeader(show);
  const summary = formatSetSummary(show.sets || []);

  const firstMessage = `${header}\n\n${summary}\n\n${getFooter(show, fullSetlist)}`.trim();

  messages.push({
    order: 1,
    text: truncateToSMS(firstMessage)
  });

  // Additional messages: Full setlist (if requested and available)
  if (fullSetlist && show.sets && show.sets.length > 0) {
    const setlistMessages = formatFullSetlist(show.sets, maxMessages - 1);
    setlistMessages.forEach((msg, idx) => {
      messages.push({
        order: idx + 2,
        text: msg
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
  parts.push(`🎸 ${show.artist_name} ${formatShowDate(show.showdate)}`);

  // Location
  parts.push(`📍 ${show.venue}, ${show.city}, ${show.state}`);

  // Rating (if available)
  if (show.rating && parseFloat(show.rating) > 0) {
    parts.push(`⭐ ${show.rating}/5 (${show.ratingcount || 0} ratings)`);
  }

  // Tour (if available)
  if (show.tours && show.tours.length > 0) {
    parts.push(`🎫 ${show.tours[0].name}`);
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

  return sets.map(set => {
    if (!set.songs || set.songs.length === 0) {
      return `${set.name}: (empty)`;
    }

    const firstThree = set.songs
      .slice(0, 3)
      .map(s => formatSongName(s.name))
      .join(', ');

    const remaining = set.songs.length - 3;
    const suffix = remaining > 0 ? `... +${remaining} more` : '';

    return `${set.name}:\n${firstThree}${suffix}`;
  }).join('\n\n');
}

/**
 * Format full setlist across multiple messages
 */
function formatFullSetlist(sets: Set[], maxMessages: number): string[] {
  const messages: string[] = [];

  // Build complete setlist text
  const fullText = sets.map(set => {
    const songList = set.songs.map(song => {
      let text = `• ${formatSongName(song.name)}`;

      // Add transition marker
      if (song.transition && song.transition.trim()) {
        const transition = song.transition.trim();
        text += transition === ',' ? ',' : ` ${transition}`;
      }

      // Add jam indicator
      if (song.isjam) {
        text += ' 🎸';
      }

      // Add footnote (truncate if too long)
      if (song.footnote) {
        const footnote = song.footnote.length > 30
          ? song.footnote.substring(0, 27) + '...'
          : song.footnote;
        text += ` (${footnote})`;
      }

      return text;
    }).join('\n');

    return `${set.name}:\n${songList}`;
  }).join('\n\n');

  // Chunk into multiple messages
  const chunks = chunkText(fullText, MAX_SMS_LENGTH - MESSAGE_PREFIX_LENGTH);

  // Limit to maxMessages
  const limitedChunks = chunks.slice(0, maxMessages);
  const totalMessages = limitedChunks.length;

  limitedChunks.forEach((chunk, idx) => {
    const prefix = `[${idx + 2}/${totalMessages + 1}] SETLIST\n`;
    messages.push(prefix + chunk);
  });

  // If we truncated, add indicator
  if (chunks.length > maxMessages) {
    messages[messages.length - 1] += '\n\n(truncated - see phish.net for full setlist)';
  }

  return messages;
}

/**
 * Format song name (shorten common long names)
 */
function formatSongName(name: string): string {
  // Truncate very long names
  if (name.length > 40) {
    return name.substring(0, 37) + '...';
  }

  // Common abbreviations for SMS
  const abbreviations: Record<string, string> = {
    'Also Sprach Zarathustra': 'Also Sprach',
    'You Enjoy Myself': 'YEM',
    'Bouncing Around the Room': 'Bouncing',
    'Split Open and Melt': 'Split Open',
    'Run Like an Antelope': 'Antelope',
  };

  return abbreviations[name] || name;
}

/**
 * Get footer with link
 */
function getFooter(show: Show, hasFullSetlist: boolean): string {
  const parts: string[] = [];

  if (!hasFullSetlist) {
    parts.push('Reply MORE for full setlist');
  }

  if (show.permalink) {
    // Shorten URL if possible (in production, use a URL shortener)
    parts.push(`🔗 ${show.permalink}`);
  }

  return parts.join('\n');
}

/**
 * Truncate text to fit in a single SMS
 */
function truncateToSMS(text: string, maxLength = MAX_SMS_LENGTH): string {
  if (text.length <= maxLength) {
    return text;
  }

  // Try to truncate at a word boundary
  const truncated = text.substring(0, maxLength - 3);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.8) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
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

/**
 * Example usage and expected outputs
 */
export const examples = {
  summary: {
    input: 'Show with 20 songs',
    output: `🎸 Phish 7/14/23
📍 Merriweather, Columbia, MD
⭐ 4.2/5 (127 ratings)

Set 1:
Wilson, Rift, Sample... +8 more

Set 2:
Also Sprach, Bowie... +11 more

Encore:
Rocky Top

🔗 https://phish.net/...`
  },

  fullSetlist: {
    messages: 3,
    output: `[2/3] SETLIST
Set 1:
• Wilson
• Rift >
• Sample in a Jar
...

[3/3] SETLIST
Encore:
• Rocky Top
• Tweezer Reprise 🎸`
  }
};
