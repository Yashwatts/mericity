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

const retroactivelyAwardPoints = async () => {
  try {
    await connectDB();
    
    console.log("=== Retroactively Awarding Points ===");
    
    // Find users with 0 points who have approved complaints
    const usersWithZeroPoints = await User.find({ points: 0 });
    console.log(`Found ${usersWithZeroPoints.length} users with 0 points`);
    
    let pointsAwarded = 0;
    let usersUpdated = 0;
    
    for (const user of usersWithZeroPoints) {
      // Find their approved complaints (in_progress status)
      const approvedComplaints = await Complaint.find({ 
        userId: user._id, 
        status: 'in_progress' 
      });
      
      if (approvedComplaints.length > 0) {
        console.log(`\n📋 User: ${user.name} (${user.email || user.phone})`);
        console.log(`   Approved complaints: ${approvedComplaints.length}`);
        
        const pointsToAward = approvedComplaints.length * 5;
        
        // Update user points
        user.points = pointsToAward;
        if (!user.pointsHistory) {
          user.pointsHistory = [];
        }
        
        // Add points history entries for each complaint
        approvedComplaints.forEach(complaint => {
          user.pointsHistory.push({
            points: 5,
            reason: "Retroactive points for complaint approval",
            complaintId: complaint._id,
            awardedAt: new Date(),
          });
        });
        
        await user.save();
        
        console.log(`   ✅ Awarded ${pointsToAward} points`);
        pointsAwarded += pointsToAward;
        usersUpdated++;
      } else {
        console.log(`\n📋 User: ${user.name} - No approved complaints found`);
      }
    }
    
    console.log(`\n🎉 Summary:`);
    console.log(`   Users updated: ${usersUpdated}`);
    console.log(`   Total points awarded: ${pointsAwarded}`);
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

retroactivelyAwardPoints();