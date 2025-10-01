const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const phoneVerificationService = require('./services/phoneVerificationService');
require('dotenv').config();

async function retryTodaysComplaint() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get today's complaint with error
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const complaint = await Complaint.findOne({
            createdAt: {
                $gte: today,
                $lt: tomorrow
            },
            phoneVerificationStatus: 'error'
        });

        if (!complaint) {
            console.log('❌ No complaints with verification errors found today');
            return;
        }

        console.log(`\n🔧 Found complaint to retry: ${complaint._id}`);
        console.log(`   Description: ${complaint.description.substring(0, 100)}...`);
        console.log(`   Phone: ${complaint.phone}`);
        console.log(`   Current Status: ${complaint.status}`);
        console.log(`   Verification Status: ${complaint.phoneVerificationStatus}`);
        console.log(`   Error: ${complaint.phoneVerificationError}`);

        // Reset the complaint for retry
        console.log('\n🔄 Resetting complaint for retry...');
        await Complaint.findByIdAndUpdate(complaint._id, {
            status: 'pending_verification',
            phoneVerificationStatus: 'pending',
            phoneVerificationError: null,
            phoneVerificationCallSid: null,
            phoneVerificationInitiatedAt: null,
            callStatusUpdates: []
        });

        console.log('✅ Complaint reset successfully');

        // Retry phone verification
        console.log('\n📞 Retrying phone verification...');
        const result = await phoneVerificationService.initiateVerificationCall(complaint._id, complaint.phone);
        
        console.log('📋 Verification Result:', result);

        if (result.success) {
            console.log('✅ Phone verification call initiated successfully!');
            console.log(`   Call SID: ${result.callSid}`);
            console.log(`   Status: ${result.status}`);
            
            if (result.isMock) {
                console.log('\n⚠️  This was a mock call (development mode)');
                console.log('   To enable real calls, make sure:');
                console.log('   1. Your server is running (node server.js)');
                console.log('   2. ngrok is exposing your server publicly');
                console.log('   3. Update TWILIO_WEBHOOK_BASE_URL in .env to ngrok URL');
            }
        } else {
            console.log('❌ Phone verification failed again:', result.message);
        }

        // Check updated complaint
        const updatedComplaint = await Complaint.findById(complaint._id);
        console.log(`\n📊 Updated complaint status:`);
        console.log(`   Status: ${updatedComplaint.status}`);
        console.log(`   Phone Verification Status: ${updatedComplaint.phoneVerificationStatus}`);
        console.log(`   Initiated At: ${updatedComplaint.phoneVerificationInitiatedAt}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n📡 Disconnected from MongoDB');
        process.exit(0);
    }
}

retryTodaysComplaint();