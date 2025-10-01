const mongoose = require("mongoose");
const User = require("./models/User");
const Complaint = require("./models/Complaint");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect("mongodb+srv://rohitkhandelwal2059:rohit1027@rohit.mtrcijc.mongodb.net/");
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const checkComplaintDetails = async () => {
  try {
    await connectDB();
    
    console.log("=== Checking Specific Complaint Details ===");
    
    // Get Rohit and Ayushka
    const rohit = await User.findOne({ name: "Rohit Khandelwal" });
    const ayushka = await User.findOne({ name: "Ayushka Kumari" });
    
    console.log(`Rohit ID: ${rohit._id}`);
    console.log(`Ayushka ID: ${ayushka._id}`);
    
    // Check their recent in_progress complaints
    const problemComplaints = await Complaint.find({ 
      userId: { $in: [rohit._id, ayushka._id] },
      status: 'in_progress'
    }).sort({ updatedAt: -1 });
    
    console.log(`\n=== Problem Complaints (${problemComplaints.length}) ===`);
    problemComplaints.forEach(complaint => {
      console.log(`\n- Complaint ID: ${complaint._id}`);
      console.log(`  User: ${complaint.userId.equals(rohit._id) ? 'Rohit' : 'Ayushka'}`);
      console.log(`  Status: ${complaint.status}`);
      console.log(`  Created: ${complaint.createdAt}`);
      console.log(`  Updated: ${complaint.updatedAt}`);
      console.log(`  Assigned Department: ${complaint.assignedDepartment}`);
      console.log(`  Assigned Admin: ${complaint.assignedAdmin}`);
    });
    
    // Let's also check complaints that were successfully awarded points
    console.log(`\n=== Successfully Awarded Points Complaints ===`);
    const yash = await User.findOne({ name: "Yash" });
    const yashComplaints = await Complaint.find({ 
      userId: yash._id,
      status: 'in_progress'
    }).sort({ updatedAt: -1 }).limit(3);
    
    yashComplaints.forEach(complaint => {
      console.log(`\n- Complaint ID: ${complaint._id}`);
      console.log(`  User: Yash (${yash.points} points)`);
      console.log(`  Status: ${complaint.status}`);
      console.log(`  Updated: ${complaint.updatedAt}`);
      console.log(`  Assigned Department: ${complaint.assignedDepartment}`);
      console.log(`  Assigned Admin: ${complaint.assignedAdmin}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

checkComplaintDetails();