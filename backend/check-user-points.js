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

const checkUserPoints = async () => {
  try {
    await connectDB();
    
    console.log("=== Checking User Points ===");
    
    // Find users with points
    const usersWithPoints = await User.find({ points: { $gt: 0 } }).select('name email phone points pointsHistory');
    console.log(`\nUsers with points (${usersWithPoints.length}):`);
    usersWithPoints.forEach(user => {
      console.log(`- ${user.name} (${user.email || user.phone}): ${user.points} points`);
      if (user.pointsHistory && user.pointsHistory.length > 0) {
        console.log(`  Last point entry: ${user.pointsHistory[user.pointsHistory.length - 1].reason} - ${user.pointsHistory[user.pointsHistory.length - 1].points} points`);
      }
    });
    
    // Check complaints with "in_progress" status
    console.log("\n=== Checking In-Progress Complaints ===");
    const inProgressComplaints = await Complaint.find({ status: 'in_progress' }).select('_id description userId status createdAt updatedAt');
    console.log(`\nIn-progress complaints (${inProgressComplaints.length}):`);
    for (let complaint of inProgressComplaints) {
      const user = await User.findById(complaint.userId).select('name email phone points');
      console.log(`- Complaint ${complaint._id.toString().slice(-6)}: ${complaint.description.substring(0, 50)}...`);
      console.log(`  User: ${user ? `${user.name} (${user.points} points)` : 'Not found'}`);
      console.log(`  Status changed at: ${complaint.updatedAt}`);
    }
    
    // Check all users and their points
    console.log("\n=== All Users Points Summary ===");
    const allUsers = await User.find({}).select('name email phone points');
    const totalUsers = allUsers.length;
    const usersWithPointsCount = allUsers.filter(u => u.points > 0).length;
    const totalPoints = allUsers.reduce((sum, u) => sum + (u.points || 0), 0);
    
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with points: ${usersWithPointsCount}`);
    console.log(`Total points distributed: ${totalPoints}`);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

checkUserPoints();