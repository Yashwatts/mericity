const mongoose = require("mongoose");
const User = require("./models/User");

require("dotenv").config();

async function forceFixDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Use direct MongoDB operations to fix this
    const collection = mongoose.connection.db.collection("users");

    console.log("=== Force updating all null emails ===");

    // Update all documents that have email: null to not have the email field at all
    const result = await collection.updateMany(
      { email: null },
      { $unset: { email: 1 } }
    );
    console.log(`Updated ${result.modifiedCount} documents`);

    // Also update any documents with email: undefined
    const result2 = await collection.updateMany(
      { email: { $type: 10 } }, // type 10 is null in BSON
      { $unset: { email: 1 } }
    );
    console.log(
      `Updated ${result2.modifiedCount} documents with undefined email`
    );

    // Verify by checking with MongoDB directly
    const nullEmailUsers = await collection.find({ email: null }).toArray();
    console.log(`Users with null email remaining: ${nullEmailUsers.length}`);

    const noEmailUsers = await collection
      .find({ email: { $exists: false } })
      .toArray();
    console.log(`Users without email field: ${noEmailUsers.length}`);

    // Test creating a new user
    console.log("\n=== Testing User Creation ===");
    const testPhone = "8765432109";

    // Clean up first
    await collection.deleteOne({ phone: testPhone });

    try {
      const testUser = {
        phone: testPhone,
        password: "$2b$12$test.hashed.password.here",
        name: "Registration Test User",
        role: "user",
        profileComplete: false,
        points: 0,
        pointsHistory: [],
      };

      const insertResult = await collection.insertOne(testUser);
      console.log(
        "✅ Successfully created test user:",
        insertResult.insertedId
      );

      // Clean up
      await collection.deleteOne({ _id: insertResult.insertedId });
      console.log("✅ Test user cleaned up");
    } catch (error) {
      console.log("❌ User creation failed:", error.message);
    }
  } catch (error) {
    console.error("Force fix error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nDatabase connection closed");
  }
}

forceFixDatabase();
