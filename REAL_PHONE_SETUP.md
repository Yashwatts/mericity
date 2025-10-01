# REAL PHONE VERIFICATION SETUP GUIDE

## 🎯 You will receive ACTUAL phone calls!

### STEP 1: Start ngrok
1. Open Command Prompt
2. Run: `ngrok http 5000`
3. **COPY** the https URL (example: `https://abc123-def456-ghi789.ngrok-free.app`)

### STEP 2: Update .env file
1. Open: `D:\SIH\SIH (2)\SIH\GoogleAuth+Mongo\backend\.env`
2. **REPLACE** `https://your-ngrok-url.ngrok.io` with your actual ngrok URL
3. Save the file

Example:
```
TWILIO_WEBHOOK_BASE_URL=https://abc123-def456-ghi789.ngrok-free.app
```

### STEP 3: Configure Twilio Webhook
1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click on your phone number: **+13506003921**
3. In the "Voice Configuration" section:
   - Set **Webhook**: `[YOUR_NGROK_URL]/api/complaints/verify-call`
   - Example: `https://abc123-def456-ghi789.ngrok-free.app/api/complaints/verify-call`
   - Set **HTTP Method**: POST
4. **Save Configuration**

### STEP 4: Start Your Server
1. Open Command Prompt in backend directory
2. Run: `node server.js`
3. Server should start without errors

### STEP 5: Test Real Phone Verification
1. Submit a complaint through your frontend
2. **YOU WILL RECEIVE A REAL PHONE CALL** within 30 seconds
3. **Listen to the message** (in Hindi and English)
4. **Press 1** to confirm your complaint
5. **Press 2** to reject your complaint

## 🔊 What You'll Hear:

**Hindi**: "नमस्कार! यह आपकी पंजीकृत शिकायत की पुष्टि के लिए एक कॉल है। पुष्टि के लिए 1 दबाएं, अस्वीकार करने के लिए 2 दबाएं।"

**English**: "Hello! This is a confirmation call for your registered complaint. Press 1 to confirm, Press 2 to reject."

## ✅ Expected Behavior:

- **Press 1**: Complaint confirmed → Routed to department → Status: "in_progress"
- **Press 2**: Complaint rejected → Status: "rejected_by_user"  
- **No response**: Timeout → Status: "verification_timeout"

## 🔧 Troubleshooting:

### If no call comes:
1. Check ngrok is still running
2. Verify webhook URL in Twilio console
3. Check server console for errors
4. Ensure phone number format is correct (+91xxxxxxxxxx)

### If call comes but no response:
1. Check server logs for webhook calls
2. Verify TWILIO_WEBHOOK_BASE_URL is correct
3. Try pressing keys more firmly

## 💰 Cost Information:
- **Balance**: $15.50 USD available
- **Call cost**: ~$0.02 per call (varies by region)
- **You have enough for ~700+ verification calls**

## 🎉 Success Indicators:
1. ✅ Ngrok tunnel active
2. ✅ Webhook URL configured in Twilio
3. ✅ Server running without errors
4. ✅ Phone call received
5. ✅ DTMF input processed
6. ✅ Complaint status updated