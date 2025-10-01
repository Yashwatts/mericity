const mongoose = require("mongoose");
const Complaint = require("./models/Complaint");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

async function deleteAllComplaints() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // First, get a count of all complaints
    console.log("\n📊 Checking current complaint data...");
    const totalComplaints = await Complaint.countDocuments();
    console.log(`Found ${totalComplaints} complaints in the database`);

    if (totalComplaints === 0) {
      console.log("✅ No complaints to delete. Database is already clean.");
      return;
    }

    // Show some sample complaints
    console.log("\n📋 Sample complaints that will be deleted:");
    const sampleComplaints = await Complaint.find()
      .populate("userId", "name phone")
      .limit(5)
      .select("description location.address status createdAt userId");

    sampleComplaints.forEach((complaint, index) => {
      console.log(`${index + 1}. ${complaint.description.substring(0, 50)}...`);
      console.log(
        `   User: ${complaint.userId?.name || "Unknown"} (${
          complaint.userId?.phone || "N/A"
        })`
      );
      console.log(
        `   Location: ${complaint.location?.address || "Not specified"}`
      );
      console.log(`   Status: ${complaint.status}`);
      console.log(`   Created: ${complaint.createdAt.toLocaleDateString()}`);
      console.log("");
    });

    // Create backup before deletion (optional)
    console.log("💾 Creating backup before deletion...");
    try {
      const backupData = await Complaint.find().lean();
      const backupFileName = `complaints_backup_${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;
      const backupPath = path.join(__dirname, backupFileName);

      fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
      console.log(`✅ Backup created: ${backupFileName}`);
    } catch (backupError) {
      console.log("⚠️  Backup creation failed:", backupError.message);
      console.log("Proceeding without backup...");
    }

    // Warning and confirmation
    console.log("\n⚠️  WARNING: This will permanently delete ALL complaints!");
    console.log("⚠️  This action cannot be undone!");
    console.log(`⚠️  ${totalComplaints} complaints will be deleted.`);

    // In a real scenario, you'd want user confirmation
    // For automated script, we'll add a safety check
    console.log("\n🔄 Proceeding with deletion...");

    // Delete all complaints
    console.log("🗑️  Deleting all complaints...");
    const deleteResult = await Complaint.deleteMany({});

    console.log(
      `✅ Successfully deleted ${deleteResult.deletedCount} complaints`
    );

    // Verify deletion
    const remainingComplaints = await Complaint.countDocuments();
    console.log(`📊 Remaining complaints in database: ${remainingComplaints}`);

    if (remainingComplaints === 0) {
      console.log("🎉 All complaints have been successfully deleted!");
    } else {
      console.log(
        `⚠️  Warning: ${remainingComplaints} complaints still remain`
      );
    }

    // Also check for related data cleanup (optional)
    console.log("\n🧹 Additional cleanup information:");
    console.log(
      "Note: This script only deletes complaints. Consider if you need to:"
    );
    console.log("- Clean up uploaded complaint images in the uploads folder");
    console.log("- Clean up any complaint-related notifications");
    console.log("- Reset user points if they were earned from complaints");
  } catch (error) {
    console.error("❌ Error deleting complaints:", error);
    console.error("Error details:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("\n🔌 Database connection closed");
  }
}

// Add safety check - only run if explicitly called
if (require.main === module) {
  console.log("🚀 COMPLAINT DELETION SCRIPT");
  console.log("===========================\n");

  deleteAllComplaints()
    .then(() => {
      console.log("\n✨ Script completed successfully!");
    })
    .catch((error) => {
      console.error("\n💥 Script failed:", error);
      process.exit(1);
    });
} else {
  module.exports = deleteAllComplaints;
}
