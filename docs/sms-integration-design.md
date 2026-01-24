# SMS Integration Design for Phish Show Finder

## Overview
Design for adding SMS/text message capability to trigger Phish.net API calls and receive formatted show information via text message.

## Design Goals
- Leverage existing API client and data processing code
- Minimal code duplication
- Handle SMS-specific constraints (160 char limit, no rich formatting)
- Support natural language date parsing
- Graceful error handling via SMS
- Cost-effective (minimize SMS message count)

---

## Architecture Options

### Option A: Serverless Functions (Recommended)
**Stack**: Vercel Functions + Twilio + Shared TypeScript modules

**Pros**:
- No server management
- Auto-scaling
- Free tier covers most use cases
- Same TypeScript codebase as frontend
- Easy deployment alongside existing app

**Cons**:
- Cold start latency (2-3 seconds)
- Vendor lock-in

### Option B: Node.js Backend
**Stack**: Express + Twilio + Shared TypeScript modules

**Pros**:
- Full control
- Can add WebSocket/real-time features later
- Better for high volume

**Cons**:
- Server maintenance
- Deployment complexity
- Costs more for low usage

### Option C: AWS Lambda + API Gateway
**Stack**: Lambda + SNS/Twilio + Shared TypeScript modules

**Pros**:
- Enterprise-grade scaling
- Integration with AWS ecosystem
- Pay per use

**Cons**:
- More complex setup
- AWS learning curve

**Recommendation**: Start with **Option A** (Vercel Functions) for simplicity and cost.

---

## System Architecture

```
┌─────────────┐
│   User      │
│   Phone     │
└──────┬──────┘
       │ SMS: "7/14/23"
       ▼
┌─────────────────────┐
│   Twilio API        │
│   (SMS Gateway)     │
└──────┬──────────────┘
       │ Webhook POST
       ▼
┌─────────────────────────────────────┐
│  Backend Service (Vercel Function)  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  SMS Handler                 │  │
│  │  - Parse incoming message    │  │
│  │  - Extract date              │  │
│  │  - Validate input            │  │
│  └────────┬─────────────────────┘  │
│           │                         │
│  ┌────────▼─────────────────────┐  │
│  │  Reused Modules:             │  │
│  │  - fetchShowByDate()         │  │
│  │  - transformShowData()       │  │
│  │  - Error handling            │  │
│  └────────┬─────────────────────┘  │
│           │                         │
│  ┌────────▼─────────────────────┐  │
│  │  SMS Formatter               │  │
│  │  - Format show as text       │  │
│  │  - Handle pagination         │  │
│  │  - Truncate/summarize        │  │
│  └────────┬─────────────────────┘  │
│           │                         │
└───────────┼─────────────────────────┘
            │ Response
            ▼
┌─────────────────────┐
│   Twilio API        │
│   (Send SMS)        │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│   User      │
│   Phone     │
└─────────────┘
```

---

## Data Flow

### 1. Incoming SMS
```
User → Twilio → POST /api/sms/incoming
Body: {
  From: "+15551234567",
  Body: "7/14/23",
  MessageSid: "SM...",
  AccountSid: "AC..."
}
```

### 2. Processing Pipeline
```typescript
parseMessage(body)
  → validateDate(parsed)
  → fetchShowByDate(date)        // REUSED
  → transformShowData(rawData)   // REUSED
  → formatShowForSMS(show)       // NEW
  → sendSMS(to, text)
```

### 3. Response Delivery
```
Backend → Twilio API → User receives 1-3 SMS messages
```

---

## Component Design

### 1. SMS Handler (`/api/sms/incoming.ts`)

