const mongoose = require("mongoose");
const Complaint = require("./models/Complaint");

require("dotenv").config();

async function deleteAllComplaints() {
  try {
    console.log("🚀 COMPLAINT DELETION SCRIPT");
    console.log("============================");

    console.log("\n🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Count complaints before deletion
    const totalComplaints = await Complaint.countDocuments();
    console.log(`\n📊 Found ${totalComplaints} complaints in the database`);

    if (totalComplaints === 0) {
      console.log("✅ No complaints to delete. Database is already clean.");
      return;
    }

    // Show breakdown by status
    console.log("\n📈 Complaints breakdown:");
    const statusCounts = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    statusCounts.forEach((status) => {
      console.log(`   • ${status._id}: ${status.count} complaints`);
    });

    console.log(
      `\n⚠️  WARNING: About to delete ALL ${totalComplaints} complaints!`
    );
    console.log("⚠️  This action cannot be undone!");

    console.log("\n🗑️  Deleting all complaints...");

    // Perform the deletion
    const startTime = Date.now();
    const deleteResult = await Complaint.deleteMany({});
    const endTime = Date.now();

    console.log(
      `✅ Successfully deleted ${deleteResult.deletedCount} complaints`
    );
    console.log(`⏱️  Operation completed in ${endTime - startTime}ms`);

    // Verify deletion
    const remainingComplaints = await Complaint.countDocuments();
    console.log(
      `\n🔍 Verification: ${remainingComplaints} complaints remaining`
    );

    if (remainingComplaints === 0) {
      console.log(
        "🎉 SUCCESS: All complaints have been deleted from the database!"
      );
    } else {
      console.log(
        `⚠️  WARNING: ${remainingComplaints} complaints still remain in the database`
      );
    }

    // Additional cleanup notes
    console.log("\n📋 CLEANUP NOTES:");
    console.log("✅ Complaint records: DELETED");
    console.log("⚠️  Uploaded files: Still exist in uploads/ folder");
    console.log("⚠️  User data: Preserved (users not affected)");
    console.log("⚠️  Admin data: Preserved (admins not affected)");
  } catch (error) {
    console.error("\n❌ ERROR during deletion:");
    console.error("Error message:", error.message);
    console.error("Error details:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
    console.log("✨ Script execution completed");
  }
}

// Execute the deletion
deleteAllComplaints().catch((error) => {
  console.error("💥 Script failed:", error);
  process.exit(1);
});
