const mongoose = require('mongoose');
require('dotenv').config();
const Complaint = require('./models/Complaint');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  try {
    // Check existing rejected complaints
    const rejectedComplaints = await Complaint.find({ status: 'rejected' });
    console.log(`Found ${rejectedComplaints.length} rejected complaints`);
    
    if (rejectedComplaints.length > 0) {
      console.log('Sample rejected complaint:', {
        id: rejectedComplaints[0]._id,
        status: rejectedComplaints[0].status,
        rejectionReason: rejectedComplaints[0].rejectionReason,
        description: rejectedComplaints[0].description.substring(0, 50) + '...'
      });
    }
    
    // Count all statuses
    const statusCounts = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('\nComplaint status distribution:');
    statusCounts.forEach(item => {
      console.log(`${item._id}: ${item.count}`);
    });
    
    // If no rejected complaints exist, let's find a pending one and reject it for testing
    if (rejectedComplaints.length === 0) {
      const pendingComplaint = await Complaint.findOne({ status: 'pending' });
      if (pendingComplaint) {
        console.log('\nNo rejected complaints found. Creating one for testing...');
        pendingComplaint.status = 'rejected';
        pendingComplaint.rejectionReason = 'Test rejection - incomplete information provided';
        pendingComplaint.updatedAt = new Date();
        await pendingComplaint.save();
        console.log('Created test rejected complaint:', pendingComplaint._id);
      } else {
        console.log('No pending complaints found to convert for testing');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}).catch(err => {
  console.error('Database connection error:', err);
  process.exit(1);
});