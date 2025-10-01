const axios = require("axios");
require("dotenv").config();

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function testGoogleAPIs() {
  console.log("🔍 TESTING GOOGLE MAPS APIs");
  console.log("==========================");
  console.log(
    `API Key: ${
      GOOGLE_MAPS_API_KEY
        ? GOOGLE_MAPS_API_KEY.substring(0, 10) + "..."
        : "NOT FOUND"
    }`
  );
  console.log("");

  // Test coordinates (Udaipur, Rajasthan)
  const testLat = 24.585445;
  const testLng = 73.712479;

  const tests = [
    {
      name: "Google Places API (Nearby Search)",
      url: `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${testLat},${testLng}&radius=500&keyword=hospital&key=${GOOGLE_MAPS_API_KEY}`,
      service: "Places API",
      required: true,
    },
    {
      name: "Google Directions API (No Traffic)",
      url: `https://maps.googleapis.com/maps/api/directions/json?origin=${testLat},${testLng}&destination=${
        testLat + 0.005
      },${testLng + 0.005}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`,
      service: "Directions API",
      required: true,
    },
    {
      name: "Google Directions API (With Traffic)",
      url: `https://maps.googleapis.com/maps/api/directions/json?origin=${testLat},${testLng}&destination=${
        testLat + 0.005
      },${
        testLng + 0.005
      }&key=${GOOGLE_MAPS_API_KEY}&mode=driving&traffic_model=best_guess&departure_time=now`,
      service: "Directions API (Traffic)",
      required: true,
    },
    {
      name: "Google Geocoding API",
      url: `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLat},${testLng}&key=${GOOGLE_MAPS_API_KEY}`,
      service: "Geocoding API",
      required: true,
    },
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);

      const response = await axios.get(test.url, { timeout: 10000 });

      if (response.data.status === "OK") {
        console.log(`✅ SUCCESS: ${test.service} is working`);

        // Show sample data
        if (test.service === "Places API") {
          const places = response.data.results.slice(0, 2);
          console.log(
            `   Found ${response.data.results.length} places nearby:`
          );
          places.forEach((place) => {
            console.log(`   - ${place.name} (${place.types.join(", ")})`);
          });
        } else if (
          test.service === "Directions API" ||
          test.service === "Directions API (Traffic)"
        ) {
          const route = response.data.routes[0];
          if (route) {
            const duration = route.legs[0].duration;
            const durationInTraffic = route.legs[0].duration_in_traffic;
            console.log(`   Duration: ${duration.text}`);
            if (durationInTraffic) {
              console.log(`   Duration in traffic: ${durationInTraffic.text}`);
            }
          }
        } else if (test.service === "Geocoding API") {
          const result = response.data.results[0];
          if (result) {
            console.log(`   Address: ${result.formatted_address}`);
            const locality = result.address_components.find((comp) =>
              comp.types.includes("locality")
            );
            if (locality) {
              console.log(`   Locality: ${locality.long_name}`);
            }
          }
        }

        results.push({ ...test, status: "SUCCESS", error: null });
      } else {
        console.log(
          `❌ FAILED: ${test.service} - Status: ${response.data.status}`
        );
        console.log(
          `   Error: ${response.data.error_message || "No error message"}`
        );
        results.push({
          ...test,
          status: "FAILED",
          error: response.data.status,
        });
      }
    } catch (error) {
      console.log(`❌ ERROR: ${test.service} - ${error.message}`);
      if (error.response && error.response.data) {
        console.log(`   Details: ${JSON.stringify(error.response.data)}`);
      }
      results.push({ ...test, status: "ERROR", error: error.message });
    }

    console.log("");
    // Rate limiting delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("📊 SUMMARY REPORT");
  console.log("================");

  const successful = results.filter((r) => r.status === "SUCCESS").length;
  const total = results.length;

  console.log(`✅ Working APIs: ${successful}/${total}`);
  console.log("");

  results.forEach((result) => {
    const icon = result.status === "SUCCESS" ? "✅" : "❌";
    console.log(`${icon} ${result.service}: ${result.status}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log("");

  if (successful === total) {
    console.log(
      "🎉 ALL APIs ARE WORKING! Priority system should function correctly."
    );
  } else {
    console.log(
      "⚠️  Some APIs are not working. Priority system may have limited functionality."
    );
    console.log("");
    console.log("💡 To fix API issues:");
    console.log(
      "1. Go to Google Cloud Console: https://console.cloud.google.com/"
    );
    console.log("2. Enable the required APIs:");
    console.log("   - Places API");
    console.log("   - Directions API");
    console.log("   - Geocoding API");
    console.log("3. Make sure billing is enabled");
    console.log("4. Check API key restrictions");
  }
}

if (!GOOGLE_MAPS_API_KEY) {
  console.log("❌ ERROR: GOOGLE_MAPS_API_KEY not found in .env file");
  console.log("Please add GOOGLE_MAPS_API_KEY=your_api_key to your .env file");
} else {
  testGoogleAPIs().catch((error) => {
    console.error("Test failed:", error);
  });
}
