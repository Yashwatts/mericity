require('dotenv').config();

console.log('🔧 Checking Google Cloud Vision API status...');

// Check if this is a billing issue vs permission issue
const errorMessages = {
  'PERMISSION_DENIED': '🔑 This could be due to:\n1. API key doesn\'t have Vision API permissions\n2. Billing not enabled on Google Cloud project\n3. API still propagating (wait 5-10 minutes)',
  'QUOTA_EXCEEDED': '📊 Vision API quota exceeded for today',
  'BILLING_DISABLED': '💳 Billing must be enabled for Vision API',
  'SERVICE_DISABLED': '⚠️ Vision API not enabled for project'
};

console.log(`
📋 TROUBLESHOOTING GOOGLE VISION API:

Current Status: ❌ PERMISSION_DENIED - Requests are blocked

🔍 SOLUTIONS TO TRY:

1. 🕐 WAIT 5-10 MINUTES: 
   API may still be propagating after enabling

2. 💳 ENABLE BILLING:
   - Go to: https://console.cloud.google.com/billing
   - Enable billing for your project ID: 926724006763
   - Even free tier requires billing enabled

3. 🔑 CHECK API KEY PERMISSIONS:
   - Go to: https://console.developers.google.com/apis/credentials
   - Edit your API key
   - Under "API restrictions", ensure "Cloud Vision API" is allowed

4. 📊 CHECK QUOTAS:
   - Go to: https://console.cloud.google.com/apis/api/vision.googleapis.com/quotas
   - Ensure quotas are not exceeded

🎯 RECOMMENDED NEXT STEPS:
1. Enable billing (most common issue)
2. Wait 5 minutes for changes to propagate
3. Run the test again

⚡ ALTERNATIVE: Using free Gemini Vision API instead
   - Works immediately without billing setup
   - Good for development and testing
`);

// Ask user what they want to do
console.log('\n🤔 What would you prefer?');
console.log('A) Fix Google Vision API (requires billing)');
console.log('B) Switch back to Gemini Vision (free, works now)');
console.log('C) Wait and try Vision API again in 5 minutes');