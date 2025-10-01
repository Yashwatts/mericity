const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

require("dotenv").config();

async function fixDatabaseIssues() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // 1. Fix the test user password to match our test
    console.log("\n=== Fixing Test User Password ===");
    const testUser = await User.findOne({ phone: "9876543210" });
    if (testUser) {
      const hashedPassword = await bcrypt.hash("test123", 12);
      testUser.password = hashedPassword;
      await testUser.save();
      console.log("Test user password updated successfully");

      // Verify the password works now
      const isMatch = await bcrypt.compare("test123", testUser.password);
      console.log(`Password 'test123' now matches: ${isMatch}`);
    } else {
      console.log("Test user not found");
    }

    // 2. Check for duplicate email issues
    console.log("\n=== Checking for Email Duplicates ===");
    const usersWithNullEmail = await User.find({ email: null });
    console.log(`Found ${usersWithNullEmail.length} users with null email`);

    const usersWithUndefinedEmail = await User.find({
      email: { $exists: false },
    });
    console.log(
      `Found ${usersWithUndefinedEmail.length} users without email field`
    );

    // Remove email field from users who don't need it (mobile-only users)
    let fixedCount = 0;
    for (const user of usersWithNullEmail) {
      if (user.phone && !user.googleId) {
        // This is a mobile-only user, remove the email field entirely
        await User.updateOne({ _id: user._id }, { $unset: { email: "" } });
        fixedCount++;
      }
    }
    console.log(`Fixed ${fixedCount} users by removing null email fields`);

    // 3. Test creating a new user
    console.log("\n=== Testing New User Creation ===");
    const testPhone = "5555555555";

    // Clean up any existing test user first
    await User.deleteOne({ phone: testPhone });

    try {
      const userData = {
        phone: testPhone,
        password: await bcrypt.hash("testpass", 12),
        name: "Database Fix Test User",
        profileComplete: false,
        role: "user",
        // Note: NOT including email field at all for mobile-only users
      };

      const newUser = new User(userData);
      await newUser.save();

      console.log("✓ New mobile-only user created successfully:", {
        id: newUser._id,
        phone: newUser.phone,
        name: newUser.name,
        hasEmail: !!newUser.email,
        hasPassword: !!newUser.password,
      });

      // Clean up the test user
      await User.deleteOne({ _id: newUser._id });
      console.log("Test user cleaned up");
    } catch (error) {
      console.error("Error creating test user:", error.message);
    }

    // 4. Check all phone users are working
    console.log("\n=== Final Status Check ===");
    const phoneUsers = await User.find({ phone: { $exists: true, $ne: null } });
    console.log("Phone users after fix:");
    phoneUsers.forEach((user) => {
      console.log(
        `- ${
          user.phone
        }: hasEmail=${!!user.email}, hasPassword=${!!user.password}, emailValue=${
          user.email
        }`
      );
    });
  } catch (error) {
    console.error("Database fix error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

fixDatabaseIssues();
