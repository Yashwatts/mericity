const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-india-hackathon')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const Complaint = require('./models/Complaint');
const Department = require('./models/Department');

async function assignComplaintsToDepartments() {
  try {
    console.log('=== MANUALLY ASSIGNING COMPLAINTS TO DEPARTMENTS ===\n');

    // Get departments
    const roadDept = await Department.findOne({ departmentType: 'Road Department' });
    const garbageDept = await Department.findOne({ departmentType: 'Garbage Department' });
    const fireDept = await Department.findOne({ departmentType: 'Fire Department' });

    if (!roadDept || !garbageDept || !fireDept) {
      console.log('❌ Could not find required departments');
      return;
    }

    console.log('Found departments:');
    console.log(`  - Road: ${roadDept.name} (${roadDept._id})`);
    console.log(`  - Garbage: ${garbageDept.name} (${garbageDept._id})`);
    console.log(`  - Fire: ${fireDept.name} (${fireDept._id})`);
    console.log();

    // Find unassigned complaints
    const unassignedComplaints = await Complaint.find({
      assignedDepartment: { $exists: false },
      status: { $in: ['pending', 'pending_manual_verification'] }
    }).limit(10);

    console.log(`Found ${unassignedComplaints.length} unassigned complaints to process`);

    let assigned = 0;
    
    for (const complaint of unassignedComplaints) {
      let targetDept = null;
      const desc = complaint.description.toLowerCase();
      
      if (desc.includes('road') || desc.includes('pothole') || desc.includes('street')) {
        targetDept = roadDept;
      } else if (desc.includes('garbage') || desc.includes('waste') || desc.includes('trash')) {
        targetDept = garbageDept;
      } else if (desc.includes('fire') || desc.includes('emergency')) {
        targetDept = fireDept;
      } else {
        // Default to garbage department for general complaints
        targetDept = garbageDept;
      }

      // Assign complaint to department
      complaint.assignedDepartment = targetDept._id;
      complaint.status = 'in_progress';
      complaint.assignedAt = new Date();
      
      await complaint.save();
      
      // Award points to user for complaint approval
      try {
        const User = require("./models/User");
        const user = await User.findById(complaint.userId);
        if (user) {
          user.points = (user.points || 0) + 5;
          if (!user.pointsHistory) {
            user.pointsHistory = [];
          }
          user.pointsHistory.push({
            points: 5,
            reason: "Complaint approved via script assignment",
            complaintId: complaint._id,
            awardedAt: new Date(),
          });
          await user.save();
          console.log(`     ✅ Awarded 5 points to user for complaint approval`);
        }
      } catch (pointsError) {
        console.error("     Failed to award points:", pointsError);
      }
      
      console.log(`  ✅ Assigned complaint ${complaint._id} to ${targetDept.name}`);
      console.log(`     Description: ${complaint.description.substring(0, 60)}...`);
      assigned++;
    }

    console.log(`\n✅ Successfully assigned ${assigned} complaints to departments`);

  } catch (error) {
    console.error('Assignment error:', error);
  } finally {
    mongoose.disconnect();
  }
}

assignComplaintsToDepartments();