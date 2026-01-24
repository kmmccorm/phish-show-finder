# SMS Integration Documentation

This directory contains the complete design and implementation guide for adding SMS/text message support to the Phish Show Finder application.

## 📚 Documentation Overview

### 1. [SMS Integration Design](./sms-integration-design.md)
**Comprehensive design document covering**:
- Architecture options (Vercel, Node.js, AWS Lambda)
- System architecture and data flow
- Component design and specifications
- Code reuse strategy
- SMS constraints and solutions
- User interaction flows
- Error handling
- Implementation phases
- Testing strategy
- Security considerations
- Cost analysis

👉 **Start here** to understand the overall approach and architecture.

### 2. [SMS Implementation Guide](./sms-implementation-guide.md)
**Step-by-step implementation instructions**:
- Twilio account setup
- Project structure
- Dependencies installation
- Environment configuration
- Core file implementation
- Vercel deployment
- Webhook configuration
- Testing procedures
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

- **[sms-service-example.ts](./examples/sms-service-example.ts)**
  - Twilio integration
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

**New code needed**: ~600 lines (date parser, SMS formatter, Twilio integration)

### Data Flow
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

### SMS Constraints
- **160 characters** per message
- **No rich formatting** (use emojis instead)
- **Costs money** (~$0.008 per message)
- **Rate limiting** needed (prevent abuse)
- **Opt-out required** by law (STOP command)

---

## 📋 Implementation Phases

### Phase 1: MVP (1-2 days)
Basic functionality:
- ✅ Simple date parsing (M/D/YY only)
- ✅ Show lookup
- ✅ SMS formatting (summary)
- ✅ Error handling
- ✅ Webhook security

### Phase 2: Enhanced (1 day)
Better UX:
- ✅ Natural language dates
- ✅ Multi-message support
- ✅ Rate limiting
- ✅ Caching

### Phase 3: Advanced (2-3 days)
Power features:
- ✅ Commands (LAST, RANDOM, SEARCH)
- ✅ Location queries
- ✅ Song search
- ✅ User preferences

---

## 💰 Cost Estimate

### Monthly Costs (100 users, 10 queries each)
| Item | Cost |
|------|------|
| Twilio phone number | $1.15 |
| Incoming SMS (1,000) | $8.50 |
| Outgoing SMS (2,000) | $15.80 |
| Vercel hosting | Free |
| **Total** | **~$25/month** |

### Free Tier
- Twilio: $15 trial credit
- Vercel: Free for hobby projects
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
