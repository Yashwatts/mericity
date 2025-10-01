const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || "your-api-key-here"
);

/**
 * Detects the appropriate department for a complaint using AI analysis
 * @param {string} description - The complaint description to analyze
 * @param {string} category - Optional category hint
 * @param {Object} location - Location information (city, state, etc.)
 * @returns {Promise<Object>} - Returns detected department info and confidence
 */
async function detectDepartment(description, category = "", location = {}) {
  try {
    // Check if API key is properly configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-api-key-here" || apiKey.trim() === "") {
      console.log(
        "Gemini API key not configured, using fallback keyword detection"
      );
      return await fallbackDepartmentDetection(description, category);
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Define available departments and their comprehensive keyword lists
    const departmentMap = {
      "Fire Department": [
        "fire", "burning", "smoke", "flames", "burn", "fire hazard", "fire safety", "fire emergency",
        "fire accident", "gas leak", "explosion", "fire extinguisher", "firefighter", "fire station",
        "fire truck", "rescue", "emergency", "blaze", "arson", "fire alarm", "fire prevention"
      ],
      "Police Department": [
        "crime", "theft", "robbery", "stolen", "assault", "violence", "harassment", "criminal",
        "law enforcement", "security", "vandalism", "drugs", "noise", "domestic violence", "accident",
        "traffic violation", "speeding", "drunk driving", "public safety", "suspicious", "criminal activity",
        "law and order", "police", "FIR", "complaint", "illegal", "unlawful", "fight", "dispute"
      ],
      "Water Department": [
        "water", "pipe", "leak", "leakage", "burst", "water supply", "water pressure", "sewage",
        "drainage", "flood", "waterlog", "water quality", "contamination", "water shortage", "water bill",
        "water connection", "pipeline", "water treatment", "dirty water", "water waste", "plumbing",
        "sewer", "manhole", "water meter", "tap water", "drinking water", "water problem"
      ],
      "Road Department": [
        "road", "pothole", "street", "highway", "traffic", "signal", "traffic light", "street light",
        "pavement", "road damage", "road construction", "road repair", "road maintenance", "traffic jam",
        "traffic congestion", "road sign", "zebra crossing", "footpath", "sidewalk", "bridge",
        "flyover", "road safety", "speed breaker", "divider", "asphalt", "tar road"
      ],
      "Health Department": [
        "health", "medical", "hospital", "clinic", "doctor", "sanitation", "hygiene", "disease",
        "illness", "epidemic", "contamination", "food poisoning", "food safety", "public health",
        "health services", "medical emergency", "health hazard", "air quality", "pollution",
        "medical waste", "health inspection", "vaccination", "health center", "healthcare"
      ],
      "Electricity Department": [
        "electricity", "power", "electric", "current", "voltage", "power cut", "power outage",
        "blackout", "electrical", "transformer", "power line", "electric pole", "electric wire",
        "short circuit", "electric shock", "power supply", "electrical fault", "meter reading",
        "electricity bill", "power failure", "electrical hazard", "electric connection", "load shedding"
      ],
      "Municipal Corporation": [
        "waste", "garbage", "trash", "litter", "dumping", "cleaning", "sweeping", "municipal",
        "civic", "public toilet", "park", "garden", "street cleaning", "waste collection",
        "garbage collection", "solid waste", "waste management", "municipal services", "public amenities",
        "civic amenities", "building permission", "municipal tax", "city planning", "public spaces",
        "dustbin", "sanitation", "cleanliness", "municipal corporation"
      ],
      "Transport Department": [
        "transport", "bus", "auto", "rickshaw", "taxi", "vehicle", "driving license", "vehicle registration",
        "RTO", "motor vehicle", "transport services", "public transport", "bus stop", "bus route",
        "traffic management", "vehicle permit", "driving test", "vehicle insurance", "pollution certificate",
        "vehicle fitness", "commercial vehicle", "passenger vehicle", "metro", "local train"
      ]
    };

    // Create a comprehensive prompt for AI analysis
    const prompt = `
    You are an AI assistant that helps route citizen complaints to the appropriate government department.

    Available Departments and their typical responsibilities:
    ${Object.entries(departmentMap)
      .map(([dept, keywords]) => `${dept}: ${keywords.join(", ")}`)
      .join("\n")}

    Complaint Details:
    Description: "${description}"
    Category: "${category}"
    Location: ${location.city || "Unknown"}, ${location.state || "Unknown"}

    Based on the complaint description, determine which department should handle this issue.

    Please respond with ONLY a JSON object in this exact format:
    {
      "department": "Department Name",
      "confidence": 0.95,
      "reasoning": "Brief explanation of why this department was selected",
      "keywords_matched": ["keyword1", "keyword2"]
    }

    Rules:
    - Choose the most appropriate department from the list above
    - Confidence should be between 0.0 and 1.0
    - If unsure, default to "Municipal Corporation" with lower confidence
    - Consider the description content more than category
    - Match keywords and context, not just exact words
    `;

    // Generate response
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let aiResponse;
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.warn("Failed to parse AI response, using fallback:", parseError);
      // Fallback analysis using simple keyword matching
      aiResponse = await fallbackDepartmentDetection(
        description,
        category,
        departmentMap
      );
    }

    // Validate and normalize the response
    if (
      !aiResponse.department ||
      !departmentMap.hasOwnProperty(aiResponse.department)
    ) {
      console.warn("Invalid department detected, using fallback");
      aiResponse = await fallbackDepartmentDetection(
        description,
        category,
        departmentMap
      );
    }

    return {
      success: true,
      department: aiResponse.department,
      confidence: aiResponse.confidence || 0.7,
      reasoning: aiResponse.reasoning || "AI-based analysis",
      keywords_matched: aiResponse.keywords_matched || [],
      analysis_method: "gemini-ai",
    };
  } catch (error) {
    console.error("AI department detection error:", error);

    // Fallback to rule-based detection if AI fails
    return await fallbackDepartmentDetection(description, category);
  }
}

