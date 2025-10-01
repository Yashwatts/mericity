const mongoose = require("mongoose");
const User = require("./models/User");

require("dotenv").config();

async function fixEmailIndex() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get the User collection
    const collection = mongoose.connection.db.collection("users");

    console.log("\n=== Current Index Information ===");
    const indexes = await collection.indexes();
    console.log("Current indexes:");
    indexes.forEach((index) => {
      console.log(
        `- ${index.name}:`,
        index.key,
        index.sparse ? "(sparse)" : ""
      );
    });

    console.log("\n=== Checking Email Field Issues ===");

    // Count users with null email
    const nullEmailCount = await User.countDocuments({ email: null });
    console.log(`Users with email: null - ${nullEmailCount}`);

    // Count users with undefined email
    const undefinedEmailCount = await User.countDocuments({
      email: { $exists: false },
    });
    console.log(`Users without email field - ${undefinedEmailCount}`);

    // Count users with empty string email
    const emptyEmailCount = await User.countDocuments({ email: "" });
    console.log(`Users with empty email - ${emptyEmailCount}`);

    console.log("\n=== Fixing Email Constraint Issues ===");

    // Method 1: Remove null email values and replace with undefined (removes field entirely)
    const result1 = await User.updateMany(
      { email: null },
      { $unset: { email: "" } }
    );
    console.log(`Removed 'email: null' from ${result1.modifiedCount} users`);

    // Method 2: Remove empty string email values
    const result2 = await User.updateMany(
      { email: "" },
      { $unset: { email: "" } }
    );
    console.log(`Removed 'email: ""' from ${result2.modifiedCount} users`);

    console.log("\n=== Recreating Email Index ===");

    try {
      // Drop the existing email index
      await collection.dropIndex("email_1");
      console.log("✅ Dropped existing email index");
    } catch (error) {
      console.log("Index might not exist:", error.message);
    }

    // Create a new sparse unique index on email
    await collection.createIndex(
      { email: 1 },
      {
        unique: true,
        sparse: true,
        name: "email_1",
      }
    );
    console.log("✅ Created new sparse unique index on email");

    console.log("\n=== Verification ===");

    // Count remaining problematic emails
    const finalNullCount = await User.countDocuments({ email: null });
    const finalEmptyCount = await User.countDocuments({ email: "" });
    console.log(`Remaining null emails: ${finalNullCount}`);
    console.log(`Remaining empty emails: ${finalEmptyCount}`);

    // Test creating a user without email
    console.log("\n=== Test User Creation ===");

    const testPhone = "8765432109";
    await User.deleteOne({ phone: testPhone });

    try {
      const testUser = new User({
        phone: testPhone,
        password: "hashedpassword",
        name: "Test User",
        role: "user",
        profileComplete: false,
        // No email field at all
      });

      await testUser.save();
      console.log("✅ Successfully created user without email field");

      // Clean up
      await User.deleteOne({ _id: testUser._id });
      console.log("✅ Test user cleaned up");
    } catch (error) {
      console.log("❌ User creation still failing:", error.message);
    }
  } catch (error) {
    console.error("Fix email index error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

fixEmailIndex();
