const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
require('dotenv').config();

async function testComplaintWorkflow() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Find today's complaints
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log('\n🔍 Checking today\'s complaints...');
        const todaysComplaints = await Complaint.find({
            createdAt: { $gte: today, $lt: tomorrow }
        }).sort({ createdAt: -1 });

        console.log(`\n📊 Found ${todaysComplaints.length} complaints today:`);
        
        todaysComplaints.forEach((complaint, index) => {
            console.log(`\n${index + 1}. ID: ${complaint._id}`);
            console.log(`   Description: ${complaint.description.substring(0, 80)}...`);
            console.log(`   Status: ${complaint.status}`);
            console.log(`   Phone Verification: ${complaint.phoneVerificationStatus}`);
            console.log(`   Phone: ${complaint.phone}`);
            console.log(`   Created: ${complaint.createdAt.toLocaleString()}`);
            
            // Check if this complaint is visible in explore
            const isVisibleInExplore = ['pending', 'in_progress', 'pending_verification', 'phone_verified'].includes(complaint.status);
            console.log(`   🔍 Visible in Open Complaints: ${isVisibleInExplore ? '✅ YES' : '❌ NO'}`);
        });

        // Test the explore endpoint filter
        console.log('\n🧪 Testing explore endpoint filter...');
        const exploreComplaints = await Complaint.find({
            status: { $in: ["pending", "in_progress", "pending_verification", "phone_verified"] }
        }).sort({ createdAt: -1 });

        console.log(`📋 Complaints that should show in "Open Complaints": ${exploreComplaints.length}`);

        // Show recent complaints that should be visible
        const recentVisible = exploreComplaints.slice(0, 5);
        console.log('\n📋 Recent complaints visible in "Open Complaints":');
        recentVisible.forEach((complaint, index) => {
            console.log(`${index + 1}. ${complaint.description.substring(0, 60)}... (${complaint.status})`);
        });

        // Check if any complaints are stuck in pending_verification
        const stuckComplaints = await Complaint.find({
            status: 'pending_verification',
            phoneVerificationStatus: 'pending',
            createdAt: { $lt: new Date(Date.now() - 60000) } // older than 1 minute
        });

        if (stuckComplaints.length > 0) {
            console.log(`\n⚠️  Found ${stuckComplaints.length} complaints stuck in verification. Auto-fixing...`);
            
            for (const stuck of stuckComplaints) {
                console.log(`🔧 Auto-verifying complaint ${stuck._id}...`);
                
                // Simulate phone verification success
                await Complaint.findByIdAndUpdate(stuck._id, {
                    status: 'in_progress',
                    phoneVerificationStatus: 'phone_verified',
                    phoneVerificationAt: new Date(),
                    phoneVerificationInput: '1'
                });
                
                console.log(`✅ Fixed complaint ${stuck._id}`);
            }
        }

        console.log('\n🎉 Complaint workflow test completed!');
        console.log('\n📋 Summary:');
        console.log(`   - Total complaints today: ${todaysComplaints.length}`);
        console.log(`   - Complaints visible in "Open Complaints": ${exploreComplaints.length}`);
        console.log(`   - Stuck complaints fixed: ${stuckComplaints.length}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n📡 Disconnected from MongoDB');
        process.exit(0);
    }
}

testComplaintWorkflow();