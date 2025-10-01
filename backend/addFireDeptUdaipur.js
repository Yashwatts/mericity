const mongoose = require('mongoose');
const Department = require('./models/Department');
require('dotenv').config();

const addFireDepartmentUdaipur = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Create Fire Department for Udaipur
    const udaipurFireDept = new Department({
      name: "Udaipur Fire Services",
      departmentId: "FIRE_UDR_001", 
      password: "fireudaipur123", // Will be hashed by pre-save hook
      departmentType: "Fire Department",
      assignedCity: "Udaipur",
      assignedState: "Rajasthan", 
      assignedDistrict: "Udaipur",
      email: "fire.udaipur@rajasthan.gov.in",
      contactNumber: "9414123456",
      officeAddress: "Fire Station, City Palace Road, Udaipur, Rajasthan 313001",
      headOfDepartment: "Chief Fire Officer Arjun Singh Rathore", 
      establishedYear: 1965,
      serviceAreas: ["Emergency Response", "Fire Prevention", "Rescue Operations", "Industrial Safety"],
      role: "department",
      isActive: true
    });

    await udaipurFireDept.save();
    console.log('Fire Department Udaipur added successfully:', udaipurFireDept);

  } catch (error) {
    console.error('Error adding Fire Department:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the script
addFireDepartmentUdaipur();