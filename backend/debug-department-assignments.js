const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-india-hackathon')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const Complaint = require('./models/Complaint');
const Department = require('./models/Department');

async function debugDepartmentAssignments() {
  try {
    console.log('=== DEBUGGING DEPARTMENT ASSIGNMENTS ===\n');

    // Get all departments
    const departments = await Department.find({}).select('_id name departmentType');
    console.log('Available Departments:');
    departments.forEach(dept => {
      console.log(`  - ${dept.name} (${dept.departmentType}) - ID: ${dept._id}`);
    });
    console.log();

    // Get all complaints with department assignments
    const complaints = await Complaint.find({})
      .select('_id description assignedDepartment status')
      .populate('assignedDepartment', 'name departmentType')
      .limit(20)
      .sort({ createdAt: -1 });

    console.log(`Recent ${complaints.length} complaints:`)
    complaints.forEach(complaint => {
      const deptInfo = complaint.assignedDepartment 
        ? `${complaint.assignedDepartment.name} (${complaint.assignedDepartment.departmentType})`
        : 'NOT ASSIGNED';
      
      console.log(`  - ${complaint._id} | ${complaint.status} | Dept: ${deptInfo}`);
      console.log(`    Description: ${complaint.description.substring(0, 50)}...`);
    });
    console.log();

    // Count complaints by assignment status
    const totalComplaints = await Complaint.countDocuments({});
    const assignedComplaints = await Complaint.countDocuments({ assignedDepartment: { $exists: true, $ne: null } });
    const unassignedComplaints = totalComplaints - assignedComplaints;

    console.log('ASSIGNMENT STATISTICS:');
    console.log(`  Total complaints: ${totalComplaints}`);
    console.log(`  Assigned to departments: ${assignedComplaints}`);
    console.log(`  Unassigned: ${unassignedComplaints}`);
    console.log(`  Assignment rate: ${((assignedComplaints/totalComplaints)*100).toFixed(1)}%`);

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugDepartmentAssignments();