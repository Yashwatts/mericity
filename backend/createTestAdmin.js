const mongoose = require("mongoose");
require("dotenv").config();

const Admin = require("./models/Admin");

async function createTestAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ adminId: "admin001" });
    if (existingAdmin) {
      console.log("Test admin already exists!");
      console.log("AdminID: admin001");
      console.log("Password: admin123");
      return;
    }

    // Create test admin
    const testAdmin = new Admin({
      name: "Test Admin",
      adminId: "admin001",
      password: "admin123", // Will be hashed automatically by the pre-save hook
      assignedCity: "Udaipur",
      assignedState: "Rajasthan",
      email: "admin@test.com",
      contactNumber: "9876543210",
      officeAddress: "Test Office, Udaipur",
      isActive: true,
    });

    await testAdmin.save();
    console.log("Test admin created successfully!");
    console.log("AdminID: admin001");
    console.log("Password: admin123");
    console.log("City: Udaipur, Rajasthan");
  } catch (error) {
    console.error("Error creating test admin:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

createTestAdmin();
