# Phone Verification System Setup Guide

## Overview
This system replaces the admin approval workflow with automated phone verification. When users submit complaints, they receive a verification call where they can press 1 to confirm or 2 to reject their complaint. Confirmed complaints are automatically routed to the appropriate department.

## Features
- **Automated Phone Calls**: Uses Twilio to make verification calls
- **Dual Language Support**: Hindi and English voice prompts
- **DTMF Processing**: Users press 1 to confirm, 2 to reject
- **Direct Department Routing**: Bypasses admin approval completely
- **Comprehensive Tracking**: Full call history and verification status
- **Development Fallback**: Mock verification for testing without Twilio credits

## Setup Instructions

### 1. Twilio Account Setup

1. **Create Twilio Account**:
   - Visit [Twilio Console](https://console.twilio.com/)
   - Sign up for a free account (includes $15 trial credit)
   - Verify your email and phone number

2. **Get Twilio Credentials**:
   - Account SID: Found on the Twilio Console Dashboard
   - Auth Token: Found on the Twilio Console Dashboard
   - Phone Number: Purchase a phone number or use trial number

3. **Configure Webhook URLs**:
   - Set up ngrok for local development: `ngrok http 5000`
   - Or deploy to a public server for production
   - Webhook base URL format: `https://yourdomain.com` or `https://abc123.ngrok.io`

### 2. Environment Configuration

Add these variables to your `.env` file:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WEBHOOK_BASE_URL=https://yourdomain.com
```

### 3. Webhook Configuration in Twilio Console

1. Go to Phone Numbers → Manage → Active Numbers
2. Click on your purchased phone number
3. Set the webhook URL for voice calls to: `[YOUR_BASE_URL]/api/complaints/verify-call`

### 4. Testing the System

#### Development Testing (Without Twilio Credits)
- The system automatically uses mock verification when Twilio credentials are not configured
- Check console logs for verification simulation

#### Production Testing (With Twilio)
1. Submit a complaint through the frontend
2. Check that the complaint status is set to `pending_verification`
3. User should receive a phone call within 30 seconds
4. Call will play: "This is a confirmation call for your registered complaint. Press 1 to confirm, Press 2 to reject."
5. Based on user input:
   - Press 1: Complaint moves to `phone_verified` and routes to department
   - Press 2: Complaint moves to `rejected_by_user`
   - No input: Remains `pending_verification`

## System Workflow

```
User Submits Complaint
        ↓
Status: pending_verification
        ↓
Phone Verification Call Initiated
        ↓
User Receives Call
        ↓
User Presses 1 (Confirm)    User Presses 2 (Reject)    No Input
        ↓                           ↓                        ↓
Status: phone_verified          Status: rejected_by_user   Status: pending_verification
        ↓
Auto-Route to Department
        ↓
Status: assigned
```

## API Endpoints

### New Phone Verification Endpoints:

- `POST /api/complaints/verify-call` - TwiML webhook for handling incoming verification calls
- `POST /api/complaints/process-verification` - Processes user DTMF input (1 or 2)
- `POST /api/complaints/call-status` - Tracks call completion status

### Modified Endpoints:

- `POST /api/complaints` - Now initiates phone verification instead of admin assignment

## Database Schema Changes

### Complaint Model Enhancements:

```javascript
phoneVerificationStatus: {
  type: String,
  enum: ['pending', 'verified', 'rejected', 'failed'],
  default: 'pending'
}

phoneVerificationCalls: [{
  callSid: String,
  status: String,
  timestamp: Date,
  userResponse: String
}]

autoRoutingData: {
  detectedDepartment: String,
  detectionConfidence: Number,
  routingTimestamp: Date
}
```

## Troubleshooting

### Common Issues:

1. **Calls Not Being Made**:
   - Check Twilio credentials in .env
   - Verify account has sufficient balance
   - Check phone number format (+country code)

2. **Webhook Not Receiving Data**:
   - Ensure webhook URL is publicly accessible
   - Check Twilio console for webhook configuration
   - Verify CORS settings if needed

3. **Complaints Stuck in pending_verification**:
   - Check call logs in Twilio console
   - Verify user's phone number format
   - Check server logs for errors

### Debug Logs:
Look for these prefixes in your server logs:
- `[PHONE-VERIFY]` - Phone verification service logs
- `[COMPLAINT-CREATE]` - Complaint creation workflow logs

## Cost Considerations

- **Twilio Free Tier**: $15 trial credit
- **Voice Call Cost**: ~$0.013-0.085 per minute (varies by region)
- **Development**: Use mock verification to avoid charges during testing
- **Production**: Monitor usage through Twilio console

## Security Features

- **Verification Timeout**: Calls timeout after 30 seconds
- **Single Attempt**: Only one verification call per complaint
- **Status Tracking**: Complete audit trail of verification attempts
- **Input Validation**: Only accepts 1 or 2 as valid responses

## Language Support

The system supports dual-language prompts:
- **Hindi**: "Yah aapki shikayat ki pusht karne ke liye call hai. 1 dabaiye confirm karne ke liye, 2 dabaiye reject karne ke liye."
- **English**: "This is a confirmation call for your registered complaint. Press 1 to confirm, Press 2 to reject."

Currently set to English by default. Modify the `generateVerificationTwiML` function in `phoneVerificationService.js` to change the language.