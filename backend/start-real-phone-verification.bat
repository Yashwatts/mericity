@echo off
echo.
echo ==========================================
echo   REAL PHONE VERIFICATION SETUP
echo ==========================================
echo.

echo This will set up REAL phone calls using Twilio!
echo You will receive actual verification calls on your phone.
echo.

echo Step 1: Check Twilio credentials...
cd /d "D:\SIH\SIH (2)\SIH\GoogleAuth+Mongo\backend"
node test-twilio-credentials.js

echo.
echo Step 2: Start ngrok tunnel...
echo Opening ngrok to create public URL for webhooks...
echo.
echo IMPORTANT: Copy the https URL that ngrok shows (like https://abc123.ngrok.io)
echo.

start "ngrok" cmd /k "ngrok http 5000"

echo.
echo Step 3: Update webhook URL...
echo Please follow these steps:
echo.
echo 1. Look at the ngrok window that just opened
echo 2. Copy the HTTPS URL (like https://abc123.ngrok.io)
echo 3. Press any key when you have the URL ready...
pause

echo.
echo 4. Replace 'your-ngrok-url' in the .env file with your actual ngrok URL
echo 5. The file is: D:\SIH\SIH (2)\SIH\GoogleAuth+Mongo\backend\.env
echo 6. Update this line: TWILIO_WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
echo.

echo Step 4: Configure Twilio Console...
echo.
echo Go to: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
echo Click on your phone number: +13506003921
echo Set webhook URL to: [YOUR_NGROK_URL]/api/complaints/verify-call
echo Example: https://abc123.ngrok.io/api/complaints/verify-call
echo.

echo Press any key when you've updated the webhook URL...
pause

echo.
echo Step 5: Start server with REAL phone verification...
echo.
echo ==========================================
echo   REAL PHONE CALLS ENABLED!
echo ==========================================
echo.
echo When you submit a complaint now:
echo ✅ Real phone call will be made to your number
echo ✅ You'll hear: "This is a confirmation call..."
echo ✅ Press 1 to confirm, 2 to reject
echo ✅ Complaint will route to department after confirmation
echo.

node server.js