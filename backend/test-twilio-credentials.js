const twilio = require('twilio');
require('dotenv').config();

async function testTwilioCredentials() {
    console.log('🧪 Testing Twilio Credentials...\n');
    
    console.log('📋 Configuration:');
    console.log(`Account SID: ${process.env.TWILIO_ACCOUNT_SID}`);
    console.log(`Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '***HIDDEN***' : 'NOT SET'}`);
    console.log(`Phone Number: ${process.env.TWILIO_PHONE_NUMBER}`);
    console.log(`Webhook Base URL: ${process.env.TWILIO_WEBHOOK_BASE_URL}`);

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.log('❌ Twilio credentials not configured properly');
        return;
    }

    try {
        // Initialize Twilio client
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        
        console.log('\n🔍 Testing Twilio Account Access...');
        
        // Test account access
        const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
        console.log('✅ Account access successful');
        console.log(`   Account Status: ${account.status}`);
        console.log(`   Account Type: ${account.type}`);
        
        // Test phone number
        console.log('\n📞 Testing Phone Number...');
        const phoneNumbers = await client.incomingPhoneNumbers.list();
        console.log(`✅ Found ${phoneNumbers.length} phone numbers`);
        
        if (phoneNumbers.length > 0) {
            phoneNumbers.forEach((number, index) => {
                console.log(`   ${index + 1}. ${number.phoneNumber} - ${number.friendlyName}`);
            });
            
            // Check if configured number exists
            const configuredNumber = phoneNumbers.find(num => num.phoneNumber === process.env.TWILIO_PHONE_NUMBER);
            if (configuredNumber) {
                console.log('✅ Configured phone number found in account');
            } else {
                console.log('⚠️  Configured phone number not found in account');
                console.log('   Please verify TWILIO_PHONE_NUMBER matches one of the numbers above');
            }
        }

        // Check account balance
        console.log('\n💰 Checking Account Balance...');
        const balance = await client.balance.fetch();
        console.log(`✅ Account Balance: ${balance.balance} ${balance.currency}`);
        
        if (parseFloat(balance.balance) <= 0) {
            console.log('⚠️  Account balance is low. You may need to add funds to make calls.');
        }

    } catch (error) {
        console.error('❌ Twilio Test Failed:', error.message);
        
        if (error.code === 20003) {
            console.log('💡 Solution: Check your Account SID and Auth Token');
        } else if (error.code === 20404) {
            console.log('💡 Solution: Account SID not found - verify it\'s correct');
        } else {
            console.log('💡 Full error details:', error);
        }
    }
}

testTwilioCredentials();