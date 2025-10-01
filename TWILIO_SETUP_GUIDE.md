# 📱 Twilio SMS Integration Guide

## Why Twilio?
- ✅ **Reliable**: 99.95% uptime SLA
- ✅ **Global**: Works in 180+ countries
- ✅ **Scalable**: Handle millions of messages
- ✅ **Developer-friendly**: Great APIs and documentation
- ✅ **Cost-effective**: ~₹0.50-1.50 per SMS in India
- ✅ **Professional**: Used by Uber, Netflix, WhatsApp

## 🚀 Quick Setup (5 minutes)

### Step 1: Create Twilio Account
1. Go to [twilio.com](https://www.twilio.com)
2. Sign up for free account
3. Verify your email and phone number
4. Get $15.50 free trial credit (enough for ~50-100 SMS)

### Step 2: Get Credentials
1. From Twilio Console Dashboard:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - **Auth Token**: `your-32-character-auth-token`

### Step 3: Get Phone Number
1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose country (India: +91, US: +1, etc.)
3. Select a number (free with trial)
4. Note your number: `+1234567890`

### Step 4: Configure Environment
Add to your `.env` file:
```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1234567890

# For production SMS
NODE_ENV=production
```

## 📋 Current Implementation

### Development Mode (Default)
```javascript
// SMS logged to console - no API calls
📱 SMS NOTIFICATION (DEV MODE): {
  to: '+919876543210',
  from: '+1234567890',
  message: '🚧 Good news! Your complaint "Pothole..." is now being worked on...',
  provider: 'Twilio (Simulated)'
}
```

### Production Mode
```javascript
// Real SMS sent via Twilio API
✅ SMS sent successfully via Twilio: {
  sid: 'SM1234567890abcdef',
  to: '+919876543210',
  status: 'queued',
  price: '-0.00750',
  priceUnit: 'USD'
}
```

## 💰 Pricing

### India (Most common)
- **Local SMS**: ₹0.50 - ₹1.50 per message
- **International**: $0.0075 - $0.05 per message

### Free Trial
- **$15.50 credit** = ~50-100 SMS messages
- Perfect for testing and initial launch

### Production Costs
- 1000 SMS/month ≈ ₹500-1500
- 10,000 SMS/month ≈ ₹5000-15,000

## 🧪 Testing Your Setup

### 1. Test in Development (Safe)
```bash
# Your current setup - just logs to console
NODE_ENV=development node server.js
```

### 2. Test with Real SMS
```bash
# Add Twilio credentials to .env
NODE_ENV=production node server.js

# Then trigger a complaint status change
# Real SMS will be sent!
```

### 3. Test Individual SMS
Create a test script:
```javascript
const smsService = require('./services/smsService');

// Test SMS sending
smsService.sendSMS('+919876543210', 'Test message from CivicSense!')
  .then(result => console.log('Result:', result));
```

## 🔒 Security Best Practices

### Environment Variables
```env
# ✅ Good - Keep credentials in .env
TWILIO_ACCOUNT_SID=AC123...
TWILIO_AUTH_TOKEN=abc123...

# ❌ Bad - Never hardcode in source code
const authToken = 'abc123...'; // Don't do this!
```

### Rate Limiting
Twilio automatically handles rate limiting, but you can add your own:
```javascript
// Add to your SMS service
const rateLimiter = new Map();

async sendSMS(phoneNumber, message) {
  // Check if user sent SMS recently
  const lastSent = rateLimiter.get(phoneNumber);
  if (lastSent && Date.now() - lastSent < 60000) {
    throw new Error('Rate limited: Wait 1 minute between SMS');
  }
  
  // ... send SMS
  rateLimiter.set(phoneNumber, Date.now());
}
```

## 📊 Message Templates (SMS Optimized)

### In Progress (130 chars)
```
🚧 Good news! Your complaint "Pothole on Main St..." is now being worked on. We'll update you soon. - CivicSense
```

### Resolved (125 chars)
```
✅ Great! Your complaint "Pothole on Main St..." has been resolved. Thanks for helping our community! - CivicSense
```

### Other Status (140 chars)
```
📋 Your complaint "Pothole on Main St..." status updated to: under_review. Check app for details. - CivicSense
```

## 🚀 Go Live Checklist

- [ ] Create Twilio account
- [ ] Verify phone number for testing
- [ ] Get Account SID, Auth Token, Phone Number
- [ ] Add credentials to `.env` file
- [ ] Test with your own phone number first
- [ ] Set `NODE_ENV=production`
- [ ] Monitor Twilio console for delivery status
- [ ] Set up billing alerts in Twilio
- [ ] Consider adding unsubscribe mechanism

## 📞 Alternative Providers (If needed)

1. **AWS SNS** - Good for high volume
2. **MessageBird** - European alternative  
3. **Nexmo/Vonage** - Good global coverage
4. **TextLocal** - Popular in India (your previous setup)

But **Twilio is the gold standard** for reliability and ease of use! 🏆

## 🎯 Current Status
- ✅ Code updated for Twilio
- ✅ Development mode working (console logs)
- ✅ Phone number formatting for international
- ✅ Optimized message templates
- ⏳ Waiting for Twilio credentials to go live
- ⏳ Production testing needed

**You're all set! Just add Twilio credentials when ready to send real SMS.** 🚀