```typescript
import { fetchShowByDate } from '@/services/shows-api';
import { getUserFriendlyMessage } from '@/services/api-errors';

export async function handleIncomingSMS(req: TwilioWebhookRequest) {
  const { From: phoneNumber, Body: message } = req.body;

  try {
    // Parse date from message
    const dateInput = parseDateFromMessage(message);

    // Validate
    if (!dateInput.isValid) {
      return sendSMS(phoneNumber, dateInput.error);
    }

    // Fetch show (reuse existing code)
    const result = await fetchShowByDate(dateInput.date);

    if (!result.success || !result.data?.[0]) {
      const errorMsg = result.error || "No show found for that date";
      return sendSMS(phoneNumber, errorMsg);
    }

    // Format for SMS
    const messages = formatShowForSMS(result.data[0]);

    // Send (may be multiple messages for long setlists)
    for (const msg of messages) {
      await sendSMS(phoneNumber, msg);
    }

    return { status: 'success' };

  } catch (error) {
    const errorMsg = getUserFriendlyMessage(error); // REUSED
    await sendSMS(phoneNumber, errorMsg);
    return { status: 'error', error: errorMsg };
  }
}
```

### 2. Date Parser (`/backend/utils/date-parser.ts`)

**Supported Formats**:
- `7/14/23` → 2023-07-14
- `7-14-2023` → 2023-07-14
- `2023-07-14` → 2023-07-14
- `July 14, 2023` → 2023-07-14
- `yesterday` → [current date - 1]
- `last show` → Query API for most recent

```typescript
interface DateParseResult {
  isValid: boolean;
  date?: string; // YYYY-MM-DD
  error?: string;
}

export function parseDateFromMessage(message: string): DateParseResult {
  const cleaned = message.trim().toLowerCase();

  // Handle special cases
  if (cleaned === 'yesterday') {
    return { isValid: true, date: getYesterday() };
  }

  // Try various date formats
  const patterns = [
    /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/,  // M/D/YY or M-D-YYYY
    /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/,    // YYYY-M-D
    // Add regex for natural language dates
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return parseAndValidate(match);
    }
  }

  return {
    isValid: false,
    error: "Invalid date. Try: 7/14/23 or 2023-07-14"
  };
}
```

### 3. SMS Formatter (`/backend/utils/sms-formatter.ts`)

**Output Format**:
```
🎸 Phish 7/14/23
📍 Merriweather, Columbia, MD
⭐ 4.2 (127 ratings)

Set 1:
Wilson, Rift, Sample in a Jar, Horn...

[1/3] Reply MORE for full setlist
```

**Implementation**:
```typescript
interface SMSMessage {
  text: string;
  order: number;
}

export function formatShowForSMS(show: Show): SMSMessage[] {
  const messages: SMSMessage[] = [];

  // Message 1: Header + Summary
  const header = formatHeader(show);
  const summary = formatSetSummary(show.sets);

  messages.push({
    order: 1,
    text: `${header}\n\n${summary}\n\n[1/2] Reply with MORE for full setlist\nView: ${show.permalink}`
  });

  // Message 2+: Full setlist (if needed)
  if (show.sets && show.sets.length > 0) {
    const fullSetlist = formatFullSetlist(show.sets);

    // Chunk into 160-char segments
    const chunks = chunkText(fullSetlist, 140); // Leave room for [2/3] prefix

    chunks.forEach((chunk, idx) => {
      messages.push({
        order: idx + 2,
        text: `[${idx + 2}/${chunks.length + 1}]\n${chunk}`
      });
    });
  }

  return messages;
}

function formatHeader(show: Show): string {
  const parts = [
    `🎸 ${show.artist_name} ${formatShowDate(show.showdate)}`,
    `📍 ${show.venue}, ${show.city}, ${show.state}`
  ];

  if (show.rating) {
    parts.push(`⭐ ${show.rating}/5 (${show.ratingcount} ratings)`);
  }

  return parts.join('\n');
}

function formatSetSummary(sets?: Set[]): string {
  if (!sets || sets.length === 0) return "No setlist available";

  return sets.map(set => {
    const firstThree = set.songs.slice(0, 3).map(s => s.name).join(', ');
    const remaining = set.songs.length - 3;
    return `${set.name}:\n${firstThree}${remaining > 0 ? `... +${remaining} more` : ''}`;
  }).join('\n\n');
}

function formatFullSetlist(sets: Set[]): string {
  return sets.map(set => {
    const songList = set.songs.map(s => {
      let text = `• ${s.name}`;
      if (s.transition) text += ` ${s.transition}`;
      return text;
    }).join('\n');

    return `${set.name}:\n${songList}`;
  }).join('\n\n');
}

function chunkText(text: string, maxLength: number): string[] {
  // Split intelligently at newlines when possible
  const chunks: string[] = [];
  let current = '';

  const lines = text.split('\n');

  for (const line of lines) {
    if ((current + line).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }

  if (current) chunks.push(current.trim());

  return chunks;
}
```

