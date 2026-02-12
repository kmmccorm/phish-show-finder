# SMS Integration Implementation

This document describes the SMS integration implementation for the Phish Show Finder application.

## Overview

The SMS integration allows users to query Phish show information via text message. Users can text a date (e.g., "7/14/23") to a Twilio phone number and receive show details via SMS.

## Architecture

### Backend Structure
```
api/
├── sms/
│   └── incoming.ts              # Main webhook handler (Vercel function)
└── backend/
    ├── utils/
    │   ├── date-parser.ts       # Date parsing from SMS messages
    │   └── sms-formatter.ts     # SMS message formatting
    └── services/
        └── sms-service.ts       # Twilio integration & rate limiting
```

### Data Flow
1. User sends SMS to Twilio number
2. Twilio forwards message to `/api/sms/incoming` webhook
3. Handler validates request, parses date, fetches show data
4. Formats response and sends back via Twilio
5. User receives show information

## Setup Instructions

### 1. Install Dependencies

Dependencies have been installed:
- `twilio` - Twilio SDK for sending SMS/MMS
- `@vercel/node` - Vercel serverless function types
- `@vercel/blob` - Image storage for MMS (future)
- `puppeteer-core` & `@sparticuz/chromium` - Image generation for MMS (future)

### 2. Configure Twilio

1. Create a Twilio account at https://www.twilio.com
2. Purchase a phone number with SMS capabilities
3. Get your Account SID and Auth Token from the console
4. Add credentials to environment variables (see below)

### 3. Environment Variables

Create a `.env.local` file (or add to Vercel environment variables):

```bash
# Phish.net API (existing)
VITE_PHISH_API_KEY=your_phish_api_key

# Twilio Configuration (new)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

For Vercel deployment, add these as environment variables in your Vercel project settings.

### 4. Configure Twilio Webhook

1. In Twilio Console, go to Phone Numbers > Manage > Active Numbers
2. Click on your SMS-enabled number
3. Under "Messaging Configuration" > "A MESSAGE COMES IN":
   - Webhook: `https://your-app.vercel.app/api/sms/incoming`
   - HTTP Method: `POST`
4. Save

### 5. Deploy to Vercel

```bash
# Deploy
vercel --prod

# Or push to main branch (if auto-deployment is enabled)
git push origin main
```

## Features Implemented

### ✅ Phase 1: Core SMS Functionality

- [x] Date parsing from multiple formats (M/D/YY, YYYY-MM-DD, "yesterday")
- [x] Show data fetching using existing API client
- [x] SMS formatting with header, setlist summary, and link
- [x] Error handling with user-friendly messages
- [x] Twilio webhook validation
- [x] Rate limiting (5 requests/hour per number)
- [x] Opt-out support (STOP/START commands)

### 🚧 Phase 2: Enhanced Features (To be implemented)

- [ ] MMS support with setlist images
- [ ] Image generation using Puppeteer
- [ ] Vercel Blob storage integration
- [ ] Smart MMS detection (auto-MMS for special shows)
- [ ] Natural language date parsing ("last show", "NYE 2023")
- [ ] Full setlist on request ("MORE" command)

### 📋 Phase 3: Advanced Features (Future)

- [ ] User preferences (SMS vs MMS)
- [ ] Commands: RANDOM, SEARCH, STATS
- [ ] Location-based queries
- [ ] Song search
- [ ] Subscription notifications

## Usage Examples

### Basic Date Query
```
User: "7/14/23"
Bot:  🎸 Phish
      Friday, July 14, 2023
      📍 Merriweather Post Pavilion
      Columbia, MD
      ⭐⭐⭐⭐ 4.2/5 (127 ratings)

      Set 1:
      Wilson, Rift, Sample in a Jar... +8 more

      Set 2:
      Also Sprach Zarathustra, David Bowie... +11 more

      Encore:
      Rocky Top, Tweezer Reprise

      Reply PIC for image
      🔗 https://phish.net/setlists/...
```

### Supported Date Formats
- `7/14/23` - M/D/YY
- `7-14-2023` - M-D-YYYY
- `2023-07-14` - YYYY-MM-DD
- `yesterday` - Previous day
- `today` - Current day

### Special Commands
- `STOP` - Opt out of messages
- `START` - Opt back in
- `PIC` (future) - Request MMS with image

## Code Reuse

This implementation maximizes code reuse from the existing web application:

- ✅ `fetchShowByDate()` - API calls to Phish.net
- ✅ `transformShowData()` - Data processing
- ✅ `getUserFriendlyMessage()` - Error handling
- ✅ `formatShowDate()` - Date formatting
- ✅ All type definitions from `src/types/show.ts`

**New code**: ~400 lines across 4 files

## Security Features

- ✅ Twilio signature validation
- ✅ Rate limiting (5 req/hour per phone)
- ✅ Opt-out support (required by law)
- ✅ Environment variable secrets
- ✅ HTTPS only (enforced by Vercel)
- ✅ No PII logging

## Testing

### Local Testing (requires ngrok)

1. Start local server:
```bash
npm run dev
```

2. Expose via ngrok:
```bash
ngrok http 5173
```

3. Update Twilio webhook to ngrok URL
4. Send test SMS to your Twilio number

### Production Testing

1. Deploy to Vercel
2. Configure Twilio webhook to production URL
3. Send test SMS to Twilio number
4. Check Vercel logs: `vercel logs --follow`

## Cost Estimate

### Twilio Pricing (US, 2024)
- Incoming SMS: $0.0085/message
- Outgoing SMS: $0.0079/message
- Phone number: $1.15/month

### Example Monthly Cost (100 users, 10 queries each)
- Incoming: 1,000 × $0.0085 = $8.50
- Outgoing: 1,000 × $0.0079 = $7.90 (1 message per query)
- Phone: $1.15
- **Total**: ~$17.55/month (~$0.018/query)

### Free Tier
- Twilio: $15 trial credit
- Vercel: Free for hobby projects
- **Cost to try**: $0

## Troubleshooting

### "Invalid Twilio signature"
- Check webhook URL matches exactly (https, no trailing slash)
- Verify environment variables are set correctly
- Check Vercel logs for actual vs expected signature

### "Missing environment variables"
- Ensure variables are added to Vercel project
- Redeploy after adding environment variables
- Check variable names match exactly (case-sensitive)

### SMS not received
- Check Twilio logs: Console > Monitor > Logs > Messaging
- Verify phone number has SMS capabilities
- Check rate limiting hasn't been triggered
- Ensure user hasn't opted out (STOP)

### API errors
- Verify VITE_PHISH_API_KEY is valid
- Check Phish.net API status
- Review Vercel function logs for details

## Next Steps

1. **Test thoroughly** - Try various date formats and edge cases
2. **Add MMS support** - Implement image generation for setlists
3. **Enhance date parsing** - Add natural language support
4. **Add analytics** - Track popular shows and usage patterns
5. **User feedback** - Share with Phish community, gather feedback

## Resources

- [Twilio SMS Docs](https://www.twilio.com/docs/sms)
- [Vercel Functions](https://vercel.com/docs/functions/serverless-functions)
- [Design Documentation](/docs/sms-integration-design.md)
- [Implementation Guide](/docs/sms-implementation-guide.md)

## Support

For issues or questions:
1. Check Vercel logs: `vercel logs --follow`
2. Check Twilio logs: Console > Monitor > Logs
3. Review design docs in `/docs` directory
4. File an issue on GitHub

---

**Status**: ✅ Phase 1 Complete - Core SMS functionality ready for testing
**Next**: Phase 2 - MMS image generation implementation
