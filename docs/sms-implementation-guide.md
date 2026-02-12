# SMS/MMS Integration - Implementation Guide

## Quick Reference

This guide provides step-by-step instructions for implementing SMS and MMS (multimedia messaging) integration with the Phish Show Finder app.

---

## Prerequisites

- [ ] Existing Phish Show Finder app deployed
- [ ] Twilio account (free trial available)
- [ ] Vercel account (for serverless functions)
- [ ] Node.js 18+ installed locally

---

## Step 1: Set Up Twilio

### 1.1 Create Twilio Account
1. Go to https://www.twilio.com/try-twilio
2. Sign up for free trial ($15 credit)
3. Verify your email and phone number

### 1.2 Get a Phone Number
1. In Twilio Console, go to Phone Numbers > Manage > Buy a number
2. Select a number with **SMS and MMS capabilities**
3. Make sure "MMS" checkbox is enabled when searching
4. Purchase number (costs $1.15/month after trial)

### 1.3 Get API Credentials
1. In Twilio Console, go to Settings > General
2. Copy your **Account SID** and **Auth Token**
3. Save these securely - you'll need them for environment variables

---

## Step 2: Project Structure

Create the following files:

```
phish-show-finder/
├── api/
│   ├── sms/
│   │   └── incoming.ts              # Main webhook handler
│   └── backend/
│       ├── utils/
│       │   ├── date-parser.ts       # Date parsing logic
│       │   └── sms-formatter.ts     # SMS formatting
│       └── services/
│           └── sms-service.ts       # Twilio integration
├── docs/
│   ├── sms-integration-design.md    # This design doc
│   └── examples/                     # Example code
└── .env.local                        # Environment variables
```

---

## Step 3: Install Dependencies

```bash
# Install Twilio SDK
npm install twilio

# Install types for Vercel
npm install -D @vercel/node

# Install date parsing library (optional)
npm install date-fns

# MMS Support - Image Generation
npm install puppeteer-core @sparticuz/chromium

# MMS Support - Image Storage (choose one)
npm install @vercel/blob  # Option A: Vercel Blob Storage (recommended)
# OR
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner  # Option B: AWS S3
```

Update `package.json`:

```json
{
  "dependencies": {
    "twilio": "^4.19.0",
    "puppeteer-core": "^21.0.0",
    "@sparticuz/chromium": "^119.0.0",
    "@vercel/blob": "^0.15.0"
  },
  "devDependencies": {
    "@vercel/node": "^3.0.0"
  }
}
```

**Note**: Puppeteer + Chromium adds ~50MB to deployment. For lighter alternatives, consider:
- `node-canvas` (lighter but less flexible)
- `sharp` + SVG templates (fastest, more complex)
- External image generation service (e.g., Cloudinary, Imgix)

---

## Step 4: Environment Variables

Add to `.env.local`:

```bash
# Existing variables
VITE_PHISH_API_KEY=your_phish_api_key

# Twilio SMS/MMS variables
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567

# MMS Image Storage (Option A: Vercel Blob - Recommended)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxx

# OR (Option B: AWS S3)
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_S3_BUCKET=phish-show-setlists
# AWS_REGION=us-east-1

# MMS Feature Toggle (optional - defaults to enabled)
ENABLE_MMS=true
```

**Setting up Vercel Blob Storage**:
1. Go to Vercel Dashboard > Storage > Create Database
2. Select "Blob"
3. Copy the `BLOB_READ_WRITE_TOKEN`
4. Add to environment variables

**Setting up AWS S3** (alternative):
1. Create S3 bucket in AWS Console
2. Create IAM user with S3 permissions
3. Generate access keys
4. Add credentials to environment variables

**IMPORTANT**: Never commit these to git. Add to `.gitignore`:

```
.env.local
.env*.local
```

---

## Step 5: Implement Core Files

### 5.1 Create Date Parser

Copy `/docs/examples/date-parser-example.ts` to `/api/backend/utils/date-parser.ts`

Key functions:
- `parseDateFromMessage(message: string): DateParseResult`
- Supports: "7/14/23", "2023-07-14", "yesterday"

### 5.2 Create SMS Formatter

Copy `/docs/examples/sms-formatter-example.ts` to `/api/backend/utils/sms-formatter.ts`

Key functions:
- `formatShowForSMS(show: Show): SMSMessage[]`
- Handles 160-character SMS limit
- Returns array of messages (for long setlists)

### 5.3 Create SMS Service