### 4. SMS Service (`/backend/services/sms-service.ts`)

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function sendSMS(to: string, body: string): Promise<void> {
  try {
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw error;
  }
}

export function validateTwilioWebhook(req: Request): boolean {
  // Verify request is from Twilio using signature validation
  const twilioSignature = req.headers['x-twilio-signature'];
  const url = `https://${req.headers.host}${req.url}`;

  return twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );
}
```

---

## Code Reuse Strategy

### Shared Modules (No Changes Needed)
```
src/services/
├── api-client.ts          ✅ Import directly
├── shows-api.ts           ✅ Import directly
├── show-processor.ts      ✅ Import directly
├── setlist-utils.ts       ✅ Import directly
├── api-errors.ts          ✅ Import directly
└── date-utils.ts          ✅ Import directly
```

### New Backend Modules
```
api/sms/
├── incoming.ts            # Vercel function (webhook endpoint)
└── backend/
    ├── utils/
    │   ├── date-parser.ts      # NEW: Parse dates from text
    │   └── sms-formatter.ts    # NEW: Format show data for SMS
    └── services/
        └── sms-service.ts      # NEW: Twilio integration
```

### Configuration
```
.env.local (add):
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1555...
```

---

## SMS Constraints & Solutions

### 1. Character Limit (160 chars/SMS)
**Solution**: Multi-message strategy
- Message 1: Summary (header + first 3 songs per set)
- Message 2+: Full setlist (on request or auto-send)

### 2. No Rich Formatting
**Solution**: Use unicode symbols
- 🎸 Artist
- 📍 Location
- ⭐ Rating
- • Bullet points
- `>` Transition markers

### 3. Costs (Twilio pricing: ~$0.0079/SMS)
**Solution**:
- Smart truncation (send summary by default)
- "Reply MORE" for full details
- Cache recent queries to avoid duplicate API calls

### 4. Rate Limiting
**Solution**:
- Track requests per phone number
- Max 5 requests per hour per number
- Return error: "Too many requests. Try again in X minutes"

---

## User Interaction Flows

### Flow 1: Basic Date Query
```
User: "7/14/23"
Bot:  "🎸 Phish 7/14/23
      📍 Merriweather, Columbia, MD
      ⭐ 4.2 (127 ratings)

      Set 1:
      Wilson, Rift, Sample... +8 more

      Set 2:
      Also Sprach > David Bowie... +11 more

      Encore:
      Rocky Top, Tweezer Reprise

      View: https://phish.net/..."
```

### Flow 2: Invalid Date
```
User: "asdfgh"
Bot:  "Invalid date. Try: 7/14/23 or 2023-07-14"
```

### Flow 3: No Show Found
```
User: "1/1/2025"
Bot:  "No Phish show was found on 2025-01-01. Try selecting a different date."
```

### Flow 4: API Error
```
User: "7/14/23"
Bot:  "Unable to connect to Phish.net. Please try again in a moment."
```

### Flow 5: Natural Language (Future Enhancement)
```
User: "last show"
Bot:  [Returns most recent Phish show]

