const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
require('dotenv').config();

async function checkTodaysComplaints() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log('🔍 Searching for complaints from:', today.toISOString());

        // Find all complaints from today
        const todaysComplaints = await Complaint.find({
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        }).sort({ createdAt: -1 });

        console.log(`\n📊 Found ${todaysComplaints.length} complaints from today:`);

        todaysComplaints.forEach((complaint, index) => {
            console.log(`\n${index + 1}. Complaint ID: ${complaint._id}`);
            console.log(`   Description: ${complaint.description.substring(0, 100)}...`);
            console.log(`   Status: ${complaint.status}`);
            console.log(`   Phone Verification Status: ${complaint.phoneVerificationStatus || 'Not set'}`);
            console.log(`   Phone: ${complaint.phone || 'Not set'}`);
            console.log(`   Created: ${complaint.createdAt}`);
            console.log(`   Phone Verification Initiated: ${complaint.phoneVerificationInitiatedAt || 'Not initiated'}`);
            console.log(`   Phone Verification Error: ${complaint.phoneVerificationError || 'None'}`);
            console.log(`   Call SID: ${complaint.phoneVerificationCallSid || 'None'}`);
            
            if (complaint.callStatusUpdates && complaint.callStatusUpdates.length > 0) {
                console.log(`   Call Status Updates:`);
                complaint.callStatusUpdates.forEach((update, i) => {
                    console.log(`     ${i + 1}. ${update.status} at ${update.timestamp}`);
                });
            }
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n📡 Disconnected from MongoDB');
        process.exit(0);
    }
}

checkTodaysComplaints();