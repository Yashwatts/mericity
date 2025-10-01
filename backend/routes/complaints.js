const express = require("express");
const multer = require("multer");
const Complaint = require("../models/Complaint");
const Admin = require("../models/Admin");
const auth = require("../middleware/auth"); // your JWT middleware
const geocodingService = require("../services/geocodingService");
const departmentDetectionService = require("../services/departmentDetectionService");
const router = express.Router();

// configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // make sure uploads/ exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// create complaint
router.post(
  "/",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { description, lat, lon, phone } = req.body;
      
      // Enhanced logging for debugging specific user issues
      console.log(`[COMPLAINT-DEBUG] New complaint submission from user: ${req.user.id}`);
      console.log(`[COMPLAINT-DEBUG] User details:`, {
        userId: req.user.id,
        userName: req.user.name || 'Unknown',
        userEmail: req.user.email || 'Unknown'
      });
      console.log(`[COMPLAINT-DEBUG] Request data:`, {
        hasDescription: !!description,
        hasLocation: !!(lat && lon), 
        hasPhone: !!phone,
        phoneNumber: phone ? phone.replace(/\d(?=\d{4})/g, '*') : 'No phone',
        hasImage: !!req.files?.["image"]
      });

      // Validate required fields
      if (!description || !lat || !lon || !phone) {
        console.log(`[COMPLAINT-DEBUG] ❌ Validation failed - missing fields`);
        return res.status(400).json({
          error:
            "Missing required fields: description, location (lat, lon), and phone are required",
        });
      }

      // Get image and audio paths if uploaded
      const imagePath = req.files["image"] ? req.files["image"][0].path : null;
      const audioPath = req.files["audio"] ? req.files["audio"][0].path : null;

      // Validate that image is provided
      if (!imagePath) {
        console.log(`[COMPLAINT-DEBUG] ❌ No image provided`);
        return res.status(400).json({
          error: "Image is required. Please upload a photo.",
        });
      }

      console.log(`[COMPLAINT-DEBUG] ✅ Initial validation passed`);

      // Get city information from coordinates
      console.log(
        `[COMPLAINT-DEBUG] Processing complaint with coordinates: lat=${lat}, lon=${lon}`
      );

      let locationInfo;
      try {
        locationInfo = await geocodingService.getCityFromCoordinates(lat, lon);
        console.log(
          "Location info from geocoding:",
          JSON.stringify(locationInfo, null, 2)
        );
      } catch (error) {
        console.error("Geocoding failed:", error);
        locationInfo = {
          city: "Unknown City",
          state: "Unknown State",
          formattedAddress: `${lat}, ${lon}`,
          source: "error",
        };
        console.log("Using fallback location info:", locationInfo);
      }

      // Find admin for this city
      let assignedAdmin = null;
      let assignedCity = locationInfo.city;
      let assignedState = locationInfo.state;
      let assignedDepartment = null;
      let departmentRouting = null;

      // Use AI to detect and route complaint to appropriate department
      try {
        console.log("Starting AI department detection...");

        const complaintData = {
          description,
          category: priority || "General", // Use priority as category hint if available
          location: {
            city: locationInfo.city,
            state: locationInfo.state,
            district: locationInfo.district,
          },
        };

        // Check if department detection service is available
        if (
          departmentDetectionService &&
          typeof departmentDetectionService.routeComplaintToDepartment ===
            "function"
        ) {
          console.log(`[AUTO-ROUTING] Starting department detection for complaint: "${description.substring(0, 100)}..."`);
          
          departmentRouting =
            await departmentDetectionService.routeComplaintToDepartment(
              complaintData
            );
          console.log(
            "[AUTO-ROUTING] Department routing result:",
            JSON.stringify(departmentRouting, null, 2)
          );

          if (
            departmentRouting.success &&
            departmentRouting.assignedDepartment
          ) {
            assignedDepartment = departmentRouting.assignedDepartment._id;
            console.log(
              `[AUTO-ROUTING] ✅ SUCCESS - Complaint automatically routed to: ${departmentRouting.assignedDepartment.name} (${departmentRouting.assignedDepartment.departmentType})`
            );
            console.log(
              `[AUTO-ROUTING] AI Confidence: ${departmentRouting.confidence}%, Method: ${departmentRouting.analysis_method || 'AI'}`
            );
            console.log(
              `[AUTO-ROUTING] Reasoning: ${departmentRouting.reasoning}`
            );
            if (departmentRouting.keywords_matched && departmentRouting.keywords_matched.length > 0) {
              console.log(
                `[AUTO-ROUTING] Keywords matched: ${departmentRouting.keywords_matched.join(', ')}`
              );
            }
          } else {
            console.log(
              "[AUTO-ROUTING] ❌ FAILED - AI routing failed or returned no department, falling back to admin assignment"
            );
            console.log(`[AUTO-ROUTING] Failure reason: ${departmentRouting.error || 'No department found'}`);
          }
        } else {
          console.log(
            "[AUTO-ROUTING] ⚠️  WARNING - Department detection service not available, falling back to admin assignment"
          );
        }
      } catch (aiError) {
        console.error("[AUTO-ROUTING] ❌ ERROR - AI department routing failed:", aiError.message);
        console.log("[AUTO-ROUTING] Falling back to admin assignment");
        // Reset variables to prevent partial state
        departmentRouting = null;
        assignedDepartment = null;
      }

      // Fallback to admin assignment if AI routing fails
      if (
        !assignedDepartment &&
        locationInfo.city &&
        locationInfo.city !== "Unknown City"
      ) {
        assignedAdmin = await Admin.findOne({
          assignedCity: { $regex: new RegExp(locationInfo.city, "i") },
          assignedState: { $regex: new RegExp(locationInfo.state, "i") },
          isActive: true,
        });

        if (assignedAdmin) {
          assignedCity = assignedAdmin.assignedCity;
          assignedState = assignedAdmin.assignedState;
          console.log(
            `Complaint assigned to admin: ${assignedAdmin.name} (${assignedCity}, ${assignedState})`
          );
        } else {
          console.log(
            `No admin found for ${locationInfo.city}, ${locationInfo.state}`
          );
        }
      }

      // Calculate priority based on location
      const axios = require("axios");
      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
      const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

      let priority = "Medium";
      let reason = "General complaint.";
      let highPriorityReason = null;
      let highPriorityPlaceName = null;
      let isHighPriorityArea = false;
      let areaName = "the surrounding area";

      // Check for places nearby within 25m radius with proper priority categorization
      const searchRadius = 25; // 25 meters for more precise priority detection
       
      // High priority - Sensitive areas (critical for public safety and security)
      const highPriorityTerms = [
        "hospital",
        "court",
        "university",
        "military",
        "power station",
        "water treatment",
        "gas station",
        "fuel station",
        "shopping mall",
        "market",
        "bus station",
        "railway station",
        "metro station"
      ];

      // Medium priority - Educational and community places
      const mediumPriorityTerms = [
        "embassy",
        "consulate",
        "school",
        "college",
        "library",
        "temple",
        "mosque",
        "church",
        "community center",
        "park",
        "playground",
        "emergency room",
        "clinic",
        "medical center",
        "police station",
        "fire station",
        "government office"
      ];

      console.log("Starting priority calculation for location:", lat, lon);

      // Check for high priority places first
      for (const term of highPriorityTerms) {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${searchRadius}&keyword=${encodeURIComponent(
          term
        )}&key=${GOOGLE_PLACES_API_KEY}`;
        try {
          const response = await axios.get(url);

          if (response.data.results.length > 0) {
            priority = "High";
            highPriorityReason = `a sensitive area (${term})`;
            highPriorityPlaceName = response.data.results[0].name;
            isHighPriorityArea = true;
            reason = `Located within 25m of ${highPriorityReason}. The identified place is ${highPriorityPlaceName}.`;
            console.log(`Found high priority ${term} nearby:`, highPriorityPlaceName);
            break; // Stop after finding the first high priority match
          }
        } catch (error) {
          console.error(`Error checking for high priority term ${term}:`, error.message);
        }
      }

      // If no high priority area found, check for medium priority places
      if (!isHighPriorityArea) {
        for (const term of mediumPriorityTerms) {
          const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${searchRadius}&keyword=${encodeURIComponent(
            term
          )}&key=${GOOGLE_PLACES_API_KEY}`;
          try {
            const response = await axios.get(url);

            if (response.data.results.length > 0) {
              priority = "Medium";
              highPriorityReason = `an educational/community facility (${term})`;
              highPriorityPlaceName = response.data.results[0].name;
              reason = `Located within 25m of ${highPriorityReason}. The identified place is ${highPriorityPlaceName}.`;
              console.log(`Found medium priority ${term} nearby:`, highPriorityPlaceName);
              break; // Stop after finding the first medium priority match
            }
          } catch (error) {
            console.error(`Error checking for medium priority term ${term}:`, error.message);
          }
        }
      }

      // If no high or medium priority areas found, it remains as Low priority
      if (priority === "Medium" && !isHighPriorityArea && !highPriorityPlaceName) {
        priority = "Low";
        reason = "General residential area with no significant landmarks within 25m radius.";
      }

      // Get area name from geocoding
      try {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`;
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
      } catch (error) {
        console.error("Geocoding error for area name:", error.message);
      }

      console.log(
        `Priority calculation completed: ${priority}, Reason: ${reason}`
      );

      // Create new complaint with phone verification workflow
      const complaint = new Complaint({
        userId: req.user.id,
        description,
        phone,
        location: {
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          address: locationInfo.formattedAddress,
          detailedAddress: locationInfo.detailedAddress,
          streetAddress: locationInfo.streetAddress,
          premise: locationInfo.premise,
          subpremise: locationInfo.subpremise,
          establishment: locationInfo.establishment,
          pointOfInterest: locationInfo.pointOfInterest,
          sublocality: locationInfo.sublocality,
          sublocality1: locationInfo.sublocality1,
          sublocality2: locationInfo.sublocality2,
          sublocality3: locationInfo.sublocality3,
          city: locationInfo.city,
          state: locationInfo.state,
          district: locationInfo.district,
          postalCode: locationInfo.postalCode,
          country: locationInfo.country,
        },
        assignedAdmin: assignedAdmin ? assignedAdmin._id : null,
        assignedDepartment: assignedDepartment || null,
        ...(departmentRouting &&
          departmentRouting.success && {
            departmentRouting: {
              detectedDepartment: departmentRouting.detectedDepartment,
              confidence: departmentRouting.confidence,
              reasoning: departmentRouting.reasoning,
              analysisMethod: departmentRouting.analysis_method,
              isFallback: departmentRouting.is_fallback || false,
            },
          }),
        assignedCity,
        assignedState,
        image: imagePath,
        audio: audioPath,
        status: 'pending', // Start as pending - shows in open complaints
        phoneVerificationStatus: 'pending',
        ...(priority && { priority }), // Only add priority if provided
        ...(reason && { reason }), // Only add reason if provided
      });

      console.log("[COMPLAINT-DEBUG] Attempting to save complaint with phone verification:", {
        userId: complaint.userId,
        userName: req.user.name,
        status: complaint.status,
        phoneVerificationStatus: complaint.phoneVerificationStatus,
        phoneNumber: phone ? phone.replace(/\d(?=\d{4})/g, '*') : 'No phone',
        hasDetectedDepartment: !!complaint.detectedDepartmentInfo,
        hasImage: !!complaint.image,
        hasAudio: !!complaint.audio,
        location: complaint.location.city,
      });

      await complaint.save();
      console.log("[COMPLAINT-DEBUG] ✅ Complaint saved successfully with ID:", complaint._id);
      console.log("[COMPLAINT-DEBUG] ✅ Complaint belongs to user:", complaint.userId);

      // Initiate phone verification call
      const phoneVerificationService = require('../services/phoneVerificationService');
      
      try {
        console.log("[COMPLAINT-DEBUG] 📞 Initiating phone verification call to:", phone ? phone.replace(/\d(?=\d{4})/g, '*') : 'Unknown');
        
        const verificationResult = await phoneVerificationService.initiateVerificationCall({
          userPhone: phone,
          description: description,
          location: locationInfo
        }, complaint._id);

        console.log("[COMPLAINT-DEBUG] 📞 Phone verification result:", {
          success: verificationResult.success,
          callSid: verificationResult.callSid,
          error: verificationResult.error
        });

        if (verificationResult.success) {
          console.log("[COMPLAINT-DEBUG] ✅ Phone verification initiated successfully");
          
          // Update complaint status to pending_verification when call starts
          await Complaint.findByIdAndUpdate(complaint._id, {
            status: 'pending_verification', // Move to verification status when call starts
            phoneVerificationCallSid: verificationResult.callSid,
            phoneVerificationInitiatedAt: new Date()
          });
          
          console.log("[COMPLAINT-DEBUG] ✅ Complaint status updated to pending_verification");

          // Response for successful complaint submission with phone verification
          return res.status(201).json({
            success: true,
            message: "Complaint submitted successfully! It appears in your pending complaints. A verification call will be made shortly - please answer and press 1 to confirm or 2 to reject.",
            complaint: {
              _id: complaint._id,
              description: complaint.description,
              status: 'pending_verification', // Show actual current status
              phoneVerificationStatus: complaint.phoneVerificationStatus,
              location: complaint.location,
              createdAt: complaint.createdAt,
              assignedDepartment: complaint.assignedDepartment,
              routing: departmentRouting ? {
                method: departmentRouting.analysis_method,
                confidence: departmentRouting.confidence,
                reasoning: departmentRouting.reasoning,
                detectedDepartment: departmentRouting.detectedDepartment,
                isFallback: departmentRouting.is_fallback,
              } : null,
            },
            verification: {
              callInitiated: true,
              callSid: verificationResult.callSid,
              phone: verificationResult.phone,
              message: "Answer the call and press 1 to confirm or 2 to reject. If confirmed, your complaint will automatically go to the appropriate department. If rejected, it will be closed."
            }
          });
          
        } else {
          console.log("[COMPLAINT-CREATE] ⚠️ Phone verification failed, marking for manual verification");
          
          // Update complaint status if phone verification fails
          await Complaint.findByIdAndUpdate(complaint._id, {
            status: 'pending_manual_verification',
            phoneVerificationStatus: 'failed',
            phoneVerificationError: verificationResult.error || 'Phone verification service unavailable'
          });

          return res.status(201).json({
            success: true,
            message: "Complaint registered successfully! Phone verification failed, your complaint will be manually verified and processed.",
            complaint: {
              _id: complaint._id,
              description: complaint.description,
              status: 'pending_manual_verification',
              phoneVerificationStatus: 'failed',
              location: complaint.location,
              createdAt: complaint.createdAt,
              detectedDepartment: complaint.detectedDepartmentInfo?.detectedDepartment,
              confidence: complaint.detectedDepartmentInfo?.confidence
            },
            verification: {
              callInitiated: false,
              message: "Phone verification unavailable. Your complaint will be manually verified by our team."
            }
          });
        }
        
      } catch (phoneError) {
        console.error("[COMPLAINT-CREATE] ❌ Phone verification error:", phoneError);
        
        // Mark complaint for manual verification on phone service error
        await Complaint.findByIdAndUpdate(complaint._id, {
          status: 'pending_manual_verification',
          phoneVerificationStatus: 'error',
          phoneVerificationError: phoneError.message
        });

        return res.status(201).json({
          success: true,
          message: "Complaint registered successfully! Phone verification encountered an error, your complaint will be manually processed.",
          complaint: {
            _id: complaint._id,
            description: complaint.description,
            status: 'pending_manual_verification',
            location: complaint.location,
            createdAt: complaint.createdAt,
            detectedDepartment: complaint.detectedDepartmentInfo?.detectedDepartment,
            confidence: complaint.detectedDepartmentInfo?.confidence
          },
          verification: {
            callInitiated: false,
            error: "Phone verification service error",
            message: "Your complaint will be manually verified and processed by our team."
          }
        });
      }
    } catch (err) {
      console.error("[COMPLAINT-CREATE] ❌ Error creating complaint:", err);
      res.status(500).json({ 
        success: false,
        error: "Server error during complaint creation",
        details: err.message 
      });
    }
  }
);

// Calculate priority for a complaint based on location
router.post("/calculate-priority", auth, async (req, res) => {
  try {
    const { lat, lon, issueType = "general", category = "civic" } = req.body;

    if (!lat || !lon) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: lat and lon",
      });
    }

    // Import the priority calculation logic
    const axios = require("axios");
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

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

    // Check for places nearby within 25m radius with proper priority categorization
    const searchRadius = 25; // 25 meters for more precise priority detection
   
    // High priority - Sensitive areas (critical for public safety and security)
    const highPriorityTerms = [
      "hospital",
      "emergency room",
      "clinic",
      "medical center",
      "police station",
      "fire station",
      "government office",
      "court",
      "embassy",
      "consulate",
      "military",
      "power station",
      "water treatment",
      "gas station",
      "fuel station"
    ];

    // Medium priority - Educational and community places
    const mediumPriorityTerms = [
      "school",
      "college",
      "university",
      "library",
      "temple",
      "mosque",
      "church",
      "community center",
      "park",
      "playground",
      "shopping mall",
      "market",
      "bus station",
      "railway station",
      "metro station"
    ];

    // Check for high priority places first
    for (const term of highPriorityTerms) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${searchRadius}&keyword=${encodeURIComponent(
        term
      )}&key=${GOOGLE_PLACES_API_KEY}`;
      try {
        const response = await axios.get(url);

        if (response.data.results.length > 0) {
          priority = "High";
          highPriorityReason = `a sensitive area (${term})`;
          highPriorityPlaceName = response.data.results[0].name;
          isHighPriorityArea = true;
          reason = `Located within 25m of ${highPriorityReason}. The identified place is ${highPriorityPlaceName}.`;
          break; // Stop after finding the first high priority match
        }
      } catch (error) {
        console.error(`Error checking for high priority term ${term}:`, error.message);
      }
    }

    // If no high priority area found, check for medium priority places
    if (!isHighPriorityArea) {
      for (const term of mediumPriorityTerms) {
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=${searchRadius}&keyword=${encodeURIComponent(
          term
        )}&key=${GOOGLE_PLACES_API_KEY}`;
        try {
          const response = await axios.get(url);

          if (response.data.results.length > 0) {
            priority = "Medium";
            highPriorityReason = `an educational/community facility (${term})`;
            highPriorityPlaceName = response.data.results[0].name;
            reason = `Located within 25m of ${highPriorityReason}. The identified place is ${highPriorityPlaceName}.`;
            break; // Stop after finding the first medium priority match
          }
        } catch (error) {
          console.error(`Error checking for medium priority term ${term}:`, error.message);
        }
      }
    }

    // If no high or medium priority areas found, it remains as Low priority
    if (priority === "Medium" && !isHighPriorityArea && !highPriorityPlaceName) {
      priority = "Low";
      reason = "General residential area with no significant landmarks within 100m radius.";
    }

    // Get area name from geocoding
    try {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_API_KEY}`;
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
    } catch (error) {
      console.error("Geocoding error:", error.message);
    }

    // Final message construction with improved clarity
    let finalMessage;
    let priorityIcon;
    let priorityColor;
   
    if (priority === "High") {
      priorityIcon = "🚨";
      priorityColor = "#dc2626";
      if (isHighPriorityArea) {
        finalMessage = `Priority set to: High ${priorityIcon}. Reason: This location is within 100m of ${highPriorityReason} - "${highPriorityPlaceName}". Complaints near sensitive areas require immediate attention for public safety and security.`;
      } else {
        finalMessage = `Priority set to: High ${priorityIcon}. Reason: The area is experiencing ${highPriorityReason}.`;
      }
    } else if (priority === "Medium") {
      priorityIcon = "⚠️";
      priorityColor = "#f59e0b";
      if (highPriorityPlaceName) {
        finalMessage = `Priority set to: Medium ${priorityIcon}. Reason: This location is within 100m of ${highPriorityReason} - "${highPriorityPlaceName}". Issues near educational and community facilities have moderate priority to ensure proper functioning of public services.`;
      } else {
        finalMessage = `Priority set to: Medium ${priorityIcon}. Reason: ${reason} in ${areaName}.`;
      }
    } else {
      priorityIcon = "📝";
      priorityColor = "#10b981";
      finalMessage = `Priority set to: Low ${priorityIcon}. Reason: ${reason} This area has no critical infrastructure or sensitive facilities within 100m, so it will be processed in normal order.`;
    }

    res.json({
      success: true,
      message: finalMessage,
      priority: priority,
      icon: priorityIcon,
      color: priorityColor,
      priorityReason: reason,
      coordinates: { latitude: lat, longitude: lon },
      issue: issueType,
      areaName: areaName,
      highPriorityPlace: highPriorityPlaceName,
      reasoning: finalMessage,
      searchRadius: searchRadius
    });
  } catch (error) {
    console.error("Priority calculation error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to calculate priority",
      details: error.message,
    });
  }
});

