/**
 * Example: MMS Formatter and Image Generator
 * Path: /api/backend/utils/mms-formatter.ts
 *
 * Generates setlist images and formats MMS messages
 */

import { Show, Set } from '../../../src/types/show';
import { formatShowDate } from '../../../src/services/api';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface MMSMessage {
  text: string;
  mediaUrl: string;  // Publicly accessible URL to the image
  mediaType: 'image/png' | 'image/jpeg';
}

/**
 * Main function to create MMS message with setlist image
 */
export async function formatShowForMMS(
  show: Show,
  options?: {
    includeVenuePhoto?: boolean;
    imageQuality?: 'standard' | 'high';
    style?: 'classic' | 'modern' | 'vintage';
  }
): Promise<MMSMessage> {
  const {
    includeVenuePhoto = true,
    imageQuality = 'standard',
    style = 'modern'
  } = options || {};

  // Generate the setlist image
  const imageBuffer = await generateSetlistImage(show, {
    includeVenuePhoto,
    imageQuality,
    style
  });

  // Upload to temporary storage (e.g., Vercel Blob or S3)
  const mediaUrl = await uploadImage(imageBuffer);

  // Create accompanying text
  const text = formatMMSText(show);

  return {
    text,
    mediaUrl,
    mediaType: 'image/png'
  };
}

/**
 * Generate setlist image using Puppeteer (HTML to image)
 */
async function generateSetlistImage(
  show: Show,
  options: {
    includeVenuePhoto: boolean;
    imageQuality: string;
    style: string;
  }
): Promise<Buffer> {
  // Launch browser (serverless-friendly)
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const page = await browser.newPage();

  // Set viewport for consistent image size
  await page.setViewport({
    width: 1200,
    height: 1600,
    deviceScaleFactor: 2, // Retina quality
  });

  // Generate HTML content
  const html = generateSetlistHTML(show, options);

  // Load HTML into page
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // Take screenshot
  const screenshot = await page.screenshot({
    type: 'png',
    fullPage: false,
    clip: {
      x: 0,
      y: 0,
      width: 1200,
      height: 1600,
    },
  });

  await browser.close();

  return screenshot as Buffer;
}

/**
 * Generate HTML template for setlist image
 */
function generateSetlistHTML(show: Show, options: { style: string }): string {
  const { style } = options;

  // Choose color scheme based on style
  const styles = {
    modern: {
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      textColor: '#ffffff',
      accentColor: '#ffd700',
    },
    classic: {
      bg: '#1a1a1a',
      textColor: '#f0f0f0',
      accentColor: '#ff6b6b',
    },
    vintage: {
      bg: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
      textColor: '#2c3e50',
      accentColor: '#e74c3c',
    },
  };

  const theme = styles[style as keyof typeof styles] || styles.modern;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: ${theme.bg};
          color: ${theme.textColor};
          padding: 60px;
          width: 1200px;
          height: 1600px;
        }

        .header {
          text-align: center;
          margin-bottom: 50px;
          padding-bottom: 30px;
          border-bottom: 3px solid ${theme.accentColor};
        }

        .artist {
          font-size: 72px;
          font-weight: 900;
          margin-bottom: 15px;
          letter-spacing: -2px;
        }

        .date {
          font-size: 42px;
          font-weight: 600;
          opacity: 0.9;
          margin-bottom: 10px;
        }

        .venue {
          font-size: 32px;
          opacity: 0.8;
          margin-bottom: 5px;
        }

        .location {
          font-size: 28px;
          opacity: 0.7;
        }

        .rating {
          margin-top: 20px;
          font-size: 36px;
        }

        .rating .stars {
          color: ${theme.accentColor};
          margin-right: 10px;
        }

        .sets {
          margin-top: 40px;
        }

        .set {
          margin-bottom: 40px;
        }

        .set-name {
          font-size: 38px;
          font-weight: 700;
          color: ${theme.accentColor};
          margin-bottom: 20px;
          display: flex;
          align-items: center;
        }

        .set-name::before {
          content: '';
          width: 6px;
          height: 38px;
          background: ${theme.accentColor};
          margin-right: 15px;
          border-radius: 3px;
        }

        .songs {
          padding-left: 30px;
        }

        .song {
          font-size: 26px;
          line-height: 1.8;
          margin-bottom: 8px;
          display: flex;
          align-items: baseline;
        }

        .song::before {
          content: '•';
          margin-right: 12px;
          color: ${theme.accentColor};
          font-size: 32px;
        }

        .song.jam {
          font-weight: 700;
        }

        .song.jam::after {
          content: '🎸';
          margin-left: 10px;
          font-size: 24px;
        }

        .transition {
          color: ${theme.accentColor};
          font-weight: 600;
          margin: 0 8px;
        }

        .footer {
          position: fixed;
          bottom: 60px;
          left: 60px;
          right: 60px;
          text-align: center;
          font-size: 24px;
          opacity: 0.6;
        }

        .tags {
          margin-top: 30px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }

        .tag {
          background: rgba(255, 255, 255, 0.2);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="artist">${show.artist_name}</div>
        <div class="date">${formatShowDate(show.showdate)}</div>
        <div class="venue">${show.venue}</div>
        <div class="location">${show.city}, ${show.state}</div>
        ${
          show.rating && parseFloat(show.rating) > 0
            ? `<div class="rating">
                <span class="stars">${generateStars(parseFloat(show.rating))}</span>
                <span>${show.rating}/5</span>
                ${show.ratingcount ? `<span style="font-size: 24px; opacity: 0.7;"> (${show.ratingcount} ratings)</span>` : ''}
              </div>`
            : ''
        }
        ${
          show.tours && show.tours.length > 0
            ? `<div class="tags">
                ${show.tours.map(tour => `<span class="tag">${tour.name}</span>`).join('')}
              </div>`
            : ''
        }
      </div>

      <div class="sets">
        ${generateSetsHTML(show.sets || [], theme.accentColor)}
      </div>

      <div class="footer">
        🎸 phish.net | Generated via SMS
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate HTML for all sets
 */
function generateSetsHTML(sets: Set[], accentColor: string): string {
  return sets
    .map(
      (set) => `
    <div class="set">
      <div class="set-name">${set.name}</div>
      <div class="songs">
        ${set.songs
          .map((song) => {
            const jamClass = song.isjam ? 'jam' : '';
            const transition = song.transition
              ? `<span class="transition">${song.transition}</span>`
              : '';
            return `<div class="song ${jamClass}">
              <span>${song.name}</span>${transition}
            </div>`;
          })
          .join('')}
      </div>
    </div>
  `
    )
    .join('');
}

/**
 * Generate star rating visualization
 */
function generateStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    '★'.repeat(fullStars) +
    (hasHalfStar ? '⯨' : '') +
    '☆'.repeat(emptyStars)
  );
}

