const mongoose = require("mongoose");
const User = require("./models/User");
const Complaint = require("./models/Complaint");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://rohitkhandelwal2059:rohit1027@rohit.mtrcijc.mongodb.net/");
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const checkSpecificUserPoints = async () => {
  try {
    await connectDB();
    
    console.log("=== Checking Specific User Points Issue ===");
    
    // Check Ayushka Kumari
    const ayushka = await User.findOne({ name: "Ayushka Kumari" });
    console.log("\n--- Ayushka Kumari ---");
    console.log(`Name: ${ayushka.name}`);
    console.log(`Points: ${ayushka.points}`);
    console.log(`Points History Length: ${ayushka.pointsHistory ? ayushka.pointsHistory.length : 0}`);
    
    if (ayushka.pointsHistory && ayushka.pointsHistory.length > 0) {
      console.log("Points History:");
      ayushka.pointsHistory.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.points} points - ${entry.reason} (${entry.awardedAt})`);
      });
    }
    
    // Check her complaints
    const ayushkaComplaints = await Complaint.find({ userId: ayushka._id }).sort({ updatedAt: -1 });
    console.log(`\nAyushka's complaints (${ayushkaComplaints.length}):`);
    ayushkaComplaints.slice(0, 5).forEach(complaint => {
      console.log(`- ${complaint._id.toString().slice(-6)}: ${complaint.status} (Updated: ${complaint.updatedAt})`);
    });
    
    // Check Rohit Khandelwal
    const rohit = await User.findOne({ name: "Rohit Khandelwal" });
    console.log("\n--- Rohit Khandelwal ---");
    console.log(`Name: ${rohit.name}`);
    console.log(`Points: ${rohit.points}`);
    console.log(`Points History Length: ${rohit.pointsHistory ? rohit.pointsHistory.length : 0}`);
    
    if (rohit.pointsHistory && rohit.pointsHistory.length > 0) {
      console.log("Points History:");
      rohit.pointsHistory.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.points} points - ${entry.reason} (${entry.awardedAt})`);
      });
    }
    
    // Check his complaints
    const rohitComplaints = await Complaint.find({ userId: rohit._id }).sort({ updatedAt: -1 });
    console.log(`\nRohit's complaints (${rohitComplaints.length}):`);
    rohitComplaints.slice(0, 5).forEach(complaint => {
      console.log(`- ${complaint._id.toString().slice(-6)}: ${complaint.status} (Updated: ${complaint.updatedAt})`);
    });
    
    // Let's also check the most recent complaint that was approved
    console.log("\n=== Most Recent Approved Complaints ===");
    const recentApproved = await Complaint.find({ status: 'in_progress' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('userId', 'name points');
      
    recentApproved.forEach(complaint => {
      console.log(`- ${complaint._id.toString().slice(-6)}: User ${complaint.userId ? complaint.userId.name + ' (' + complaint.userId.points + ' points)' : 'Not found'} - Updated: ${complaint.updatedAt}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

checkSpecificUserPoints();