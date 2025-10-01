# NGROK TROUBLESHOOTING GUIDE

## 🚨 Common ngrok Issues & Solutions

### Issue 1: "command not found" or "not recognized"
**Solution:**
```bash
# Reinstall ngrok
winget install ngrok.ngrok
# OR download from: https://ngrok.com/download
```

### Issue 2: No HTTPS URL appearing
**Cause:** Missing authentication token
**Solution:**
1. Go to: https://dashboard.ngrok.com/get-started/setup
2. Sign up (free)
3. Copy your authtoken
4. Run: `ngrok config add-authtoken YOUR_TOKEN_HERE`

### Issue 3: "tunnel session failed" or connection errors
**Solution 1 - Reset ngrok:**
```bash
ngrok kill
ngrok config add-authtoken YOUR_TOKEN
ngrok http 5000
```

**Solution 2 - Use different port:**
```bash
ngrok http 8080
# Then update your server to run on port 8080
```

### Issue 4: Free plan limitations
**Alternative - Use LocalTunnel (No signup needed):**
```bash
npm install -g localtunnel
lt --port 5000
```

## 🎯 QUICK FIX OPTIONS

### Option A: Fix ngrok
1. Run: `node diagnose-ngrok.js` (diagnoses issues automatically)
2. Follow the suggestions provided

### Option B: Use LocalTunnel instead
1. Run: `setup-localtunnel.bat`
2. Copy the HTTPS URL it provides
3. Update your .env file

### Option C: Use ngrok with auth
1. Run: `setup-ngrok.bat`  
2. Follow the authentication steps
3. Copy the HTTPS URL

## 📝 Manual Steps (If scripts don't work)

### Step 1: Get ngrok working
```bash
# Check if installed
ngrok version

# If not installed
winget install ngrok.ngrok

# Add authentication (required for new versions)
ngrok config add-authtoken YOUR_TOKEN_FROM_DASHBOARD

# Start tunnel
ngrok http 5000
```

### Step 2: Copy the HTTPS URL
Look for a line like:
```
Forwarding    https://abc123-def456.ngrok-free.app -> http://localhost:5000
```

### Step 3: Update .env file
Replace this line in your `.env`:
```
TWILIO_WEBHOOK_BASE_URL=https://abc123-def456.ngrok-free.app
```

### Step 4: Configure Twilio
1. Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Click your number: +13506003921
3. Set webhook: `https://abc123-def456.ngrok-free.app/api/complaints/verify-call`
4. Save

## 🆘 LAST RESORT - Skip Webhooks Temporarily

If you can't get public URLs working, you can test with a simplified version:

1. Set NODE_ENV=development in .env (this will use mock verification)
2. Test the complaint system
3. Set up proper tunneling later

## 📞 Quick Test Commands

Test ngrok:
```bash
node diagnose-ngrok.js
```

Test LocalTunnel:
```bash
npm install -g localtunnel
lt --port 5000
```

Test phone system:
```bash
node test-real-phone.js
```

## 🎉 Success Indicators

You'll know it's working when:
- ✅ ngrok shows "Session Status: online"  
- ✅ You see "Forwarding https://..." line
- ✅ Your .env has the correct HTTPS URL
- ✅ Twilio console has the webhook configured
- ✅ `test-real-phone.js` shows all green checkmarks