// Get all complaints for a user
router.get("/", auth, async (req, res) => {
  try {
    console.log(`[COMPLAINT-FETCH] Fetching all complaints for user: ${req.user.id} (${req.user.name || 'Unknown'})`);
    
    const complaints = await Complaint.find({ userId: req.user.id })
      .populate('assignedDepartment', 'name departmentType assignedCity assignedState')
      .populate('assignedAdmin', 'name assignedCity assignedState')
      .sort({
        createdAt: -1,
      });

    console.log(`[COMPLAINT-FETCH] Found ${complaints.length} complaints for user ${req.user.id}`);
    
    if (complaints.length > 0) {
      console.log(`[COMPLAINT-FETCH] Complaints found:`, complaints.map(c => ({
        id: c._id,
        status: c.status,
        phoneVerificationStatus: c.phoneVerificationStatus,
        createdAt: c.createdAt,
        description: c.description.substring(0, 50) + '...'
      })));
    }

    // Add full URL to image and audio paths and categorization  
    const complaintsWithUrls = complaints.map((complaint) => {
      const complaintObj = complaint.toObject();
      
      // Add categorization for frontend
      let category = 'open'; // default
      if (['resolved'].includes(complaintObj.status)) {
        category = 'resolved';
      } else if (['rejected', 'rejected_by_user', 'rejected_no_answer'].includes(complaintObj.status)) {
        category = 'closed';
      } else if (['pending', 'in_progress', 'phone_verified', 'pending_verification', 'pending_assignment'].includes(complaintObj.status)) {
        category = 'open';
      }
      
      return {
        ...complaintObj,
        category: category, // Add explicit category for frontend
        imageUrl: complaintObj.image
          ? `${req.protocol}://${req.get("host")}/${complaintObj.image}`
          : null,
        audioUrl: complaintObj.audio
          ? `${req.protocol}://${req.get("host")}/${complaintObj.audio}`
          : null
      };
    });

    res.json({ complaints: complaintsWithUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get closed complaints specifically for a user
router.get("/closed", auth, async (req, res) => {
  try {
    const closedStatuses = ['rejected', 'rejected_by_user', 'rejected_no_answer'];
    
    const complaints = await Complaint.find({ 
      userId: req.user.id,
      status: { $in: closedStatuses }
    })
      .populate('assignedDepartment', 'name departmentType assignedCity assignedState')
      .populate('assignedAdmin', 'name assignedCity assignedState')
      .sort({
        updatedAt: -1, // Sort by most recently updated
      });

    console.log(`[GET-CLOSED] Found ${complaints.length} closed complaints for user ${req.user.id}`);

    // Add full URL to image and audio paths with closed category
    const complaintsWithUrls = complaints.map((complaint) => {
      const complaintObj = complaint.toObject();
      
      return {
        ...complaintObj,
        category: 'closed', // Explicitly mark as closed
        imageUrl: complaintObj.image
          ? `${req.protocol}://${req.get("host")}/${complaintObj.image}`
          : null,
        audioUrl: complaintObj.audio
          ? `${req.protocol}://${req.get("host")}/${complaintObj.audio}`
          : null,
      };
    });

    res.json({ 
      complaints: complaintsWithUrls,
      count: complaintsWithUrls.length,
      statuses: closedStatuses
    });
  } catch (err) {
    console.error('[GET-CLOSED] Error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get open complaints specifically for a user  
router.get("/open", auth, async (req, res) => {
  try {
    const openStatuses = ['pending', 'in_progress', 'phone_verified', 'pending_verification', 'pending_assignment'];
    
    console.log(`[COMPLAINT-OPEN] Fetching open complaints for user: ${req.user.id} (${req.user.name || 'Unknown'})`);
    console.log(`[COMPLAINT-OPEN] Looking for statuses:`, openStatuses);
    
    const complaints = await Complaint.find({ 
      userId: req.user.id,
      status: { $in: openStatuses }
    })
      .populate('assignedDepartment', 'name departmentType assignedCity assignedState')
      .populate('assignedAdmin', 'name assignedCity assignedState')
      .sort({
        createdAt: -1,
      });

    console.log(`[COMPLAINT-OPEN] Found ${complaints.length} open complaints for user ${req.user.id}`);
    
    if (complaints.length > 0) {
      console.log(`[COMPLAINT-OPEN] Open complaints:`, complaints.map(c => ({
        id: c._id,
        status: c.status,
        phoneVerificationStatus: c.phoneVerificationStatus,
        createdAt: c.createdAt,
        description: c.description.substring(0, 30) + '...'
      })));
    } else {
      console.log(`[COMPLAINT-OPEN] No open complaints found for user ${req.user.id}`);
    }

    // Add full URL to image and audio paths with open category
    const complaintsWithUrls = complaints.map((complaint) => {
      const complaintObj = complaint.toObject();
      
      return {
        ...complaintObj,
        category: 'open', // Explicitly mark as open
        imageUrl: complaintObj.image
          ? `${req.protocol}://${req.get("host")}/${complaintObj.image}`
          : null,
        audioUrl: complaintObj.audio
          ? `${req.protocol}://${req.get("host")}/${complaintObj.audio}`
          : null,
      };
    });

    res.json({ 
      complaints: complaintsWithUrls,
      count: complaintsWithUrls.length,
      statuses: openStatuses
    });
  } catch (err) {
    console.error('[GET-OPEN] Error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get resolved complaints specifically for a user
router.get("/resolved", auth, async (req, res) => {
  try {
    const complaints = await Complaint.find({ 
      userId: req.user.id,
      status: 'resolved'
    })
      .populate('assignedDepartment', 'name departmentType assignedCity assignedState')
      .populate('assignedAdmin', 'name assignedCity assignedState')
      .sort({
        updatedAt: -1,
      });

    console.log(`[GET-RESOLVED] Found ${complaints.length} resolved complaints for user ${req.user.id}`);

    // Add full URL to image and audio paths with resolved category
    const complaintsWithUrls = complaints.map((complaint) => {
      const complaintObj = complaint.toObject();
      
      return {
        ...complaintObj,
        category: 'resolved', // Explicitly mark as resolved
        imageUrl: complaintObj.image
          ? `${req.protocol}://${req.get("host")}/${complaintObj.image}`
          : null,
        audioUrl: complaintObj.audio
          ? `${req.protocol}://${req.get("host")}/${complaintObj.audio}`
          : null,
      };
    });

    res.json({ 
      complaints: complaintsWithUrls,
      count: complaintsWithUrls.length
    });
  } catch (err) {
    console.error('[GET-RESOLVED] Error:', err);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all open complaints for explore (pending and in_progress from all users)
router.get("/explore", auth, async (req, res) => {
  try {
    const complaints = await Complaint.find({
      status: { $in: ["pending", "in_progress", "pending_verification", "phone_verified"] }, // Include phone verification statuses
    })
      .sort({ createdAt: -1 })
      .populate("userId", "name email"); // Populate user info but keep it anonymous

    // Add full URL to image and audio paths, but remove sensitive user info
    const complaintsWithUrls = complaints.map((complaint) => ({
      ...complaint.toObject(),
      imageUrl: complaint.image
        ? `${req.protocol}://${req.get("host")}/${complaint.image}`
        : null,
      audioUrl: complaint.audio
        ? `${req.protocol}://${req.get("host")}/${complaint.audio}`
        : null,
      userId: undefined, // Remove user ID for privacy
      phone: complaint.phone
        ? complaint.phone.replace(/(\d{3})\d{4}(\d{3})/, "$1****$2")
        : null, // Mask phone number
    }));

    res.json({ complaints: complaintsWithUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Community routes

// Simple test endpoint for community
router.get("/community/test", auth, async (req, res) => {
  try {
    console.log('[COMMUNITY-TEST] Test endpoint accessed by user:', req.user?.id);
    res.json({
      success: true,
      message: "Community test endpoint working",
      userId: req.user?.id
    });
  } catch (error) {
    console.error('[COMMUNITY-TEST] Test endpoint error:', error);
    res.status(500).json({
      error: "Test endpoint failed",
      message: error.message
    });
  }
});

// Get community complaints (all non-closed complaints from user's city)
router.get("/community", auth, async (req, res) => {
  console.log('[COMMUNITY-DEBUG] Route accessed by user:', req.user?.id);
  
  try {
    console.log('[COMMUNITY-DEBUG] Community complaints request from user:', req.user.id, 'role:', req.user.role);
    
    let userCity = null;
    let userSublocality = null;
    
    // Handle different user types - admin vs regular user
    if (req.user.role === 'admin') {
      // For admin users, get city from Admin model
      const Admin = require("../models/Admin");
      console.log('[COMMUNITY-DEBUG] Admin user detected, fetching admin data');
      
      const admin = await Admin.findById(req.user.id);
      console.log('[COMMUNITY-DEBUG] Admin data:', {
        hasAdmin: !!admin,
        assignedCity: admin?.assignedCity,
        assignedState: admin?.assignedState
      });

      if (!admin || !admin.assignedCity) {
        console.log('[COMMUNITY-DEBUG] Admin missing city information');
        return res.status(400).json({
          error:
            "Please complete your profile with city information to view community complaints",
        });
      }
      
      userCity = admin.assignedCity;
      // Admin users don't have sublocality, so we'll show all complaints from their assigned city
      
    } else {
      // For regular users, get city from User model
      const User = require("../models/User");
      console.log('[COMMUNITY-DEBUG] Regular user detected, fetching user data');
      
      const user = await User.findById(req.user.id);
      console.log('[COMMUNITY-DEBUG] User data:', {
        hasUser: !!user,
        city: user?.city,
        sublocality: user?.sublocality
      });

      if (!user || !user.city) {
        console.log('[COMMUNITY-DEBUG] User missing city information');
        return res.status(400).json({
          error:
            "Please complete your profile with city information to view community complaints",
        });
      }
      
      userCity = user.city;
      userSublocality = user.sublocality;
    }

    // Extract query parameters for filtering
    const {
      sortBy = "latest",
      voteFilter = "all",
      locationFilter = "all",
      minUpvotes,
      minDownvotes,
    } = req.query;

    console.log('[COMMUNITY-DEBUG] Query parameters:', {
      sortBy, voteFilter, locationFilter, minUpvotes, minDownvotes
    });

    // Build base query - FIXED: Include pending_manual_verification status
    let baseQuery = {
      "location.city": { $regex: new RegExp(`^${userCity}$`, "i") },
      status: { 
        $in: [
          "pending", 
          "in_progress", 
          "pending_verification", 
          "pending_manual_verification", 
          "phone_verified"
        ] 
      },
    };

    console.log('[COMMUNITY-DEBUG] Base query:', JSON.stringify(baseQuery, null, 2));

    // Apply location filter (only for regular users with sublocality)
    if (locationFilter === "same-area" && userSublocality) {
      baseQuery["location.sublocality"] = {
        $regex: new RegExp(`^${userSublocality}$`, "i"),
      };
    }

    console.log('[COMMUNITY-DEBUG] Final query after location filter:', JSON.stringify(baseQuery, null, 2));

    // Find all complaints matching base criteria
    let complaints = await Complaint.find(baseQuery)
      .populate("userId", "name")
      .populate("comments.userId", "name");

    console.log('[COMMUNITY-DEBUG] Found complaints:', complaints.length);
    
    // Filter out complaints with null/missing users to prevent errors
    complaints = complaints.filter(complaint => complaint.userId && complaint.userId._id);
    console.log('[COMMUNITY-DEBUG] Complaints after filtering null users:', complaints.length);

    // Add full URLs and calculate vote counts
    let complaintsWithUrls = complaints.map((complaint) => ({
      ...complaint.toObject(),
      imageUrl: complaint.image
        ? `${req.protocol}://${req.get("host")}/${complaint.image}`
        : null,
      audioUrl: complaint.audio
        ? `${req.protocol}://${req.get("host")}/${complaint.audio}`
        : null,
      upvoteCount: complaint.upvotes.length,
      downvoteCount: complaint.downvotes.length,
      hasUserUpvoted: complaint.upvotes.includes(req.user.id),
      hasUserDownvoted: complaint.downvotes.includes(req.user.id),
      isOwnComplaint: complaint.userId && complaint.userId._id ? complaint.userId._id.toString() === req.user.id : false,
    }));

    console.log('[COMMUNITY-DEBUG] Processed complaints with URLs, count:', complaintsWithUrls.length);

    // Apply vote filtering
    if (voteFilter === "upvoted-only") {
      complaintsWithUrls = complaintsWithUrls.filter((c) => c.upvoteCount > 0);
    } else if (voteFilter === "downvoted-only") {
      complaintsWithUrls = complaintsWithUrls.filter(
        (c) => c.downvoteCount > 0
      );
    } else if (voteFilter === "no-votes") {
      complaintsWithUrls = complaintsWithUrls.filter(
        (c) => c.upvoteCount === 0 && c.downvoteCount === 0
      );
    }

    // Apply minimum vote thresholds if specified
    if (minUpvotes && !isNaN(parseInt(minUpvotes))) {
      complaintsWithUrls = complaintsWithUrls.filter(
        (c) => c.upvoteCount >= parseInt(minUpvotes)
      );
    }
    if (minDownvotes && !isNaN(parseInt(minDownvotes))) {
      complaintsWithUrls = complaintsWithUrls.filter(
        (c) => c.downvoteCount >= parseInt(minDownvotes)
      );
    }

    // Apply sorting
    complaintsWithUrls.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "most-upvoted":
          return b.upvoteCount - a.upvoteCount;
        case "most-downvoted":
          return b.downvoteCount - a.downvoteCount;
        case "most-discussed":
          return (b.comments?.length || 0) - (a.comments?.length || 0);
        case "latest":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    res.json({
      complaints: complaintsWithUrls,
      userCity: userCity,
      userState: req.user.role === 'admin' ? req.user.assignedState : req.user.state,
      filters: {
        sortBy,
        voteFilter,
        locationFilter,
        applied:
          sortBy !== "latest" ||
          voteFilter !== "all" ||
          locationFilter !== "all",
      },
      stats: {
        total: complaints.length,
        filtered: complaintsWithUrls.length,
        upvoted: complaintsWithUrls.filter((c) => c.upvoteCount > 0).length,
        downvoted: complaintsWithUrls.filter((c) => c.downvoteCount > 0).length,
        noVotes: complaintsWithUrls.filter(
          (c) => c.upvoteCount === 0 && c.downvoteCount === 0
        ).length,
      },
    });
  } catch (err) {
    console.error("[COMMUNITY-DEBUG] Community complaints error:", err);
    console.error("[COMMUNITY-DEBUG] Error stack:", err.stack);
    res.status(500).json({ 
      error: "Server error",
      message: err.message 
    });
  }
});

// Upvote a complaint
router.post("/:id/upvote", auth, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const userId = req.user.id;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Check if user already upvoted
    const hasUpvoted = complaint.upvotes.includes(userId);
    const hasDownvoted = complaint.downvotes.includes(userId);

    if (hasUpvoted) {
      // Remove upvote
      complaint.upvotes = complaint.upvotes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // Add upvote and remove downvote if exists
      if (hasDownvoted) {
        complaint.downvotes = complaint.downvotes.filter(
          (id) => id.toString() !== userId
        );
      }
      complaint.upvotes.push(userId);
    }

    await complaint.save();

    res.json({
      upvoteCount: complaint.upvotes.length,
      downvoteCount: complaint.downvotes.length,
      hasUserUpvoted: complaint.upvotes.includes(userId),
      hasUserDownvoted: complaint.downvotes.includes(userId),
    });
  } catch (err) {
    console.error("Upvote error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Downvote a complaint
router.post("/:id/downvote", auth, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const userId = req.user.id;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Check if user already downvoted
    const hasUpvoted = complaint.upvotes.includes(userId);
    const hasDownvoted = complaint.downvotes.includes(userId);

    if (hasDownvoted) {
      // Remove downvote
      complaint.downvotes = complaint.downvotes.filter(
        (id) => id.toString() !== userId
      );
    } else {
      // Add downvote and remove upvote if exists
      if (hasUpvoted) {
        complaint.upvotes = complaint.upvotes.filter(
          (id) => id.toString() !== userId
        );
      }
      complaint.downvotes.push(userId);
    }

    await complaint.save();

    res.json({
      upvoteCount: complaint.upvotes.length,
      downvoteCount: complaint.downvotes.length,
      hasUserUpvoted: complaint.upvotes.includes(userId),
      hasUserDownvoted: complaint.downvotes.includes(userId),
    });
  } catch (err) {
    console.error("Downvote error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Add comment to a complaint
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { text } = req.body;
    const userId = req.user.id;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Comment text is required" });
    }

    if (text.length > 500) {
      return res
        .status(400)
        .json({ error: "Comment must be less than 500 characters" });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const newComment = {
      userId: userId,
      text: text.trim(),
      createdAt: new Date(),
    };

    complaint.comments.push(newComment);
    await complaint.save();

    // Populate the newly added comment
    await complaint.populate("comments.userId", "name");

    // Get the newly added comment with user info
    const addedComment = complaint.comments[complaint.comments.length - 1];

    res.json({
      message: "Comment added successfully",
      comment: addedComment,
      commentCount: complaint.comments.length,
    });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete comment (only by comment author)
router.delete("/:id/comment/:commentId", auth, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const commentId = req.params.commentId;
    const userId = req.user.id;

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const comment = complaint.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }

    // Check if user is the author of the comment
    if (comment.userId.toString() !== userId) {
      return res
        .status(403)
        .json({ error: "You can only delete your own comments" });
    }

    comment.remove();
    await complaint.save();

    res.json({
      message: "Comment deleted successfully",
      commentCount: complaint.comments.length,
    });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Forward geocoding endpoint - get coordinates from address (for location search)
router.get("/geocode", async (req, res) => {
  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        error: "Address parameter is required",
      });
    }

    const axios = require("axios");
    const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Google Maps API key not configured",
      });
    }

    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (response.data.status === "OK" && response.data.results.length > 0) {
      res.json({
        success: true,
        results: response.data.results,
        message: `Found ${response.data.results.length} location(s) for: ${address}`,
      });
    } else {
      res.json({
        success: false,
        results: [],
        message: `No locations found for: ${address}`,
        error: response.data.status,
      });
    }
  } catch (error) {
    console.error("Forward geocoding error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to search for location",
      details: error.message,
    });
  }
});

// Get a specific complaint by ID
router.get("/:id", auth, async (req, res) => {
  try {
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Add full URLs to the response
    const complaintWithUrls = {
      ...complaint.toObject(),
      imageUrl: complaint.image
        ? `${req.protocol}://${req.get("host")}/${complaint.image}`
        : null,
      audioUrl: complaint.audio
        ? `${req.protocol}://${req.get("host")}/${complaint.audio}`
        : null,
    };

    res.json({ complaint: complaintWithUrls });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Admin routes for managing city complaints
router.get("/admin/my-city", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied. Admin role required." });
    }

    // Find admin details
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Get ALL complaints for this admin's city (including those assigned to departments)
    const complaints = await Complaint.find({
      "location.city": { $regex: new RegExp(`^${admin.assignedCity}$`, "i") },
      "location.state": { $regex: new RegExp(`^${admin.assignedState}$`, "i") },
    })
      .populate("userId", "name email")
      .populate("assignedDepartment", "name departmentType")
      .sort({ createdAt: -1 });

    // Add full URLs for images and audio, plus canManage property and assignment info
    const complaintsWithUrls = complaints.map((complaint) => ({
      ...complaint.toObject(),
      imageUrl: complaint.image
        ? `${process.env.TWILIO_WEBHOOK_BASE_URL || 'http://localhost:5000'}/${complaint.image}`
        : null,
      audioUrl: complaint.audio
        ? `${process.env.TWILIO_WEBHOOK_BASE_URL || 'http://localhost:5000'}/${complaint.audio}`
        : null,
      canManage: !complaint.assignedDepartment, // Admin can only manage complaints NOT assigned to departments
      assignmentType: complaint.assignedDepartment
        ? "department"
        : "unassigned",
      assignedDepartmentId: complaint.assignedDepartment || null,
    }));

    res.json({
      complaints: complaintsWithUrls,
      admin: {
        name: admin.name,
        city: admin.assignedCity,
        state: admin.assignedState,
      },
      count: complaintsWithUrls.length,
    });
  } catch (error) {
    console.error("Get admin city complaints error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Reverse geocoding endpoint - get detailed address from coordinates
router.post("/geocode", async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({
        error: "Both latitude and longitude are required",
      });
    }

    const locationInfo = await geocodingService.getCityFromCoordinates(
      lat,
      lng
    );

    res.json({
      success: true,
      location: locationInfo,
      message: `Address resolved using ${locationInfo.source}`,
    });
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    res.status(500).json({
      error: "Failed to resolve address from coordinates",
      details: error.message,
    });
  }
});

// Admin endpoint to update addresses for existing complaints
router.put("/admin/update-addresses", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied. Admin role required." });
    }

    // Find complaints that don't have detailed address information
    const complaintsToUpdate = await Complaint.find({
      $or: [
        { "location.detailedAddress": { $exists: false } },
        { "location.detailedAddress": null },
        { "location.detailedAddress": "" },
        { "location.streetAddress": { $exists: false } },
        { "location.streetAddress": null },
        { "location.streetAddress": "" },
      ],
    });

    console.log(
      `Found ${complaintsToUpdate.length} complaints to update with detailed addresses`
    );

    let updatedCount = 0;
    let errorCount = 0;

    for (const complaint of complaintsToUpdate) {
      try {
        const { lat, lng } = complaint.location;
        console.log(
          `Updating complaint ${complaint._id} with coordinates: ${lat}, ${lng}`
        );

        const locationInfo = await geocodingService.getCityFromCoordinates(
          lat,
          lng
        );

        await Complaint.findByIdAndUpdate(complaint._id, {
          $set: {
            "location.address": locationInfo.formattedAddress,
            "location.detailedAddress": locationInfo.detailedAddress,
            "location.streetAddress": locationInfo.streetAddress,
            "location.premise": locationInfo.premise,
            "location.subpremise": locationInfo.subpremise,
            "location.establishment": locationInfo.establishment,
            "location.pointOfInterest": locationInfo.pointOfInterest,
            "location.sublocality": locationInfo.sublocality,
            "location.sublocality1": locationInfo.sublocality1,
            "location.sublocality2": locationInfo.sublocality2,
            "location.sublocality3": locationInfo.sublocality3,
            "location.district": locationInfo.district,
            "location.postalCode": locationInfo.postalCode,
            "location.country": locationInfo.country,
            updatedAt: new Date(),
          },
        });

        updatedCount++;
        console.log(`Successfully updated complaint ${complaint._id}`);

        // Add delay to respect API rate limits
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(
          `Failed to update complaint ${complaint._id}:`,
          error.message
        );
        errorCount++;
      }
    }

    res.json({
      message: "Address update completed",
      totalFound: complaintsToUpdate.length,
      updated: updatedCount,
      errors: errorCount,
    });
  } catch (error) {
    console.error("Update addresses error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get complaints assigned to a department
router.get("/department/my-complaints", auth, async (req, res) => {
  try {
    // Check if the authenticated user is a department
    if (req.user.type !== "department") {
      return res.status(403).json({
        error: "Access denied. Department login required.",
      });
    }

    // Get department info
    const Department = require("../models/Department");
    const department = await Department.findById(req.user.id);
    if (!department) {
      return res.status(404).json({
        error: "Department not found",
      });
    }

    // Find complaints directly assigned to this department (primary method)
    const assignedComplaints = await Complaint.find({
      assignedDepartment: req.user.id,
    })
    .populate("userId", "name email phone")
    .sort({ createdAt: -1 });

    // Add full URL to image and audio paths
    const complaintsWithUrls = assignedComplaints.map((complaint) => ({
      ...complaint.toObject(),
      imageUrl: complaint.image
        ? `${req.protocol}://${req.get("host")}/${complaint.image}`
        : null,
      audioUrl: complaint.audio
        ? `${req.protocol}://${req.get("host")}/${complaint.audio}`
        : null,
      canResolve: complaint.status === "in_progress", // Can only resolve in-progress complaints
    }));

    // Calculate stats
    const stats = {
      total: complaintsWithUrls.length,
      pending: complaintsWithUrls.filter((c) => c.status === "pending").length,
      in_progress: complaintsWithUrls.filter((c) => c.status === "in_progress").length,
      resolved: complaintsWithUrls.filter((c) => c.status === "resolved").length,
    };

    res.json({
      complaints: complaintsWithUrls,
      department: department.toJSON(),
      stats,
      message: `Found ${complaintsWithUrls.length} complaints assigned to ${department.name}`,
    });
  } catch (err) {
    console.error("Department complaints error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Update complaint status (for departments) - only departments can resolve complaints
router.put("/department/:id/status", auth, async (req, res) => {
  try {
    // Check if the authenticated user is a department
    if (req.user.type !== "department") {
      return res.status(403).json({
        error: "Access denied. Department login required.",
      });
    }

    const { status, departmentComment } = req.body;
    const complaintId = req.params.id;

    // Departments can only change status to resolved (from in_progress)
    if (!["resolved"].includes(status)) {
      return res.status(400).json({
        error: "Departments can only resolve complaints. Use status: 'resolved'",
      });
    }

    const complaint = await Complaint.findOne({
      _id: complaintId,
      assignedDepartment: req.user.id, // Must be assigned to this department
      status: "in_progress", // Can only resolve in_progress complaints
    });

    if (!complaint) {
      return res.status(404).json({
        error: "Complaint not found, not assigned to your department, or not in progress",
      });
    }

    // Store old status for points and notifications
    const oldStatus = complaint.status;

    // Update complaint status to resolved
    complaint.status = "resolved";
    if (departmentComment) {
      complaint.departmentComment = departmentComment;
      
      // Also add as message
      if (!complaint.messages) {
        complaint.messages = [];
      }
      complaint.messages.push({
        sender: "admin", // Using admin for department messages
        text: `Department: ${departmentComment}`,
        createdAt: new Date(),
      });
    }
    complaint.updatedAt = new Date();

    await complaint.save();

    // Send notification to user about resolution
    try {
      const notificationService = require("../services/notificationService");
      const Department = require("../models/Department");
      const department = await Department.findById(req.user.id);

      await notificationService.sendStatusUpdateNotification(
        complaint,
        oldStatus,
        "resolved",
        department ? department.name : "Department",
        "Your complaint has been resolved by the department"
      );
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }

    // Points are only awarded when admin approves complaint (5 points)
    // No additional points awarded for resolution as per requirement

    res.json({
      message: "Complaint resolved successfully",
      complaint: complaint.toObject(),
      pointsAwarded: 10,
      notificationSent: true,
    });
  } catch (err) {
    console.error("Resolve complaint error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Phone Verification Routes

// Generate TwiML for verification call - BULLETPROOF VERSION
router.post("/verify-call/:complaintId", async (req, res) => {
  // ALWAYS return valid TwiML - no exceptions
  res.set('Content-Type', 'text/xml');
  
  try {
    const { complaintId } = req.params;
    
    // Validate complaintId format
    if (!complaintId || complaintId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(complaintId)) {
      console.error(`[PHONE-VERIFY] Invalid complaint ID in verify-call: ${complaintId}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">Invalid complaint reference. Please contact support.</Say>
    <Hangup/>
</Response>`;
      return res.status(200).send(errorTwiml);
    }
    
    console.log(`[PHONE-VERIFY] Generating initial TwiML for complaint ${complaintId}`);
    console.log(`[PHONE-VERIFY] Request details:`, {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    });
    
    const phoneVerificationService = require('../services/phoneVerificationService');
    const twiml = phoneVerificationService.generateVerificationTwiML(complaintId);
    
    // Validate TwiML before sending
    if (!twiml || !twiml.includes('<Response>')) {
      throw new Error('Invalid TwiML generated');
    }
    
    console.log(`[PHONE-VERIFY] ✅ TwiML generated successfully for complaint ${complaintId}`);
    return res.status(200).send(twiml);
    
  } catch (error) {
    console.error('[PHONE-VERIFY] ❌ Error generating TwiML:', {
      message: error.message,
      stack: error.stack,
      complaintId: req.params.complaintId,
      timestamp: new Date().toISOString()
    });
    
    // ALWAYS return valid TwiML even on error
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="hi-IN">
        तकनीकी समस्या है। कृपया बाद में कोशिश करें।
    </Say>
    <Say voice="alice" language="en-US">
        Technical issue occurred. Please try again later.
    </Say>
    <Hangup/>
</Response>`;
    return res.status(200).send(fallbackTwiml);
  }
});

// Handle language selection from user - BULLETPROOF VERSION
router.post("/language-selection/:complaintId", async (req, res) => {
  // ALWAYS return valid TwiML - no exceptions
  res.set('Content-Type', 'text/xml');
  
  try {
    const { complaintId } = req.params;
    const { Digits } = req.body || {};
    
    console.log(`[PHONE-VERIFY] Language selection for complaint ${complaintId}, input: ${Digits}`);
    console.log(`[PHONE-VERIFY] Full request body:`, req.body);
    
    // Validate complaintId
    if (!complaintId || complaintId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(complaintId)) {
      console.error(`[PHONE-VERIFY] Invalid complaint ID in language-selection: ${complaintId}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">Invalid complaint reference. Please contact support.</Say>
    <Hangup/>
</Response>`;
      return res.status(200).send(errorTwiml);
    }
    
    let language = 'en'; // Default to English
    
    if (Digits === '1') {
      language = 'en';
      console.log(`[PHONE-VERIFY] User selected English for complaint ${complaintId}`);
    } else if (Digits === '2') {
      language = 'hi';
      console.log(`[PHONE-VERIFY] User selected Hindi for complaint ${complaintId}`);
    } else {
      console.log(`[PHONE-VERIFY] Invalid/no language selection "${Digits}" for complaint ${complaintId}, defaulting to English`);
    }
    
    // Update complaint with selected language (best effort, don't fail if this fails)
    try {
      await Complaint.findByIdAndUpdate(complaintId, {
        phoneVerificationLanguage: language,
        phoneVerificationLanguageSelectedAt: new Date()
      });
    } catch (dbError) {
      console.warn(`[PHONE-VERIFY] Failed to update language preference: ${dbError.message}`);
    }
    
    const phoneVerificationService = require('../services/phoneVerificationService');
    const twiml = phoneVerificationService.generateLanguageSpecificVerificationTwiML(complaintId, language);
    
    // Validate TwiML before sending
    if (!twiml || !twiml.includes('<Response>')) {
      throw new Error('Invalid language-specific TwiML generated');
    }
    
    console.log(`[PHONE-VERIFY] ✅ Language-specific TwiML generated for complaint ${complaintId} in ${language}`);
    return res.status(200).send(twiml);
    
  } catch (error) {
    console.error('[PHONE-VERIFY] ❌ Error handling language selection:', {
      message: error.message,
      stack: error.stack,
      complaintId: req.params.complaintId,
      digits: req.body?.Digits,
      timestamp: new Date().toISOString()
    });
    
    // ALWAYS return valid TwiML even on error - fallback to English
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">Language selection error. Continuing in English.</Say>
    <Pause length="1"/>
    <Say voice="alice" language="en-US">Press 1 to confirm your complaint. Press 2 to reject your complaint.</Say>
    <Pause length="5"/>
    <Say voice="alice" language="en-US">I repeat - Press 1 to confirm, Press 2 to reject.</Say>
    <Gather input="dtmf" timeout="15" numDigits="1" action="${process.env.TWILIO_WEBHOOK_BASE_URL || 'https://abc123-def456-ghi789.ngrok-free.app'}/api/complaints/process-verification/${req.params.complaintId}" method="POST">
    </Gather>
    <Say voice="alice" language="en-US">No response received. Call ending.</Say>
    <Hangup/>
</Response>`;
    return res.status(200).send(fallbackTwiml);
  }
});

// Direct verification for specific language (fallback route) - BULLETPROOF VERSION
router.post("/verify-complaint/:complaintId", async (req, res) => {
  // ALWAYS return valid TwiML - no exceptions
  res.set('Content-Type', 'text/xml');
  
  try {
    const { complaintId } = req.params;
    const { lang } = req.query;
    
    console.log(`[PHONE-VERIFY] Direct verification for complaint ${complaintId} in language ${lang || 'en'}`);
    
    // Validate complaintId
    if (!complaintId || complaintId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(complaintId)) {
      console.error(`[PHONE-VERIFY] Invalid complaint ID in verify-complaint: ${complaintId}`);
      const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">Invalid complaint reference. Please contact support.</Say>
    <Hangup/>
</Response>`;
      return res.status(200).send(errorTwiml);
    }
    
    const phoneVerificationService = require('../services/phoneVerificationService');
    const twiml = phoneVerificationService.generateLanguageSpecificVerificationTwiML(complaintId, lang || 'en');
    
    // Validate TwiML before sending
    if (!twiml || !twiml.includes('<Response>')) {
      throw new Error('Invalid verification TwiML generated');
    }
    
    console.log(`[PHONE-VERIFY] ✅ Direct verification TwiML generated for complaint ${complaintId}`);
    return res.status(200).send(twiml);
    
  } catch (error) {
    console.error('[PHONE-VERIFY] ❌ Error in direct verification:', {
      message: error.message,
      stack: error.stack,
      complaintId: req.params.complaintId,
      language: req.query.lang,
      timestamp: new Date().toISOString()
    });
    
    // ALWAYS return valid TwiML even on error
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">
        Press 1 to confirm your complaint. Press 2 to reject your complaint.
    </Say>
    <Pause length="5"/>
    <Say voice="alice" language="en-US">
        I repeat - Press 1 to confirm, Press 2 to reject.
    </Say>
    <Gather input="dtmf" timeout="15" numDigits="1" action="${process.env.TWILIO_WEBHOOK_BASE_URL || 'https://abc123-def456-ghi789.ngrok-free.app'}/api/complaints/process-verification/${req.params.complaintId}" method="POST">
    </Gather>
    <Say voice="alice" language="en-US">No response received. Call ending.</Say>
    <Hangup/>
</Response>`;
    return res.status(200).send(fallbackTwiml);
  }
});

// Process verification input from user
// complaint.js - Only the updated /process-verification route (replace the existing one)
router.post("/process-verification/:complaintId", async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { Digits } = req.body;
    
    console.log(`[PHONE-VERIFY] Processing verification for complaint ${complaintId}, input: ${Digits}`);
    console.log(`[PHONE-VERIFY] Full request body:`, req.body);
    
    // Validate complaintId
    if (!complaintId || complaintId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(complaintId)) {
      console.error(`[PHONE-VERIFY] Invalid complaint ID: ${complaintId}`);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">
        Invalid complaint ID. Please contact support for assistance.
    </Say>
    <Hangup/>
</Response>`;
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml);
    }
    
    // Validate input
    if (!Digits || !['1', '2'].includes(Digits)) {
      console.log(`[PHONE-VERIFY] Invalid input received: ${Digits}`);
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">
        Invalid input received. Please press 1 to confirm or 2 to reject your complaint.
    </Say>
    <Pause length="2"/>
    <Say voice="alice" language="en-US">
        Call ending. Please try again.
    </Say>
    <Hangup/>
</Response>`;
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml);
    }
    
    console.log(`[PHONE-VERIFY] Loading phoneVerificationService...`);
    const phoneVerificationService = require('../services/phoneVerificationService');
    
    console.log(`[PHONE-VERIFY] Calling processVerificationInput...`);
    const result = await phoneVerificationService.processVerificationInput(complaintId, Digits);
    console.log(`[PHONE-VERIFY] processVerificationInput result:`, result);
    
    // Get complaint to check selected language - with validation
    console.log(`[PHONE-VERIFY] Fetching complaint for language check...`);
    const Complaint = require('../models/Complaint');
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      console.error(`[PHONE-VERIFY] Complaint ${complaintId} not found in database for language check`);
      throw new Error('Complaint not found during language retrieval');
    }
    const language = complaint.phoneVerificationLanguage || 'en';
    console.log(`[PHONE-VERIFY] Language selected: ${language}`);
    
    let responseMessage;
    
    if (Digits === '1') {
      if (result.routedToDepartment) {
        responseMessage = language === 'hi' 
          ? "धन्यवाद! आपकी शिकायत की पुष्टि हो गई है और उसे संबंधित विभाग को भेज दिया गया है। वे जल्द ही आपसे संपर्क करेंगे।"
          : "Thank you! Your complaint has been confirmed and forwarded to the appropriate department. They will contact you soon.";
      } else {
        responseMessage = language === 'hi' 
          ? "धन्यवाद! आपकी शिकायत की पुष्टि हो गई है। इसे शीघ्र ही उपयुक्त विभाग को सौंप दिया जाएगा।"
          : "Thank you! Your complaint has been confirmed. It will be assigned to the appropriate department shortly.";
      }
    } else if (Digits === '2') {
      responseMessage = language === 'hi' 
        ? "आपकी शिकायत आपके अनुरोध के अनुसार रद्द कर दी गई है। धन्यवाद।"
        : "Your complaint has been cancelled as per your request. Thank you.";
    }
    
    console.log(`[PHONE-VERIFY] Generating TwiML response...`);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="${language === 'hi' ? 'hi-IN' : 'en-US'}">
        ${responseMessage}
    </Say>
    <Pause length="2"/>
    <Say voice="alice" language="${language === 'hi' ? 'hi-IN' : 'en-US'}">
        ${language === 'hi' ? 'कॉल समाप्त हो रहा है। धन्यवाद।' : 'Call ending. Thank you.'}
    </Say>
    <Hangup/>
</Response>`;
    
    console.log(`[PHONE-VERIFY] Sending TwiML response for complaint ${complaintId}`);
    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml);
    
  } catch (error) {
    console.error(`[PHONE-VERIFY] Error processing verification for complaint ${req.params.complaintId}:`, {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      requestParams: req.params,
      timestamp: new Date().toISOString()
    });
    
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="en-US">
        Sorry, an application error has occurred. Please try again later or contact support.
    </Say>
    <Hangup/>
</Response>`;
    res.set('Content-Type', 'text/xml');
    res.status(200).send(twiml);  // Always return 200 for TwiML responses
  }
});

// Handle call status updates from Twilio (must always return 200)
router.post("/call-status/:complaintId", async (req, res) => {
  try {
    const { complaintId } = req.params;
    const statusData = req.body || {};
    const callStatus = statusData.CallStatus || 'unknown';
    
    console.log(`[PHONE-VERIFY] Call status update for ${complaintId}:`, callStatus);
    console.log(`[PHONE-VERIFY] Full status data:`, statusData);

    // Best-effort store status update, but never fail the webhook
    try {
      const Complaint = require('../models/Complaint');
      
      // First, save the call status update
      await Complaint.findByIdAndUpdate(complaintId, {
        $push: {
          callStatusUpdates: {
            status: callStatus,
            timestamp: new Date(),
            duration: statusData.CallDuration,
            data: statusData
          }
        }
      });
      
      // Handle specific call statuses that indicate user didn't pick up
      const noAnswerStatuses = ['no-answer', 'busy', 'failed'];
      
      if (noAnswerStatuses.includes(callStatus)) {
        console.log(`[PHONE-VERIFY] 📞❌ User did not answer call (${callStatus}) - auto-rejecting complaint ${complaintId}`);
        
        // Get current complaint to check if it needs to be rejected
        const complaint = await Complaint.findById(complaintId);
        
        if (complaint && ['pending_verification', 'phone_verified'].includes(complaint.status)) {
          // Move complaint to rejected status due to no answer
          const updateResult = await Complaint.findByIdAndUpdate(complaintId, {
            status: 'rejected_no_answer',
            phoneVerificationStatus: 'no_answer',
            phoneVerificationAt: new Date(),
            rejectedAt: new Date(),
            rejectionReason: `Phone verification failed - user did not answer call (${callStatus})`,
            updatedAt: new Date(),
            noAnswerCallStatus: callStatus,
            noAnswerTimestamp: new Date()
          }, { new: true });
          
          if (updateResult) {
            console.log(`[PHONE-VERIFY] ✅ Complaint ${complaintId} automatically rejected due to no answer (${callStatus})`);
            
            // Send notification to user about missed call and rejection
            try {
              const notificationService = require('../services/notificationService');
              await notificationService.sendStatusUpdateNotification(
                updateResult,
                complaint.status,
                'rejected_no_answer',
                'Phone Verification System'
              );
              console.log(`[PHONE-VERIFY] 📧 Sent rejection notification for complaint ${complaintId}`);
            } catch (notifError) {
              console.warn(`[PHONE-VERIFY] Failed to send rejection notification:`, notifError.message);
            }
            
          } else {
            console.error(`[PHONE-VERIFY] Failed to update complaint ${complaintId} for no-answer rejection`);
          }
        } else {
          console.log(`[PHONE-VERIFY] Complaint ${complaintId} not in verification state (${complaint?.status}), skipping auto-rejection`);
        }
      } else if (callStatus === 'completed') {
        console.log(`[PHONE-VERIFY] ✅ Call completed successfully for complaint ${complaintId}`);
      } else if (callStatus === 'in-progress') {
        console.log(`[PHONE-VERIFY] 📞 Call in progress for complaint ${complaintId}`);
      }
      
    } catch (dbErr) {
      console.warn('[PHONE-VERIFY] Failed to save call status update or handle rejection:', dbErr.message);
    }

    res.set('Content-Type', 'text/plain');
    return res.status(200).send('OK');
  } catch (error) {
    // Still respond 200 to avoid Twilio retries & application error
    console.error('[PHONE-VERIFY] Error handling call status:', error.message);
    res.set('Content-Type', 'text/plain');
    return res.status(200).send('OK');
  }
});

// Handle verification timeout
router.post("/verification-timeout/:complaintId", async (req, res) => {
  try {
    const { complaintId } = req.params;
    
    console.log(`[PHONE-VERIFY] Verification timeout for complaint ${complaintId}`);
    
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).send('<Response><Say>Complaint not found</Say></Response>');
    }
    
    // Check if this is the first timeout or retry timeout
    if (!complaint.phoneVerificationRetryScheduled) {
      // First timeout - mark as no answer and schedule retry
      await Complaint.findByIdAndUpdate(complaintId, {
        phoneVerificationStatus: 'timeout',
        phoneVerificationTimeoutAt: new Date()
      });
      
      console.log(`[PHONE-VERIFY] First timeout for ${complaintId}, retry will be scheduled`);
      
      const phoneVerificationService = require('../services/phoneVerificationService');
      await phoneVerificationService.scheduleRetryCall(complaintId, complaint.phone);
      
    } else {
      // Second timeout (after retry) - reject complaint
      const rejectedComplaint = await Complaint.findByIdAndUpdate(complaintId, {
        status: 'rejected',
        phoneVerificationStatus: 'timeout',
        phoneVerificationAt: new Date(),
        rejectionReason: 'Phone verification not completed - user did not respond to calls'
      }, { new: true });
      
      // Send notification about rejection
      try {
        const notificationService = require('../services/notificationService');
        await notificationService.sendStatusUpdateNotification(
          rejectedComplaint,
          complaint.status,
          'rejected',
          'Phone Verification System'
        );
        console.log(`[PHONE-VERIFY] 📧 Sent timeout rejection notification for complaint ${complaintId}`);
      } catch (notifError) {
        console.warn(`[PHONE-VERIFY] Failed to send timeout rejection notification:`, notifError.message);
      }
      
      console.log(`[PHONE-VERIFY] Final timeout for ${complaintId}, complaint rejected`);
    }
    
    const language = complaint.phoneVerificationLanguage || 'en';
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    ${language === 'hi' ? `<Say voice="alice" language="hi-IN">
        समय समाप्त हो गया। ${complaint.phoneVerificationRetryScheduled ? 'आपकी शिकायत रद्द कर दी गई है।' : 'हम 10 मिनट बाद फिर कॉल करेंगे।'}
    </Say>` : ''}
    <Say voice="alice" language="en-US">
        ${complaint.phoneVerificationRetryScheduled ? 
          'Verification timeout. Your complaint has been rejected due to no response.' : 
          'Verification timeout. We will call again in 10 minutes.'}
    </Say>
</Response>`;
    
  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml);
    
  } catch (error) {
  console.error('[PHONE-VERIFY] Error handling timeout:', error);
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="en-US">A system error occurred while handling timeout. Please try again later.</Say>
  <Hangup/>
</Response>`;
  res.set('Content-Type', 'text/xml');
  res.status(200).send(twiml);
  }
});

// DEBUG: Get all complaints for a specific user (temporary debug endpoint)
router.get("/debug/user/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('[COMPLAINT-DEBUG] Debug endpoint called for user:', userId);
    
    // Get all complaints for this user
    const complaints = await Complaint.find({ userId: userId });
    console.log('[COMPLAINT-DEBUG] Found', complaints.length, 'complaints for user', userId);
    
    // Also check with different query approaches
    const complaintsByStringId = await Complaint.find({ userId: userId.toString() });
    const allComplaints = await Complaint.find({});
    const userMatches = allComplaints.filter(c => c.userId && c.userId.toString() === userId.toString());
    
    console.log('[COMPLAINT-DEBUG] Alternative queries:', {
      byStringId: complaintsByStringId.length,
      allComplaints: allComplaints.length,
      userMatches: userMatches.length
    });
    
    res.json({
      success: true,
      userId,
      complaints,
      counts: {
        direct: complaints.length,
        byStringId: complaintsByStringId.length,
        totalComplaints: allComplaints.length,
        userMatches: userMatches.length
      }
    });
  } catch (error) {
    console.error('[COMPLAINT-DEBUG] Error in debug endpoint:', error);
    res.status(500).json({
      success: false,
      message: "Debug error",
      error: error.message
    });
  }
});

// Get verification status (for frontend to check)
router.get("/verification-status/:complaintId", auth, async (req, res) => {
  try {
    const { complaintId } = req.params;
    
    const complaint = await Complaint.findById(complaintId).select(
      'status phoneVerificationStatus phoneVerificationAt phoneVerificationInput assignedDepartment'
    ).populate('assignedDepartment', 'name departmentType');
    
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    // Check if user owns this complaint
    if (complaint.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({
      complaintId: complaintId,
      status: complaint.status,
      phoneVerificationStatus: complaint.phoneVerificationStatus,
      phoneVerificationAt: complaint.phoneVerificationAt,
      verified: complaint.phoneVerificationStatus === 'phone_verified',
      assignedDepartment: complaint.assignedDepartment ? {
        name: complaint.assignedDepartment.name,
        type: complaint.assignedDepartment.departmentType
      } : null
    });
    
  } catch (error) {
    console.error('[PHONE-VERIFY] Error getting verification status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