User: "NYE 2023"
Bot:  [Returns 12/31/2023 show]
```

---

## Error Handling

All errors leverage existing `api-errors.ts`:

```typescript
try {
  const result = await fetchShowByDate(date);
  // ... format and send
} catch (error) {
  // Reuse existing error handling
  const userMessage = getUserFriendlyMessage(error);
  await sendSMS(phoneNumber, userMessage);
}
```

**Error Messages** (already defined in api-errors.ts):
- NetworkError → "Unable to connect to Phish.net..."
- TimeoutError → "Request taking too long..."
- RateLimitError → "Too many requests..."
- NoShowFoundError → "No Phish show found on {date}..."
- InvalidDateError → "Invalid date format..."

---

## Implementation Phases

### Phase 1: MVP (Core Functionality)
- [ ] Vercel function setup
- [ ] Twilio integration
- [ ] Basic date parsing (M/D/YY format only)
- [ ] Simple SMS formatter (summary only)
- [ ] Error handling
- [ ] Security (webhook validation)

**Estimated effort**: 1-2 days

### Phase 2: Enhanced UX
- [ ] Multi-message support
- [ ] Natural language date parsing
- [ ] "MORE" command for full setlist
- [ ] Rate limiting per phone number
- [ ] Request caching

**Estimated effort**: 1 day

### Phase 3: Advanced Features
- [ ] "LAST SHOW" command
- [ ] "RANDOM" command (random show)
- [ ] Location-based queries ("shows in Colorado")
- [ ] Setlist search ("shows with YEM")
- [ ] User preferences (SMS vs MMS for images)

**Estimated effort**: 2-3 days

---

## Testing Strategy

### Unit Tests
```typescript
describe('parseDateFromMessage', () => {
  it('should parse M/D/YY format', () => {
    expect(parseDateFromMessage('7/14/23')).toEqual({
      isValid: true,
      date: '2023-07-14'
    });
  });

  it('should handle invalid input', () => {
    expect(parseDateFromMessage('invalid')).toMatchObject({
      isValid: false,
      error: expect.stringContaining('Invalid date')
    });
  });
});

describe('formatShowForSMS', () => {
  it('should format show within character limits', () => {
    const messages = formatShowForSMS(mockShow);
    messages.forEach(msg => {
      expect(msg.text.length).toBeLessThanOrEqual(160);
    });
  });
});
```

### Integration Tests
- Mock Twilio webhooks
- Test full request/response cycle
- Validate error scenarios

### Manual Testing
- Test with real phone number
- Various date formats
- Edge cases (no show, API errors)
- Character limit boundaries

---

## Security Considerations

1. **Webhook Validation**
   - Verify all requests come from Twilio using signature validation
   - Reject invalid requests immediately

2. **Rate Limiting**
   - Prevent abuse (max 5 req/hour per number)
   - Store in Redis or in-memory cache

3. **PII Protection**
   - Don't log phone numbers
   - Comply with SMS consent laws
   - Provide opt-out mechanism ("Reply STOP")

4. **API Key Security**
   - Keep Twilio credentials in environment variables
   - Use separate Twilio account for dev/prod

---

## Cost Analysis

### Twilio Pricing (US, Jan 2024)
- Incoming SMS: $0.0085/message
- Outgoing SMS: $0.0079/message
- Phone number: $1.15/month

### Monthly Cost Estimate (100 users, 10 queries/user/month)
- Incoming: 1,000 × $0.0085 = $8.50
- Outgoing: 2,000 × $0.0079 = $15.80 (avg 2 messages per query)
- Phone: $1.15
- **Total**: ~$25.45/month

### Vercel Pricing
- Hobby tier: Free (100GB bandwidth, 100 hours compute)
- Should be sufficient for moderate usage

---

## Deployment Checklist

- [ ] Create Twilio account
- [ ] Purchase phone number
- [ ] Set up environment variables
- [ ] Deploy Vercel function
- [ ] Configure Twilio webhook URL
- [ ] Test with personal phone
- [ ] Set up error monitoring (Sentry)
- [ ] Document user commands
- [ ] Add analytics tracking

---

## Future Enhancements

1. **MMS Support**: Send images (venue photos, setlist screenshots)
2. **Two-way Commands**: "MORE", "STATS", "RANDOM", "SEARCH <song>"
3. **Subscriptions**: "NOTIFY me of new shows"
4. **Personalization**: Remember user preferences
5. **Group Messaging**: Share shows with friends
6. **Voice Support**: Call-in option for accessibility

---

## Questions to Resolve

1. **Message Strategy**: Send all messages immediately, or summary + "reply MORE"?
2. **Date Parsing**: Which natural language formats to support?
3. **Character Limit**: Hard 160 or allow multi-part messages?
4. **Caching**: How long to cache API responses?
5. **Analytics**: Track which shows are queried most?

---

## Next Steps

1. Review this design with stakeholders
2. Choose message format strategy
3. Set up Twilio trial account
4. Create proof-of-concept with Phase 1 MVP
5. Test with small group of users
6. Iterate based on feedback
