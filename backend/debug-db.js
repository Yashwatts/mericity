const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

require("dotenv").config();

async function debugDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check all users with phone numbers
    const usersWithPhone = await User.find({
      phone: { $exists: true, $ne: null },
    });
    console.log("\n=== Users with Phone Numbers ===");
    for (const user of usersWithPhone) {
      console.log(`Phone: ${user.phone}`);
      console.log(`Name: ${user.name || "Not set"}`);
      console.log(`Email: ${user.email || "Not set"}`);
      console.log(`Has Password: ${!!user.password}`);
      console.log(`Google ID: ${user.googleId || "None"}`);
      console.log(`Profile Complete: ${user.profileComplete}`);
      console.log(`Created: ${user._id.getTimestamp()}`);
      console.log("---");
    }

    // Specifically check the 9876543210 user
    const testUser = await User.findOne({ phone: "9876543210" });
    if (testUser) {
      console.log("\n=== Test User (9876543210) Details ===");
      console.log(`ID: ${testUser._id}`);
      console.log(`Phone: ${testUser.phone}`);
      console.log(`Name: ${testUser.name}`);
      console.log(`Email: ${testUser.email || "None"}`);
      console.log(`Has Password: ${!!testUser.password}`);
      console.log(
        `Password Hash Length: ${
          testUser.password ? testUser.password.length : 0
        }`
      );
      console.log(`Google ID: ${testUser.googleId || "None"}`);
      console.log(`Profile Complete: ${testUser.profileComplete}`);

      // Test password comparison
      if (testUser.password) {
        const isMatch = await bcrypt.compare("test123", testUser.password);
        console.log(`Password 'test123' matches: ${isMatch}`);
      }
    } else {
      console.log("\n=== Test User (9876543210) Not Found ===");
    }

    // Test creating a new user with phone
    console.log("\n=== Testing New User Creation ===");
    try {
      const testPhone = "7777777777";

      // First delete if exists
      await User.deleteOne({ phone: testPhone });

      const userData = {
        phone: testPhone,
        password: await bcrypt.hash("testpass", 12),
        name: "Debug Test User",
        profileComplete: false,
        role: "user",
      };

      console.log("Creating user with data:", {
        ...userData,
        password: "[HASHED]",
      });

      const newUser = new User(userData);
      await newUser.save();

      console.log("New user created successfully:", {
        id: newUser._id,
        phone: newUser.phone,
        name: newUser.name,
        hasPassword: !!newUser.password,
      });

      // Clean up
      await User.deleteOne({ _id: newUser._id });
      console.log("Test user cleaned up");
    } catch (error) {
      console.error("Error creating test user:", error);
      console.error("Validation errors:", error.errors);
    }
  } catch (error) {
    console.error("Database debug error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

debugDatabase();
