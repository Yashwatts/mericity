const mongoose = require("mongoose");
const Department = require("./models/Department");
const Admin = require("./models/Admin");
const departmentDetectionService = require("./services/departmentDetectionService");

require("dotenv").config();

async function testFireRouting() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Test 1: Check if any Fire Departments exist
    console.log("\n=== CHECKING FIRE DEPARTMENTS ===");
    const fireDepts = await Department.find({ 
      departmentType: "Fire Department",
      isActive: true 
    });
    
    console.log(`Found ${fireDepts.length} Fire Departments:`);
    fireDepts.forEach(dept => {
      console.log(`- ${dept.name} (${dept.assignedCity}, ${dept.assignedState})`);
    });

    // Test 2: Check all admins
    console.log("\n=== CHECKING ADMINS ===");
    const admins = await Admin.find({ isActive: true });
    console.log(`Found ${admins.length} Admins:`);
    admins.forEach(admin => {
      console.log(`- ${admin.name} (${admin.assignedCity}, ${admin.assignedState})`);
    });

    // Test 3: Test department detection for "fire"
    console.log("\n=== TESTING DEPARTMENT DETECTION FOR 'fire' ===");
    const testDescription = "fire";
    
    const detectionResult = await departmentDetectionService.detectDepartment(
      testDescription, 
      "", 
      { city: "Unknown", state: "Unknown" }
    );
    
    console.log("Detection Result:", detectionResult);

    // Test 4: Test full routing for "fire"
    console.log("\n=== TESTING FULL ROUTING FOR 'fire' ===");
    const routingResult = await departmentDetectionService.routeComplaintToDepartment({
      description: testDescription,
      category: "",
      location: {
        city: "Unknown",
        state: "Unknown"
      }
    });
    
    console.log("Routing Result:", JSON.stringify(routingResult, null, 2));

    // Test 5: Test with a sample city that might have departments
    if (admins.length > 0) {
      const sampleAdmin = admins[0];
      console.log(`\n=== TESTING ROUTING WITH CITY: ${sampleAdmin.assignedCity} ===`);
      
      const cityRoutingResult = await departmentDetectionService.routeComplaintToDepartment({
        description: "fire emergency",
        category: "",
        location: {
          city: sampleAdmin.assignedCity,
          state: sampleAdmin.assignedState
        }
      });
      
      console.log("City Routing Result:", JSON.stringify(cityRoutingResult, null, 2));
    }

  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("\nConnection closed");
  }
}

testFireRouting();