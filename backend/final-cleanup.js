const mongoose = require("mongoose");
const User = require("./models/User");

require("dotenv").config();

async function finalCleanup() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Find and fix the remaining user with null email
    const usersWithNullEmail = await User.find({ email: null });
    console.log(`Found ${usersWithNullEmail.length} users with null email:`);

    for (const user of usersWithNullEmail) {
      console.log(`- User: ${user.name} (${user.phone || user.googleId})`);

      // Remove the email field entirely
      await User.updateOne({ _id: user._id }, { $unset: { email: "" } });
      console.log(`  ✅ Fixed user ${user._id}`);
    }

    // Final verification
    console.log("\n=== Final Verification ===");
    const finalNullCount = await User.countDocuments({ email: null });
    console.log(`Remaining users with null email: ${finalNullCount}`);

    const allUsers = await User.find({}).select("name phone email googleId");
    console.log("\nAll users in database:");
    allUsers.forEach((user) => {
      console.log(
        `- ${user.name || "No name"}: phone=${user.phone || "none"}, email=${
          user.email || "none"
        }, googleId=${user.googleId || "none"}`
      );
    });
  } catch (error) {
    console.error("Final cleanup error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

finalCleanup();
