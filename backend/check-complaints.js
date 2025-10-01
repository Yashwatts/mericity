const mongoose = require("mongoose");
const Complaint = require("./models/Complaint");

require("dotenv").config();

async function checkComplaints() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const totalComplaints = await Complaint.countDocuments();
    console.log(`\n📊 Total complaints in database: ${totalComplaints}`);

    if (totalComplaints > 0) {
      console.log("\n📋 Recent complaints:");
      const recentComplaints = await Complaint.find()
        .populate("userId", "name phone")
        .sort({ createdAt: -1 })
        .limit(10)
        .select("description location.address status createdAt userId");

      recentComplaints.forEach((complaint, index) => {
        console.log(
          `${index + 1}. ${complaint.description.substring(0, 60)}...`
        );
        console.log(`   User: ${complaint.userId?.name || "Unknown"}`);
        console.log(`   Status: ${complaint.status}`);
        console.log(`   Created: ${complaint.createdAt.toLocaleDateString()}`);
        console.log("");
      });

      console.log("\n📈 Complaints by status:");
      const statusCounts = await Complaint.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);
      statusCounts.forEach((status) => {
        console.log(`   ${status._id}: ${status.count}`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

checkComplaints();
