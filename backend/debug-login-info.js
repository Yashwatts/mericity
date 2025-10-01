const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-india-hackathon')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

const Complaint = require('./models/Complaint');
const Department = require('./models/Department');

async function checkDepartmentLogin() {
  try {
    console.log('=== DEPARTMENT LOGIN INFORMATION ===\n');

    // Get all departments with their login credentials
    const departments = await Department.find({}).select('_id name departmentId departmentType assignedCity');
    
    console.log('Available Departments for Login:');
    console.log('Format: Department ID | Password | Name | Type | City\n');
    
    departments.forEach(dept => {
      // The password is typically the departmentId itself for testing
      console.log(`${dept.departmentId} | ${dept.departmentId} | ${dept.name} | ${dept.departmentType} | ${dept.assignedCity}`);
    });
    
    console.log('\n=== ASSIGNED COMPLAINTS PER DEPARTMENT ===\n');
    
    for (const dept of departments) {
      const complaints = await Complaint.find({ 
        assignedDepartment: dept._id 
      }).select('_id description status').limit(5);
      
      console.log(`${dept.name} (${dept.departmentType}):`);
      console.log(`  Department ID for login: ${dept.departmentId}`);
      console.log(`  Assigned complaints: ${complaints.length}`);
      
      if (complaints.length > 0) {
        complaints.forEach((complaint, index) => {
          console.log(`    ${index + 1}. ${complaint._id} | ${complaint.status} | ${complaint.description.substring(0, 40)}...`);
        });
      } else {
        console.log(`    No complaints assigned`);
      }
      console.log();
    }

  } catch (error) {
    console.error('Debug error:', error);
  } finally {
    mongoose.disconnect();
  }
}

checkDepartmentLogin();