Copy `/docs/examples/sms-service-example.ts` to `/api/backend/services/sms-service.ts`

Key functions:
- `sendSMS(to: string, body: string): Promise<void>`
- `validateTwilioWebhook(req: VercelRequest): boolean`
- `checkRateLimit(phoneNumber: string): RateLimitResult`

### 5.4 Create Webhook Handler

Copy `/docs/examples/sms-handler-example.ts` to `/api/sms/incoming.ts`

This is the main entry point that:
1. Receives SMS from Twilio
2. Parses the date
3. Calls existing API code
4. Formats response
5. Sends SMS back

---

## Step 6: Configure Vercel

### 6.1 Add Environment Variables to Vercel

```bash
# Using Vercel CLI
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_PHONE_NUMBER

# Or use Vercel Dashboard:
# Settings > Environment Variables
```

### 6.2 Deploy to Vercel

```bash
# Deploy
vercel --prod

# Note the deployment URL
# Example: https://phish-show-finder.vercel.app
```

---

## Step 7: Configure Twilio Webhook

### 7.1 Set Webhook URL

1. In Twilio Console, go to Phone Numbers > Manage > Active Numbers
2. Click on your SMS-enabled number
3. Scroll to "Messaging Configuration"
4. Under "A MESSAGE COMES IN":
   - Webhook: `https://your-app.vercel.app/api/sms/incoming`
   - HTTP Method: `POST`
5. Click Save

### 7.2 Test the Webhook

```bash
# Send a test SMS to your Twilio number
# Text: "7/14/23"

# Check Vercel logs
vercel logs --follow

# You should see:
# - "Received SMS from..."
# - "Parsed date: 2023-07-14"
# - "Found show: ..."
# - "Sending 2 SMS message(s)"
```

---

## Step 8: Testing

### 8.1 SMS Testing

Test these scenarios:

**Valid Dates (SMS)**:
- `7/14/23` → Should return text-only show summary
- `2023-12-31` → Should return NYE show (may auto-trigger MMS)
- `yesterday` → Should return yesterday's show (if any)

**Invalid Dates**:
- `invalid` → Should return error message
- `13/32/99` → Should return "invalid date" error
- `1/1/2050` → Should return "no show found"

**Edge Cases**:
- `2/30/23` → Should return "invalid date"
- Very long setlist → Should split into multiple SMS
- API timeout → Should return error message

### 8.2 MMS Testing

Test MMS-specific scenarios:

**Explicit MMS Request**:
- `7/14/23 pic` → Should send MMS with setlist image
- `7/14/23 image` → Should send MMS with setlist image
- `12/31/23 mms` → Should send MMS with NYE show image

**Auto-MMS Triggers** (if enabled):
- `12/31/23` → NYE show should auto-send MMS
- `10/31/23` → Halloween show should auto-send MMS
- High-rated show (>4.5) → Should auto-send MMS

**Image Quality Check**:
1. Verify image is properly formatted
2. Check that text is readable
3. Confirm venue/date/rating are visible
4. Ensure full setlist is shown
5. Verify image loads within 5 seconds

**Storage Verification**:
- Check that image URL is publicly accessible
- Verify image expires after 24 hours (if configured)
- Confirm no broken image links

### 8.3 Rate Limiting

Send 6 messages quickly:
- First 5 should work
- 6th should return "too many requests" error
- MMS should count as 2 requests (verify)

### 8.3 Opt-Out

Send:
- `STOP` → Should opt you out
- Another date → Should not receive response
- `START` → Should opt you back in

---

## Step 9: Monitoring & Debugging

### 9.1 View Logs

```bash
# Vercel logs
vercel logs --follow

# Twilio logs
# Go to: Console > Monitor > Logs > Messaging
```

### 9.2 Common Issues

**Issue**: "Invalid Twilio signature"
- **Fix**: Check webhook URL matches exactly (https, no trailing slash)

**Issue**: "Missing environment variables"
- **Fix**: Verify Vercel env vars are set: `vercel env ls`

**Issue**: SMS not received
- **Fix**: Check Twilio logs for delivery status

**Issue**: "Rate limit exceeded" from Phish.net
- **Fix**: Add caching to reduce API calls

---

## Step 10: Production Optimizations

### 10.1 Add Caching

```typescript
// Simple in-memory cache (for serverless, use Vercel KV or Redis)
const cache = new Map<string, { data: ShowData, timestamp: number }>();

function getCachedShow(date: string): ShowData | null {
  const cached = cache.get(date);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
    return cached.data;
  }
  return null;
}
```