/**
 * Fallback department detection using simple keyword matching
 */
async function fallbackDepartmentDetection(
  description,
  category = "",
  departmentMap = null
) {
  const departments = departmentMap || {
    "Fire Department": [
      "fire", "burning", "smoke", "flames", "burn", "fire hazard", "fire safety", "fire emergency",
      "fire accident", "gas leak", "explosion", "fire extinguisher", "firefighter", "fire station",
      "fire truck", "rescue", "emergency", "blaze", "arson", "fire alarm", "fire prevention"
    ],
    "Police Department": [
      "crime", "theft", "robbery", "stolen", "assault", "violence", "harassment", "criminal",
      "law enforcement", "security", "vandalism", "drugs", "noise", "domestic violence", "accident",
      "traffic violation", "speeding", "drunk driving", "public safety", "suspicious", "criminal activity",
      "law and order", "police", "FIR", "complaint", "illegal", "unlawful", "fight", "dispute"
    ],
    "Water Department": [
      "water", "pipe", "leak", "leakage", "burst", "water supply", "water pressure", "sewage",
      "drainage", "flood", "waterlog", "water quality", "contamination", "water shortage", "water bill",
      "water connection", "pipeline", "water treatment", "dirty water", "water waste", "plumbing",
      "sewer", "manhole", "water meter", "tap water", "drinking water", "water problem"
    ],
    "Road Department": [
      "road", "pothole", "street", "highway", "traffic", "signal", "traffic light", "street light",
      "pavement", "road damage", "road construction", "road repair", "road maintenance", "traffic jam",
      "traffic congestion", "road sign", "zebra crossing", "footpath", "sidewalk", "bridge",
      "flyover", "road safety", "speed breaker", "divider", "asphalt", "tar road"
    ],
    "Health Department": [
      "health", "medical", "hospital", "clinic", "doctor", "sanitation", "hygiene", "disease",
      "illness", "epidemic", "contamination", "food poisoning", "food safety", "public health",
      "health services", "medical emergency", "health hazard", "air quality", "pollution",
      "medical waste", "health inspection", "vaccination", "health center", "healthcare"
    ],
    "Electricity Department": [
      "electricity", "power", "electric", "current", "voltage", "power cut", "power outage",
      "blackout", "electrical", "transformer", "power line", "electric pole", "electric wire",
      "short circuit", "electric shock", "power supply", "electrical fault", "meter reading",
      "electricity bill", "power failure", "electrical hazard", "electric connection", "load shedding"
    ],
    "Municipal Corporation": [
      "waste", "garbage", "trash", "litter", "dumping", "cleaning", "sweeping", "municipal",
      "civic", "public toilet", "park", "garden", "street cleaning", "waste collection",
      "garbage collection", "solid waste", "waste management", "municipal services", "public amenities",
      "civic amenities", "building permission", "municipal tax", "city planning", "public spaces",
      "dustbin", "sanitation", "cleanliness", "municipal corporation"
    ],
    "Transport Department": [
      "transport", "bus", "auto", "rickshaw", "taxi", "vehicle", "driving license", "vehicle registration",
      "RTO", "motor vehicle", "transport services", "public transport", "bus stop", "bus route",
      "traffic management", "vehicle permit", "driving test", "vehicle insurance", "pollution certificate",
      "vehicle fitness", "commercial vehicle", "passenger vehicle", "metro", "local train"
    ]
  };

  const text = (description + " " + category).toLowerCase();
  let bestMatch = { department: "Municipal Corporation", score: 0, matchedKeywords: [] };

  for (const [dept, keywords] of Object.entries(departments)) {
    let score = 0;
    let matchedKeywords = [];
    
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      if (text.includes(keywordLower)) {
        // Give higher score for exact word matches vs partial matches
        const wordBoundaryMatch = new RegExp(`\\b${keywordLower}\\b`).test(text);
        score += wordBoundaryMatch ? 2 : 1; // 2 points for exact word, 1 for partial
        matchedKeywords.push(keyword);
      }
    }

    if (score > bestMatch.score) {
      bestMatch = { department: dept, score, matchedKeywords };
    }
  }

  const confidence = bestMatch.score > 0 ? Math.min(bestMatch.score * 0.1 + 0.6, 0.95) : 0.6;

  return {
    success: true,
    department: bestMatch.department,
    confidence: confidence,
    reasoning: `Enhanced keyword matching (${bestMatch.score} points from ${bestMatch.matchedKeywords.length} keywords)`,
    keywords_matched: bestMatch.matchedKeywords,
    analysis_method: "enhanced-fallback-keywords",
  };
}

