require("dotenv").config();
const mongoose = require("mongoose");
const Complaint = require("./models/Complaint");

async function debugComplaint() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");

    const complaintId = "68d1bdfe47184dec51f05e3e";
    const complaint = await Complaint.findById(complaintId)
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email')
      .populate('assignedDepartment', 'name email departmentType');

    if (complaint) {
      console.log("=== COMPLAINT DEBUG ===");
      console.log("ID:", complaint._id);
      console.log("Status:", complaint.status);
      console.log("User:", complaint.userId ? complaint.userId.name : 'Not found');
      console.log("Assigned Admin:", complaint.assignedAdmin ? complaint.assignedAdmin.name : 'Not assigned');
      console.log("Assigned Department:", complaint.assignedDepartment ? complaint.assignedDepartment.name : 'Not assigned');
      console.log("Department Type:", complaint.assignedDepartment ? complaint.assignedDepartment.departmentType : 'N/A');
      console.log("Location:", complaint.location);
      console.log("Description:", complaint.description.substring(0, 100) + "...");
    } else {
      console.log("Complaint not found!");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

debugComplaint();