/**
 * Format accompanying text for MMS
 */
function formatMMSText(show: Show): string {
  const parts: string[] = [];

  parts.push(`🎸 ${show.artist_name} - ${formatShowDate(show.showdate)}`);
  parts.push(`📍 ${show.venue}, ${show.city}, ${show.state}`);

  if (show.rating && parseFloat(show.rating) > 0) {
    parts.push(`⭐ ${show.rating}/5`);
  }

  if (show.permalink) {
    parts.push(`🔗 ${show.permalink}`);
  }

  return parts.join('\n');
}

/**
 * Upload image to temporary storage
 * Returns publicly accessible URL
 */
async function uploadImage(imageBuffer: Buffer): Promise<string> {
  // Option 1: Vercel Blob Storage
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return await uploadToVercelBlob(imageBuffer);
  }

  // Option 2: AWS S3
  if (process.env.AWS_S3_BUCKET) {
    return await uploadToS3(imageBuffer);
  }

  // Fallback: Base64 data URL (not recommended for production)
  console.warn('No storage configured, using base64 (not recommended for MMS)');
  return `data:image/png;base64,${imageBuffer.toString('base64')}`;
}

/**
 * Upload to Vercel Blob Storage
 */
async function uploadToVercelBlob(imageBuffer: Buffer): Promise<string> {
  const { put } = await import('@vercel/blob');

  const filename = `setlist-${Date.now()}.png`;

  const blob = await put(filename, imageBuffer, {
    access: 'public',
    addRandomSuffix: true,
  });

  // Schedule cleanup after 24 hours
  scheduleCleanup(blob.url, 24 * 60 * 60 * 1000);

  return blob.url;
}

/**
 * Upload to AWS S3
 */
async function uploadToS3(imageBuffer: Buffer): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');

  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

  const key = `setlists/${Date.now()}.png`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/png',
      // Auto-delete after 24 hours
      Expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
  );

  // Generate signed URL (valid for 1 hour)
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command as any, { expiresIn: 3600 });

  return url;
}

/**
 * Schedule image cleanup
 */
function scheduleCleanup(url: string, delayMs: number) {
  // In production, use a job queue (e.g., Bull, AWS SQS)
  // For now, just log
  console.log(`Image ${url} scheduled for cleanup in ${delayMs}ms`);

  // Simple setTimeout for demo (won't work in serverless)
  // In production, use proper job scheduling
}

/**
 * Determine if MMS should be used for a show
 */
export function shouldUseMMS(
  show: Show,
  userMessage: string,
  userPreference?: 'sms' | 'mms' | 'auto'
): boolean {
  // Explicit request for image
  if (
    userMessage.toLowerCase().includes('pic') ||
    userMessage.toLowerCase().includes('image') ||
    userMessage.toLowerCase().includes('mms')
  ) {
    return true;
  }

  // User has MMS preference
  if (userPreference === 'mms') {
    return true;
  }

  // User explicitly wants SMS only
  if (userPreference === 'sms') {
    return false;
  }

  // Auto mode: use MMS for special shows
  if (userPreference === 'auto' || !userPreference) {
    // High-rated shows (>4.5)
    if (show.rating && parseFloat(show.rating) >= 4.5) {
      return true;
    }

    // Special events (NYE, Halloween)
    const date = new Date(show.showdate);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // New Year's Eve
    if (month === 12 && day === 31) {
      return true;
    }

    // Halloween
    if (month === 10 && day === 31) {
      return true;
    }

    // Shows with many sets (>3)
    if (show.sets && show.sets.length > 3) {
      return true;
    }
  }

  // Default to SMS
  return false;
}

/**
 * Example usage
 */
export const examples = {
  basicMMS: {
    input: { message: '7/14/23 pic', show: 'mock show data' },
    output: {
      text: '🎸 Phish - July 14, 2023\n📍 Merriweather, Columbia, MD\n⭐ 4.2/5',
      mediaUrl: 'https://blob.vercel-storage.com/setlist-123.png',
      mediaType: 'image/png',
    },
  },

  autoMMS: {
    input: { message: '12/31/23', show: 'NYE show data' },
    shouldUseMMS: true,
    reason: 'Automatically uses MMS for NYE show',
  },

  manualSMS: {
    input: { message: '7/14/23', userPreference: 'sms' },
    shouldUseMMS: false,
    reason: 'User prefers SMS only',
  },
};
