const mongoose = require('mongoose');
require('dotenv').config();

const Complaint = require('./models/Complaint');

async function checkComplaintStatus() {
    try {
        console.log('🔌 Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to database\n');

        console.log('🔍 Analyzing current complaint statuses...\n');

        // Get all complaints
        const allComplaints = await Complaint.find({}).sort({ createdAt: -1 });
        console.log(`📊 Total complaints in database: ${allComplaints.length}\n`);

        // Group by status
        const statusGroups = {};
        allComplaints.forEach(complaint => {
            const status = complaint.status;
            if (!statusGroups[status]) {
                statusGroups[status] = [];
            }
            statusGroups[status].push(complaint);
        });

        console.log('📈 Complaints by status:');
        Object.entries(statusGroups).forEach(([status, complaints]) => {
            console.log(`   ${status}: ${complaints.length} complaints`);
        });
        console.log('');

        // Test categorization
        function categorizeComplaint(complaint) {
            if (['resolved'].includes(complaint.status)) {
                return 'resolved';
            } else if (['rejected', 'rejected_by_user', 'rejected_no_answer'].includes(complaint.status)) {
                return 'closed';
            } else {
                return 'open';
            }
        }

        const categorized = {
            open: [],
            closed: [],
            resolved: []
        };

        allComplaints.forEach(complaint => {
            const category = categorizeComplaint(complaint);
            categorized[category].push(complaint);
        });

        console.log('🏷️ Complaints by category:');
        console.log(`   📂 Open: ${categorized.open.length} complaints`);
        console.log(`   🔒 Closed: ${categorized.closed.length} complaints`);
        console.log(`   ✅ Resolved: ${categorized.resolved.length} complaints`);
        console.log('');

        // Show recent rejected complaints
        const rejectedComplaints = allComplaints.filter(c => 
            ['rejected', 'rejected_by_user', 'rejected_no_answer'].includes(c.status)
        );

        console.log('🚫 Recent rejected complaints:');
        if (rejectedComplaints.length === 0) {
            console.log('   ℹ️ No rejected complaints found in database');
        } else {
            rejectedComplaints.slice(0, 5).forEach((complaint, i) => {
                console.log(`   ${i + 1}. ${complaint.description?.substring(0, 50)}...`);
                console.log(`      Status: ${complaint.status}`);
                console.log(`      Phone Status: ${complaint.phoneVerificationStatus || 'N/A'}`);
                console.log(`      Rejected At: ${complaint.rejectedAt || 'N/A'}`);
                console.log(`      Reason: ${complaint.rejectionReason || 'N/A'}`);
                console.log('');
            });
        }

        // Check recent complaints that might have been processed
        console.log('🕐 Recent complaints (last 10):');
        allComplaints.slice(0, 10).forEach((complaint, i) => {
            console.log(`   ${i + 1}. ${complaint.description?.substring(0, 40)}...`);
            console.log(`      Status: ${complaint.status}`);
            console.log(`      Category: ${categorizeComplaint(complaint)}`);
            console.log(`      Created: ${complaint.createdAt?.toISOString()}`);
            console.log(`      Phone Status: ${complaint.phoneVerificationStatus || 'N/A'}`);
            console.log('');
        });

        console.log('🎯 FINDINGS:');
        if (categorized.closed.length === 0) {
            console.log('   ❌ NO CLOSED COMPLAINTS FOUND - This explains why they don\'t show up!');
            console.log('   📋 Issue: Complaints are not getting status updated to rejected/closed properly');
        } else {
            console.log(`   ✅ Found ${categorized.closed.length} closed complaints in database`);
            console.log('   📋 Issue: Frontend is not displaying these properly');
        }

        console.log('\n🔧 NEXT ACTIONS:');
        if (categorized.closed.length === 0) {
            console.log('   1. Test phone verification rejection to ensure status updates');
            console.log('   2. Check if rejection logic is working properly');
            console.log('   3. Verify webhook is updating complaint status');
        } else {
            console.log('   1. Use the new /api/complaints/closed endpoint in frontend');
            console.log('   2. Clear frontend cache');
            console.log('   3. Check browser network requests');
        }

        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkComplaintStatus();