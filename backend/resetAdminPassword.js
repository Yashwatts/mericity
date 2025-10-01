const mongoose = require("mongoose");
require("dotenv").config();

async function resetAdminPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const Admin = require("./models/Admin");

    // Find the existing admin with ID "1002"
    const admin = await Admin.findOne({ adminId: "1002" });

    if (!admin) {
      console.log("Admin with ID 1002 not found!");
      return;
    }

    console.log("Found admin:", admin.name, "(", admin.email, ")");

    // Reset password and fill missing fields
    admin.password = "admin123"; // This will be hashed automatically by the pre-save hook
    admin.officeAddress =
      admin.officeAddress || "Admin Office, Udaipur, Rajasthan";
    admin.contactNumber = admin.contactNumber || "9876543210";
    await admin.save();

    console.log("✅ Password reset successfully!");
    console.log("Login credentials:");
    console.log("AdminID: 1002");
    console.log("Password: admin123");
    console.log("City: Udaipur, Rajasthan");
  } catch (error) {
    console.error("Error resetting admin password:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

resetAdminPassword();
