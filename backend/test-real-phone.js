const twilio = require('twilio');
require('dotenv').config();

async function testRealPhoneCall() {
    console.log('🧪 Testing REAL Phone Verification System...\n');
    
    // Check configuration
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    const webhookUrl = process.env.TWILIO_WEBHOOK_BASE_URL;

    console.log('📋 Configuration Check:');
    console.log(`✅ Account SID: ${accountSid ? 'Set' : '❌ Missing'}`);
    console.log(`✅ Auth Token: ${authToken ? 'Set' : '❌ Missing'}`);
    console.log(`✅ Phone Number: ${phoneNumber || '❌ Missing'}`);
    console.log(`✅ Webhook URL: ${webhookUrl || '❌ Missing'}`);
    console.log(`✅ Environment: ${process.env.NODE_ENV || 'Not set'}`);

    if (!accountSid || !authToken || !phoneNumber) {
        console.log('\n❌ Missing Twilio credentials! Check your .env file.');
        return;
    }

    if (!webhookUrl || webhookUrl.includes('your-ngrok-url')) {
        console.log('\n⚠️  Webhook URL not set! You need to:');
        console.log('1. Run: ngrok http 5000');
        console.log('2. Update TWILIO_WEBHOOK_BASE_URL in .env');
        console.log('3. Configure webhook in Twilio console');
        return;
    }

    try {
        // Initialize Twilio client
        const client = twilio(accountSid, authToken);

        // Test account access
        console.log('\n🔍 Testing Twilio Connection...');
        const account = await client.api.accounts(accountSid).fetch();
        console.log(`✅ Connected to Twilio account: ${account.friendlyName}`);
        
        // Check balance
        const balance = await client.balance.fetch();
        console.log(`💰 Account balance: ${balance.balance} ${balance.currency}`);

        if (parseFloat(balance.balance) < 1) {
            console.log('⚠️  Low balance! Add funds to make calls.');
            return;
        }

        // Verify phone number
        const phoneNumbers = await client.incomingPhoneNumbers.list();
        const myNumber = phoneNumbers.find(num => num.phoneNumber === phoneNumber);
        
        if (!myNumber) {
            console.log(`❌ Phone number ${phoneNumber} not found in account!`);
            return;
        }

        console.log(`✅ Phone number verified: ${myNumber.phoneNumber}`);
        console.log(`📞 Webhook configured: ${myNumber.voiceUrl || 'Not set'}`);

        // Test webhook URL
        console.log('\n🧪 Testing webhook URL...');
        const testWebhookUrl = `${webhookUrl}/api/complaints/verify-call?complaintId=test123`;
        console.log(`🔗 Testing: ${testWebhookUrl}`);

        try {
            const fetch = require('node-fetch');
            const response = await fetch(testWebhookUrl, { method: 'POST' });
            if (response.ok) {
                console.log('✅ Webhook URL is accessible!');
            } else {
                console.log(`⚠️  Webhook returned status: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Webhook URL not accessible: ${error.message}`);
            console.log('Make sure ngrok is running and server is started!');
        }

        console.log('\n🎉 SYSTEM READY FOR REAL PHONE CALLS!');
        console.log('\n📋 Next steps:');
        console.log('1. Make sure your server is running: node server.js');
        console.log('2. Submit a complaint through your frontend');
        console.log('3. You should receive a real phone call within 30 seconds!');

    } catch (error) {
        console.error('❌ Twilio test failed:', error.message);
    }
}

testRealPhoneCall();