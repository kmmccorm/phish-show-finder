# SMS/MMS Integration Documentation

This directory contains the complete design and implementation guide for adding SMS (text messaging) and MMS (multimedia messaging with images) support to the Phish Show Finder application.

## 📚 Documentation Overview

### 1. [SMS/MMS Integration Design](./sms-integration-design.md)
**Comprehensive design document covering**:
- Architecture options (Vercel, Node.js, AWS Lambda)
- System architecture and data flow
- Component design and specifications
- Code reuse strategy
- SMS/MMS constraints and solutions
- Image generation strategies
- User interaction flows
- Error handling
- Implementation phases
- Testing strategy
- Security considerations
- Cost analysis (SMS vs MMS)

👉 **Start here** to understand the overall approach and architecture.

### 2. [SMS/MMS Implementation Guide](./sms-implementation-guide.md)
**Step-by-step implementation instructions**:
- Twilio account setup (SMS + MMS)
- Project structure
- Dependencies installation (including image generation)
- Environment configuration (storage setup)
- Core file implementation
- Vercel deployment
- Webhook configuration
- Testing procedures (SMS and MMS)
- Production optimizations
- Troubleshooting

👉 **Use this** when you're ready to implement the feature.

### 3. [Example Code](./examples/)
**Reference implementations** of key components:

- **[sms-handler-example.ts](./examples/sms-handler-example.ts)**
  - Main webhook handler (Vercel function)
  - Request validation
  - Full request/response flow
  - Error handling

- **[date-parser-example.ts](./examples/date-parser-example.ts)**
  - Date parsing from various formats
  - Natural language support ("yesterday", "today")
  - Validation logic
  - Test examples

- **[sms-formatter-example.ts](./examples/sms-formatter-example.ts)**
  - Show data formatting for SMS
  - Character limit handling
  - Multi-message chunking
  - Summary vs. full setlist

- **[mms-formatter-example.ts](./examples/mms-formatter-example.ts)** ⭐ NEW
  - Setlist image generation using Puppeteer
  - HTML template rendering
  - Image storage (Vercel Blob/S3)
  - Smart MMS detection logic
  - Multiple style themes

- **[sms-service-example.ts](./examples/sms-service-example.ts)**
  - Twilio SMS/MMS integration
  - Webhook validation
  - Rate limiting
  - Opt-out handling

👉 **Reference these** during implementation for code patterns.

---

## 🚀 Quick Start

If you want to get started quickly:

1. **Read**: [SMS Integration Design](./sms-integration-design.md) (30 min)
2. **Decide**: Choose architecture (recommendation: Vercel Functions)
3. **Setup**: Follow [Implementation Guide](./sms-implementation-guide.md) Step 1-3
4. **Code**: Copy example files and adapt to your needs
5. **Deploy**: Follow Step 6-7 in implementation guide
6. **Test**: Send a text message!

**Estimated time**: 2-4 hours for MVP

---

## 💡 Key Concepts

### Code Reuse
The design **maximizes code reuse** from the existing web app:
- ✅ API client (`fetchFromApi`)
- ✅ Show fetching (`fetchShowByDate`)
- ✅ Data transformation (`transformShowData`)
- ✅ Error handling (all `ApiError` classes)
- ✅ Date utilities
- ✅ Type definitions

**New code needed**: ~800 lines (date parser, SMS/MMS formatter, image generation, Twilio integration)

### Data Flow - SMS
```
User texts "7/14/23"
  ↓
Twilio → POST /api/sms/incoming
  ↓
Parse date → "2023-07-14"
  ↓
fetchShowByDate() [EXISTING CODE]
  ↓
transformShowData() [EXISTING CODE]
  ↓
formatShowForSMS() [NEW CODE]
  ↓
Send SMS via Twilio
  ↓
User receives formatted show info
```

### Data Flow - MMS
```
User texts "7/14/23 pic"
  ↓
Twilio → POST /api/sms/incoming
  ↓
Parse date + detect MMS request
  ↓
fetchShowByDate() [EXISTING CODE]
  ↓
transformShowData() [EXISTING CODE]
  ↓
generateSetlistImage() [NEW CODE]
  ↓
Upload to Blob Storage → Get URL
  ↓
Send MMS with image via Twilio
  ↓
User receives beautiful setlist image
```

### SMS vs MMS
**SMS (Text Only)**:
- **160 characters** per message
- **No rich formatting** (use emojis instead)
- **Lower cost** (~$0.008 per message)
- Best for quick queries

**MMS (With Images)**:
- **No character limit** (reasonable text)
- **Rich visuals** (setlist images, venue photos)
- **Higher cost** (~$0.02 per message)
- Best for special shows, visual sharing

