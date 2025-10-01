const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
require("dotenv").config();

async function testComplaintReason() {
  console.log("Testing complaint creation with priority reason...");

  try {
    // First login to get a token
    console.log("1. Logging in as test user...");
    const loginResponse = await axios.post("http://127.0.0.1:5000/auth/login", {
      phone: "9876543210",
      password: "test123",
    });

    const token = loginResponse.data.token;
    console.log("✅ Login successful, token received");

    // Create FormData for complaint submission
    const formData = new FormData();
    formData.append(
      "description",
      "Testing complaint submission with priority reason"
    );
    formData.append("lat", "28.6139"); // Delhi coordinates near government buildings
    formData.append("lon", "77.2090");
    formData.append("phone", "9876543210");

    // Create a test image file
    const testImagePath = "./test-image.jpg";
    if (!fs.existsSync(testImagePath)) {
      // Create a simple text file as test image
      fs.writeFileSync(testImagePath, "test image content");
    }
    formData.append("image", fs.createReadStream(testImagePath));

    console.log("2. Submitting complaint...");
    const complaintResponse = await axios.post(
      "http://127.0.0.1:5000/complaints",
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          ...formData.getHeaders(),
        },
      }
    );

    console.log("✅ Complaint created successfully!");
    console.log("Response:", JSON.stringify(complaintResponse.data, null, 2));

    // Fetch user's complaints to see the saved data
    console.log("3. Fetching user complaints to verify reason field...");
    const complaintsResponse = await axios.get(
      "http://127.0.0.1:5000/complaints",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const latestComplaint = complaintsResponse.data[0];
    if (latestComplaint) {
      console.log("\n=== LATEST COMPLAINT DETAILS ===");
      console.log("ID:", latestComplaint._id);
      console.log("Description:", latestComplaint.description);
      console.log("Priority:", latestComplaint.priority);
      console.log("Reason:", latestComplaint.reason);
      console.log("Location:", latestComplaint.location);
      console.log("=====================================");
    } else {
      console.log("No complaints found");
    }

    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  } catch (error) {
    console.error(
      "❌ Error:",
      error.response ? error.response.data : error.message
    );
  }
}

testComplaintReason();