/**
 * Maps AI-detected department names to actual departmentType values in database
 * This allows flexibility in department naming while maintaining AI detection accuracy
 */
const departmentTypeMapping = {
  "Municipal Corporation": ["Municipal Corporation", "Garbage Department", "Waste Management", "Sanitation Department", "Civic Services", "Solid Waste Management", "Municipal Services"],
  "Fire Department": ["Fire Department", "Fire Services", "Emergency Services", "Fire and Safety", "Fire Brigade"],
  "Police Department": ["Police Department", "Law Enforcement", "Police Services", "Traffic Police", "Police Station"],
  "Road Department": ["Road Department", "Public Works", "Highway Department", "PWD", "Roads and Buildings", "Public Works Department", "Infrastructure Department"],
  "Water Department": ["Water Department", "Water Supply", "Water Board", "Irrigation Department", "Water Works", "Municipal Water"],
  "Health Department": ["Health Department", "Public Health", "Medical Services", "Healthcare", "Health Services", "Medical Department"],
  "Electricity Department": ["Electricity Department", "Power Department", "Electrical Services", "Energy Department", "Power Board", "Electricity Board"],
  "Transport Department": ["Transport Department", "Traffic Department", "Motor Vehicles", "RTO", "Regional Transport Office", "Traffic Management"],
};

/**
 * Find departments in a specific location
 * @param {string} departmentType - Type of department needed
 * @param {Object} location - Location object with city, state, district
 * @returns {Promise<Array>} - Array of matching departments
 */
async function findDepartmentsByLocation(departmentType, location) {
  try {
    const Department = require("../models/Department");

    console.log(`Looking for ${departmentType} in location:`, location);

    // Get possible department types from mapping
    const possibleTypes = departmentTypeMapping[departmentType] || [departmentType];
    console.log(`Checking for department types: ${possibleTypes.join(', ')}`);

    // Priority 1: Exact city match
    let departments = await Department.find({
      departmentType: { $in: possibleTypes },
      isActive: true,
      assignedCity: { $regex: new RegExp(`^${location.city}$`, "i") },
    }).select("-password");

    if (departments.length > 0) {
      console.log(
        `Found ${departments.length} departments with exact city match: ${departments.map(d => d.name + ' (' + d.departmentType + ')').join(', ')}`
      );
      return departments;
    }

    // Priority 2: City contains or partial match
    departments = await Department.find({
      departmentType: { $in: possibleTypes },
      isActive: true,
      assignedCity: { $regex: new RegExp(location.city || "", "i") },
    }).select("-password");

    if (departments.length > 0) {
      console.log(
        `Found ${departments.length} departments with city partial match: ${departments.map(d => d.name + ' (' + d.departmentType + ')').join(', ')}`
      );
      return departments;
    }

    // Priority 3: District match
    if (location.district) {
      departments = await Department.find({
        departmentType: { $in: possibleTypes },
        isActive: true,
        assignedDistrict: { $regex: new RegExp(location.district, "i") },
      }).select("-password");

      if (departments.length > 0) {
        console.log(
          `Found ${departments.length} departments with district match: ${departments.map(d => d.name + ' (' + d.departmentType + ')').join(', ')}`
        );
        return departments;
      }
    }

    // Priority 4: State match (broader search)
    departments = await Department.find({
      departmentType: { $in: possibleTypes },
      isActive: true,
      assignedState: { $regex: new RegExp(location.state || "", "i") },
    }).select("-password");

    if (departments.length > 0) {
      console.log(`Found ${departments.length} departments with state match: ${departments.map(d => d.name + ' (' + d.departmentType + ')').join(', ')}`);
      return departments;
    }

    console.log(`No departments found matching types: ${possibleTypes.join(', ')} in any location level`);
    return departments;
  } catch (error) {
    console.error("Error finding departments by location:", error);
    return [];
  }
}