**Smart Strategy**:
- Default to SMS for regular queries
- Auto-MMS for special shows (NYE, Halloween, high-rated)
- MMS on request ("7/14/23 pic")
- Remember user preference

**Common Requirements**:
- **Rate limiting** needed (prevent abuse)
- **Opt-out required** by law (STOP command)
- **Image storage** for MMS (Vercel Blob or S3)

---

## 📋 Implementation Phases

### Phase 1: MVP (1-2 days)
Basic SMS functionality:
- ✅ Simple date parsing (M/D/YY only)
- ✅ Show lookup
- ✅ SMS formatting (summary)
- ✅ Error handling
- ✅ Webhook security

### Phase 2: MMS & Enhanced UX (2-3 days)
Rich media and better UX:
- ✅ MMS image generation (Puppeteer)
- ✅ Image storage (Vercel Blob/S3)
- ✅ Smart MMS detection
- ✅ Natural language dates
- ✅ Multi-message support
- ✅ Rate limiting
- ✅ Caching

### Phase 3: Advanced Features (2-3 days)
Power features:
- ✅ Commands (LAST, RANDOM, SEARCH)
- ✅ Location queries
- ✅ Song search
- ✅ User preferences (SMS vs MMS)
- ✅ Custom image styles
- ✅ Venue photos integration

---

## 💰 Cost Estimate

### Monthly Costs - SMS Only (100 users, 10 queries each)
| Item | Cost |
|------|------|
| Twilio phone number | $1.15 |
| Incoming SMS (1,000) | $8.50 |
| Outgoing SMS (2,000) | $15.80 |
| Vercel hosting | Free |
| **Total** | **~$25/month** (~$0.025/query) |

### Monthly Costs - Smart MMS (100 users, 20% use MMS)
| Item | Cost |
|------|------|
| Twilio phone number | $1.15 |
| Incoming SMS (1,000) | $8.50 |
| Outgoing SMS (800) | $6.32 |
| Outgoing MMS (200) | $4.00 |
| Vercel Blob Storage | Free (under 500MB) |
| **Total** | **~$20/month** (~$0.02/query) |

**Recommendation**: Use smart MMS (auto-MMS for special shows only) to balance cost and experience.

### Free Tier
- Twilio: $15 trial credit
- Vercel: Free for hobby projects (includes Blob storage)
- **Cost to try it**: $0

---

## 🔒 Security Features

Built-in security measures:
- ✅ Twilio signature validation
- ✅ Rate limiting (5 req/hour per number)
- ✅ Input sanitization
- ✅ Opt-out support (STOP)
- ✅ No PII logging
- ✅ Environment variable secrets
- ✅ HTTPS only

---

## 🧪 Testing Checklist

Before going live:
- [ ] Valid date formats work
- [ ] Invalid dates show error
- [ ] No show found handled
- [ ] Long setlists split correctly
- [ ] Rate limiting works
- [ ] STOP command opts out
- [ ] START command opts in
- [ ] API errors handled gracefully
- [ ] Webhook signature validated
- [ ] Environment vars set

---

## 📊 Success Metrics

Track these to measure success:
- **Usage**: Requests per day/week
- **Reliability**: Success rate (%)
- **Cost**: $ per query
- **Speed**: Response time (seconds)
- **Satisfaction**: User feedback
- **Popular dates**: Most queried shows

---

## 🤝 Contributing

If you implement this and want to share improvements:

1. Test thoroughly
2. Document changes
3. Consider edge cases
4. Update examples
5. Share learnings

---

## 📞 Support

Common issues and solutions in:
- [Implementation Guide - Troubleshooting](./sms-implementation-guide.md#troubleshooting)
- [Design Doc - Error Handling](./sms-integration-design.md#error-handling)

---

## 🎯 Next Steps

1. **For Planning**: Read the [Design Document](./sms-integration-design.md)
2. **For Implementation**: Follow the [Implementation Guide](./sms-implementation-guide.md)
3. **For Reference**: Check [Example Code](./examples/)
4. **For Testing**: Use the testing checklist above

---

## 📝 Notes

- All example code is TypeScript
- Designed for Vercel but adaptable to other platforms
- Examples include comments and type definitions
- Production-ready patterns (error handling, logging, etc.)
- Follows existing code style and patterns

---

## 🌟 Future Enhancements

Ideas for future versions:
- MMS support (images)
- WhatsApp integration
- Voice call support (accessibility)
- Group messaging
- Notifications (new shows)
- Personalization (favorites)
- Stats tracking
- Integration with Spotify/Apple Music

---

**Happy coding!** 🎸

For questions about the existing Phish.net API integration, see the main project README.
