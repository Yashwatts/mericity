const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

require("dotenv").config();

async function testRegistrationLogic() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const testPhone = "8765432109";
    const testPassword = "test456";
    const testName = "Direct Test User";

    console.log("\n=== Direct Registration Test ===");
    console.log(`Testing: ${testPhone}, ${testPassword}, ${testName}`);

    // Clean up any existing user first
    await User.deleteOne({ phone: testPhone });
    console.log("Cleaned up any existing user with this phone");

    try {
      // Check if user already exists with this phone
      const existingUser = await User.findOne({ phone: testPhone });
      console.log("Phone check result:", !!existingUser);

      if (existingUser) {
        console.log(
          "User already exists - this should not happen after cleanup"
        );
        return;
      }

      // Create user data
      const hashed = await bcrypt.hash(testPassword, 12);
      const userData = {
        password: hashed,
        name: testName,
        profileComplete: false,
        role: "user",
        phone: testPhone,
        // Not setting email field at all
      };

      console.log("Creating user with data:", {
        ...userData,
        password: "[HASHED]",
      });

      const user = new User(userData);

      // Validate before saving
      const validationError = user.validateSync();
      if (validationError) {
        console.log("Validation Error:", validationError);
        return;
      }

      await user.save();

      console.log("✅ User created successfully:", {
        id: user._id,
        phone: user.phone,
        name: user.name,
        hasPassword: !!user.password,
        email: user.email,
        profileComplete: user.profileComplete,
      });

      // Test login immediately
      console.log("\n=== Testing Login for New User ===");
      const loginUser = await User.findOne({ phone: testPhone });
      if (loginUser && loginUser.password) {
        const passwordMatch = await bcrypt.compare(
          testPassword,
          loginUser.password
        );
        console.log(`✅ Login test - Password matches: ${passwordMatch}`);
      } else {
        console.log("❌ Login test - User or password not found");
      }

      // Clean up
      await User.deleteOne({ _id: user._id });
      console.log("✅ Test user cleaned up");
    } catch (error) {
      console.error("❌ Registration error:", error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      if (error.code) {
        console.error("Error code:", error.code);
      }
      if (error.errors) {
        console.error("Validation errors:", error.errors);
      }
      console.error("Error stack:", error.stack);
    }
  } catch (error) {
    console.error("Database connection error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

testRegistrationLogic();