### 10.2 Add Analytics

```typescript
// Track which shows are requested most
await analytics.track('sms_show_request', {
  date: parsedDate,
  phoneNumber: hashPhoneNumber(From), // Hash for privacy
  timestamp: new Date()
});
```

### 10.3 Add Error Monitoring

```bash
# Install Sentry
npm install @sentry/node

# In webhook handler
Sentry.captureException(error);
```

### 10.4 URL Shortening

```typescript
// Use bit.ly or similar to shorten phish.net URLs
const shortUrl = await bitly.shorten(show.permalink);
```

---

## Cost Estimation

### Development/Testing (First Month)
- Twilio trial credit: $15 (free)
- Vercel Hobby tier: Free
- **Total**: $0

### Production (After Trial)
- Twilio phone number: $1.15/month
- Incoming SMS: ~$0.0085/message
- Outgoing SMS: ~$0.0079/message
- Vercel (Hobby): Free

**Example**: 100 queries/month
- Incoming: 100 × $0.0085 = $0.85
- Outgoing: 200 × $0.0079 = $1.58 (avg 2 messages/query)
- Phone: $1.15
- **Total**: ~$3.58/month

---

## Code Reuse Summary

### Existing Code (No Changes Needed) ✅
- `src/services/api-client.ts` - API calls
- `src/services/shows-api.ts` - fetchShowByDate()
- `src/services/show-processor.ts` - transformShowData()
- `src/services/setlist-utils.ts` - organizeSongsIntoSets()
- `src/services/api-errors.ts` - Error handling
- `src/services/date-utils.ts` - Date formatting
- `src/types/show.ts` - Type definitions

### New Code (To Implement) 🆕
- `api/sms/incoming.ts` - Webhook handler (~100 lines)
- `api/backend/utils/date-parser.ts` - Date parsing (~150 lines)
- `api/backend/utils/sms-formatter.ts` - SMS formatting (~200 lines)
- `api/backend/services/sms-service.ts` - Twilio integration (~150 lines)

**Total new code**: ~600 lines (well-commented)

---

## Security Checklist

- [x] Validate all Twilio webhooks with signature verification
- [x] Rate limit requests (5 per hour per phone number)
- [x] Sanitize user input (date parsing)
- [x] Handle opt-out (STOP command)
- [x] Don't log phone numbers (privacy)
- [x] Use environment variables for secrets
- [x] HTTPS only (enforced by Vercel)
- [x] Handle errors gracefully (no stack traces to users)

---

## Support Commands (Future Enhancement)

Once basic functionality works, consider adding:

```
HELP          - Show available commands
RANDOM        - Get a random show
LAST          - Get the most recent show
SEARCH <song> - Find shows with a specific song
VENUE <name>  - Find shows at a venue
YEAR <YYYY>   - Get all shows from a year
STATS         - Show your usage statistics
```

Implementation would follow the same pattern:
1. Parse command in webhook handler
2. Call appropriate API function
3. Format response for SMS
4. Send back to user

---

## Troubleshooting

### Problem: SMS arrives but no response

**Check**:
1. Vercel logs: `vercel logs --follow`
2. Twilio debugger: Console > Monitor > Debugger
3. Webhook URL is correct
4. Environment variables are set

### Problem: "Invalid date" for valid dates

**Check**:
1. Date parser regex patterns
2. Console logs for parsed date
3. Time zone handling

### Problem: Response truncated

**Check**:
1. SMS length (160 char limit)
2. Chunking logic in sms-formatter
3. Message order

---

## Next Steps After Implementation

1. **Beta Test**: Share with 5-10 friends
2. **Gather Feedback**: What features do they want?
3. **Monitor Costs**: Track Twilio usage
4. **Add Features**: Natural language, commands, etc.
5. **Marketing**: Share on r/phish, phantasytour.com

---

## Resources

- [Twilio SMS Quickstart](https://www.twilio.com/docs/sms/quickstart)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Phish.net API Docs](https://phish.net/api)
- Design Document: `/docs/sms-integration-design.md`
- Example Code: `/docs/examples/`

---

## Questions?

Common questions answered in the main design doc:
- Why Vercel? → Simplest deployment, free tier
- Why not AWS? → More complex setup
- Can I use a different SMS provider? → Yes, same architecture
- How do I handle MMS? → Similar to SMS, check Twilio docs
- What about WhatsApp? → Twilio supports it with minor changes
