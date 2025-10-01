const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const User = require('./models/User');

// Connect to MongoDB
async function testWarningComplaints() {
  try {
    await mongoose.connect('mongodb+srv://rohitkhandelwal2059:rohit1027@rohit.mtrcijc.mongodb.net/');
    console.log('Connected to MongoDB');
    
    const targetUserId = '68d1852b30b8f1b157bff27f'; // User Yash who has warnings
    
    // Get user details
    const user = await User.findById(targetUserId);
    console.log(`\nUser Details:`);
    console.log(`- Name: ${user.name}`);
    console.log(`- Phone: ${user.phone}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Warnings: ${user.warnings.count}`);
    
    // Find all complaints for this user
    const userComplaints = await Complaint.find({ userId: targetUserId });
    console.log(`\nAll complaints for user ${user.name}: ${userComplaints.length}`);
    
    userComplaints.forEach(complaint => {
      console.log(`- ID: ${complaint._id}`);
      console.log(`  Status: ${complaint.status}`);
      console.log(`  Rejection Reason: ${complaint.rejectionReason || 'N/A'}`);
      console.log(`  Created: ${complaint.createdAt}`);
      console.log(`  Rejected At: ${complaint.rejectedAt || 'N/A'}`);
      console.log(`  Admin Comment: ${complaint.adminComment || 'N/A'}`);
      console.log('---');
    });
    
    // Check specifically rejected complaints for this user
    const rejectedComplaints = await Complaint.find({ 
      userId: targetUserId, 
      status: 'rejected' 
    });
    
    console.log(`\nRejected complaints for user ${user.name}: ${rejectedComplaints.length}`);
    rejectedComplaints.forEach(complaint => {
      console.log(`- Status: ${complaint.status}, Reason: ${complaint.rejectionReason}`);
    });
    
    // Test what the API would return
    const apiComplaints = await Complaint.find({ userId: targetUserId })
      .populate('assignedDepartment', 'name departmentType assignedCity assignedState')
      .populate('assignedAdmin', 'name assignedCity assignedState')
      .sort({ createdAt: -1 });
    
    console.log(`\nAPI Response would include ${apiComplaints.length} complaints:`);
    apiComplaints.forEach(complaint => {
      console.log(`- ID: ${complaint._id.toString().substring(0, 8)}..., Status: ${complaint.status}, RejectionReason: ${complaint.rejectionReason || 'N/A'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testWarningComplaints();