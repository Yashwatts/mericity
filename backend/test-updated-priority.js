const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

// Test the updated priority system with new Places API configuration
async function testPrioritySystem() {
  console.log("Testing updated priority system...");

  // Test coordinates - near a hospital or school location
  const testLat = "28.6139"; // Delhi coordinates
  const testLon = "77.2090";

  console.log(`Testing location: ${testLat}, ${testLon}`);

  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
  console.log(
    `Using Places API Key: ${GOOGLE_PLACES_API_KEY ? "Available" : "Missing"}`
  );

  if (!GOOGLE_PLACES_API_KEY) {
    console.error("GOOGLE_PLACES_API_KEY not found in environment variables!");
    return;
  }

  let isHighPriorityArea = false;
  let highPriorityReason = "";
  let highPriorityPlaceName = "";
  let priority = "Medium";

  // Check for critical places nearby with 200m radius (same as updated code)
  const criticalTerms = [
    "hospital",
    "school",
    "police station",
    "bus station",
    "airport",
    "temple",
    "tourist attraction",
    "landmark",
  ];

  console.log("Checking for critical places within 200m radius...");

  for (const term of criticalTerms) {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${testLat},${testLon}&radius=200&keyword=${encodeURIComponent(
      term
    )}&key=${GOOGLE_PLACES_API_KEY}`;

    try {
      console.log(`Searching for: ${term}`);
      const response = await axios.get(url);

      console.log(`API Response Status: ${response.status}`);
      console.log(`Places found for ${term}: ${response.data.results.length}`);

      if (response.data.results.length > 0) {
        highPriorityReason = `a key public service (${term})`;
        highPriorityPlaceName = response.data.results[0].name;
        isHighPriorityArea = true;
        console.log(`✅ Found ${term}: ${highPriorityPlaceName}`);
        break;
      }
    } catch (error) {
      console.error(`❌ Error checking for ${term}:`, error.message);
      if (error.response) {
        console.error("API Error Response:", error.response.data);
      }
    }
  }

  if (isHighPriorityArea) {
    priority = "High";
  }

  console.log("\n=== PRIORITY CALCULATION RESULTS ===");
  console.log(`Priority: ${priority}`);
  console.log(`High Priority Area: ${isHighPriorityArea}`);
  console.log(`Reason: ${highPriorityReason}`);
  console.log(`Place Name: ${highPriorityPlaceName}`);
  console.log("=====================================");
}

testPrioritySystem().catch(console.error);