/**
 * Main function to detect and route complaint to appropriate department
 * @param {Object} complaintData - Complete complaint data
 * @returns {Promise<Object>} - Routing decision with department info
 */
async function routeComplaintToDepartment(complaintData) {
  try {
    const { description, category, location } = complaintData;

    // Validate input
    if (!description || !location) {
      console.error("Invalid complaint data provided to routing function");
      return {
        success: false,
        error: "Invalid complaint data - missing description or location",
      };
    }

    // Step 1: Detect appropriate department type using AI
    let detection;
    try {
      detection = await detectDepartment(description, category, location);
    } catch (detectionError) {
      console.error("Department detection failed:", detectionError);
      detection = await fallbackDepartmentDetection(description, category);
    }

    if (!detection.success) {
      console.warn(
        "Department detection failed, using Municipal Corporation fallback"
      );
      detection = {
        success: true,
        department: "Municipal Corporation",
        confidence: 0.5,
        reasoning: "Fallback due to detection failure",
        analysis_method: "fallback-error",
      };
    }

    // Step 2: Find specific departments in the location
    let availableDepartments = [];
    try {
      availableDepartments = await findDepartmentsByLocation(
        detection.department,
        location
      );
    } catch (locationError) {
      console.error("Error finding departments by location:", locationError);
      availableDepartments = [];
    }

    if (availableDepartments.length === 0) {
      console.warn(`No ${detection.department} found in location:`, location);

      // Enhanced fallback strategy to prevent call hangups
      let fallbackDepartment = null;
      let fallbackReason = '';
      
      // Try 1: Find Municipal Corporation as general fallback
      let fallbackDepartments = await findDepartmentsByLocation("Municipal Corporation", location);
      
      if (fallbackDepartments.length === 0) {
        // Try 2: Find Garbage Services (since it exists in multiple cities)  
        const Department = require("../models/Department");
        fallbackDepartments = await Department.find({
          departmentType: { $regex: /(Garbage|Municipal|Sanitation|Waste|Civic)/i },
          isActive: true,
          assignedCity: { $regex: new RegExp(location.city || "", "i") }
        }).select("-password");
      }
      
      if (fallbackDepartments.length === 0) {
        // Try 3: Find any active department in the city
        const Department = require("../models/Department");
        fallbackDepartments = await Department.find({
          isActive: true,
          assignedCity: { $regex: new RegExp(location.city || "", "i") }
        }).select("-password");
      }
      
      if (fallbackDepartments.length === 0) {
        // Try 4: Find any active department in the state
        const Department = require("../models/Department");  
        fallbackDepartments = await Department.find({
          isActive: true,
          assignedState: { $regex: new RegExp(location.state || "", "i") }
        }).select("-password");
      }
      
      // Build appropriate response message
      if (fallbackDepartments.length > 0) {
        fallbackDepartment = fallbackDepartments[0];
        fallbackReason = `${detection.reasoning}. No ${detection.department} available in location, assigned to ${fallbackDepartment.name}.`;
      } else {
        // Even if no department found, return success to prevent call hangup
        fallbackReason = `${detection.reasoning}. No department available for auto-assignment in this location, complaint will be manually assigned by admin.`;
      }

      return {
        success: true, // Always return success to prevent phone call hangups
        detectedDepartment: detection.department,
        assignedDepartment: fallbackDepartment,
        confidence: detection.confidence * 0.6, // Reduced confidence for fallback
        reasoning: fallbackReason,
        analysis_method: detection.analysis_method,
        is_fallback: true,
        fallback_reason: fallbackDepartment ? 'department_type_not_found' : 'no_department_available',
        requires_manual_assignment: !fallbackDepartment
      };
    }

    // Step 3: Return the best matching department
    // For now, return the first available department
    // This can be enhanced with additional criteria like workload, proximity, etc.
    return {
      success: true,
      detectedDepartment: detection.department,
      assignedDepartment: availableDepartments[0],
      confidence: detection.confidence,
      reasoning: detection.reasoning,
      analysis_method: detection.analysis_method,
      alternatives: availableDepartments.slice(1), // Other available departments
      is_fallback: false,
    };
  } catch (error) {
    console.error("Complaint routing error:", error);
    return {
      success: false,
      error: "Failed to route complaint",
      details: error.message,
    };
  }
}

module.exports = {
  detectDepartment,
  findDepartmentsByLocation,
  routeComplaintToDepartment,
};
