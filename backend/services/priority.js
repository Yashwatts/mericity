const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(express.json());

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Welcome route to confirm the server is running
app.get("/", (req, res) => {
  res.send(
    "Welcome to the Crowdsourced Civic Issue Reporting Backend! Use the /api/report-issue endpoint to submit complaints."
  );
});

// Main API endpoint to receive and process complaints
app.post("/api/report-issue", async (req, res) => {
  console.log("--- New POST request received! ---");

  try {
    const { latitude, longitude, issueType } = req.body;

    if (!latitude || !longitude || !issueType) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    let priority = "Medium";
    let reason = "General complaint.";
    let highPriorityReason = null;
    let highPriorityPlaceName = null;
    let isHighPriorityArea = false;
    let areaName = "the surrounding area";

    if (issueType === "colony-work") {
      priority = "Low";
      reason = "Minor residential issue.";
    }

    // A single, streamlined search using a keyword with 200m radius
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

    for (const term of criticalTerms) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=200&keyword=${encodeURIComponent(
        term
      )}&key=${GOOGLE_PLACES_API_KEY}`;
      try {
        const response = await axios.get(url);

        if (response.data.results.length > 0) {
          highPriorityReason = `a key public service (${term})`;
          highPriorityPlaceName = response.data.results[0].name;
          isHighPriorityArea = true;
          break; // Stop after the first match
        }
      } catch (error) {
        console.error(
          `Error checking for ${term}:`,
          error.response ? error.response.data : error.message
        );
      }
    }

    if (isHighPriorityArea) {
      priority = "High";
    }

    // Geocoding for Area Name
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    const geocodeResponse = await axios.get(geocodeUrl);
    const addressComponents =
      geocodeResponse.data.results[0]?.address_components;

    if (addressComponents) {
      const locality = addressComponents.find((comp) =>
        comp.types.includes("locality")
      )?.long_name;
      if (locality) {
        areaName = locality;
      }
    }

    // Final Message Construction
    let finalMessage;
    if (priority === "High") {
      finalMessage = `Complaint received. Priority set to: High. Reason: The issue is located near ${highPriorityReason}. The identified place is ${highPriorityPlaceName}.`;
    } else if (priority === "Medium") {
      finalMessage = `Complaint received. Priority set to: Medium. Reason: ${reason} in ${areaName}.`;
    } else {
      finalMessage = `Complaint received. Priority set to: Low. Reason: ${reason} in ${areaName}.`;
    }

    console.log(`Complaint received. Priority set to: ${priority}.`);

    res.status(200).json({
      message: finalMessage,
      priority: priority,
      coordinates: { latitude, longitude },
      issue: issueType,
    });
  } catch (error) {
    if (error.response) {
      console.error("Google Maps API Error:", error.response.data);
      console.error("Status Code:", error.response.status);
      res.status(500).json({
        error: "Google Maps API request failed. Check server logs for details.",
      });
    } else if (error.request) {
      console.error("Request Error: No response from Google Maps API.");
      res.status(500).json({ error: "No response from Google Maps API." });
    } else {
      console.error("General Error:", error.message);
      res.status(500).json({ error: "Internal server error." });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
