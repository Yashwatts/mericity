const mongoose = require("mongoose");
const Department = require("./models/Department");
require("dotenv").config();

// Sample departments to seed
const departments = [
  {
    name: "Mumbai Fire Services",
    departmentId: "FIRE_MUM_001",
    password: "password123", // Will be hashed by pre-save hook
    departmentType: "Fire Department",
    assignedCity: "Mumbai",
    assignedState: "Maharashtra",
    assignedDistrict: "Mumbai",
    email: "fire.mumbai@gov.in",
    contactNumber: "1234567890",
    officeAddress: "Fire Station, Marine Drive, Mumbai, Maharashtra 400001",
    headOfDepartment: "Chief Fire Officer Rajesh Kumar",
    establishedYear: 1950,
    serviceAreas: ["Emergency Response", "Fire Prevention", "Rescue Operations"],
    role: "department",
    isActive: true
  },
  {
    name: "Delhi Police Station",
    departmentId: "POLICE_DEL_001",
    password: "password123",
    departmentType: "Police Department", 
    assignedCity: "New Delhi",
    assignedState: "Delhi",
    assignedDistrict: "Central Delhi",
    email: "police.delhi@gov.in",
    contactNumber: "9876543210",
    officeAddress: "Police Station, Connaught Place, New Delhi 110001",
    headOfDepartment: "Inspector General Priya Sharma",
    establishedYear: 1947,
    serviceAreas: ["Law Enforcement", "Traffic Management", "Crime Investigation"],
    role: "department",
    isActive: true
  },
  {
    name: "Bangalore Water Supply Department", 
    departmentId: "WATER_BLR_001",
    password: "password123",
    departmentType: "Water Department",
    assignedCity: "Bangalore",
    assignedState: "Karnataka", 
    assignedDistrict: "Bangalore Urban",
    email: "water.bangalore@gov.in",
    contactNumber: "8765432109",
    officeAddress: "Water Board Office, MG Road, Bangalore, Karnataka 560001",
    headOfDepartment: "Chief Engineer Suresh Reddy",
    establishedYear: 1964,
    serviceAreas: ["Water Supply", "Pipeline Maintenance", "Quality Control"],
    role: "department",
    isActive: true
  },
  {
    name: "Chennai Road Development Department",
    departmentId: "ROAD_CHE_001", 
    password: "password123",
    departmentType: "Road Department",
    assignedCity: "Chennai",
    assignedState: "Tamil Nadu",
    assignedDistrict: "Chennai",
    email: "roads.chennai@gov.in",
    contactNumber: "7654321098",
    officeAddress: "Road Development Office, Anna Salai, Chennai, Tamil Nadu 600002",
    headOfDepartment: "Chief Engineer Lakshmi Nair",
    establishedYear: 1960,
    serviceAreas: ["Road Construction", "Maintenance", "Traffic Infrastructure"],
    role: "department",
    isActive: true
  },
  {
    name: "Pune Health Department",
    departmentId: "HEALTH_PUN_001",
    password: "password123", 
    departmentType: "Health Department",
    assignedCity: "Pune",
    assignedState: "Maharashtra",
    assignedDistrict: "Pune",
    email: "health.pune@gov.in",
    contactNumber: "6543210987",
    officeAddress: "Health Department, Shivajinagar, Pune, Maharashtra 411005",
    headOfDepartment: "Dr. Anjali Patil",
    establishedYear: 1955,
    serviceAreas: ["Public Health", "Disease Control", "Healthcare Services"],
    role: "department",
    isActive: true
  }
];

async function seedDepartments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing departments (optional - remove if you want to keep existing ones)
    // await Department.deleteMany({});
    // console.log("Cleared existing departments");

    // Insert departments
    const createdDepartments = await Department.insertMany(departments);
    console.log(`Successfully created ${createdDepartments.length} departments:`);
    
    createdDepartments.forEach(dept => {
      console.log(`- ${dept.name} (${dept.departmentId})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error seeding departments:", error);
    process.exit(1);
  }
}

// Run the seeder
seedDepartments();