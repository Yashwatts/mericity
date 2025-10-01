const mongoose = require("mongoose");
const Complaint = require("./models/Complaint");
const User = require("./models/User");

require("dotenv").config();

async function checkComplaints() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const totalComplaints = await Complaint.countDocuments();
    console.log(`\n📊 Total complaints in database: ${totalComplaints}`);

    if (totalComplaints > 0) {
      console.log("\n📋 Recent complaints (without populate to avoid errors):");
      const recentComplaints = await Complaint.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select("description location.address status createdAt userId");

      recentComplaints.forEach((complaint, index) => {
        console.log(
          `${index + 1}. ${complaint.description.substring(0, 60)}...`
        );
        console.log(`   Status: ${complaint.status}`);
        console.log(`   Created: ${complaint.createdAt.toLocaleDateString()}`);
        console.log(
          `   Location: ${complaint.location?.address || "Not specified"}`
        );
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

      console.log("\n📅 Complaints by date:");
      const dateCounts = await Complaint.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
        { $limit: 7 },
      ]);
      dateCounts.forEach((date) => {
        console.log(
          `   ${date._id.year}-${String(date._id.month).padStart(
            2,
            "0"
          )}-${String(date._id.day).padStart(2, "0")}: ${date.count} complaints`
        );
      });
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

checkComplaints();
