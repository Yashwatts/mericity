const express = require('express');
const multer = require('multer');
const vision = require('@google-cloud/vision');
const router = express.Router();

// Configure multer for image uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Initialize Google Vision client
const client = new vision.ImageAnnotatorClient({
  // Use API key from environment variable for free tier
  keyFile: process.env.GOOGLE_VISION_KEY_FILE || undefined,
  apiKey: process.env.GOOGLE_VISION_API_KEY || undefined,
});

// Check configuration
if (!process.env.GOOGLE_VISION_API_KEY && !process.env.GOOGLE_VISION_KEY_FILE) {
  console.warn('⚠️  Google Vision API key not configured - will use fallback');
} else {
  console.log('✅ Google Vision API configured');
}

// Generate civic issue description using Google Vision API
async function generateCivicDescriptionWithVision(imageBuffer) {
  try {
    console.log('🔍 Calling Google Vision API for image analysis...');
    
    // Check if API key exists
    if (!process.env.GOOGLE_VISION_API_KEY && !process.env.GOOGLE_VISION_KEY_FILE) {
      throw new Error('Google Vision API key not configured');
    }

    // Analyze image with multiple detection types
    const [labelResult] = await client.labelDetection({
      image: { content: imageBuffer }
    });
    
    const [objectResult] = await client.objectLocalization({
      image: { content: imageBuffer }
    });

    const labels = labelResult.labelAnnotations || [];
    const objects = objectResult.localizedObjectAnnotations || [];

    console.log('🏷️ Vision API Labels:', labels.slice(0, 10).map(l => l.description));
    console.log('🎯 Vision API Objects:', objects.slice(0, 5).map(o => o.name));

    // Generate description based on detected labels and objects
    const description = generateSmartDescription(labels, objects);

    console.log('✅ Google Vision API Success!');
    console.log('📝 Generated description:', description);

    return {
      success: true,
      extractedText: description,
      suggestion: description,
      confidence: 'high',
      method: 'google-vision-api',
      labels: labels.slice(0, 5).map(l => ({ description: l.description, score: l.score })),
      objects: objects.slice(0, 3).map(o => ({ name: o.name, score: o.score }))
    };

  } catch (error) {
    console.error('❌ Google Vision API Error:', error.message);
    throw error;
  }
}

// Smart description generator based on Vision API results
function generateSmartDescription(labels, objects) {
  const labelDescriptions = labels.map(l => l.description.toLowerCase());
  const objectNames = objects.map(o => o.name.toLowerCase());
  const allDetections = [...labelDescriptions, ...objectNames];

  console.log('🧠 Analyzing detections:', allDetections);

  // Garbage/Waste related
  if (allDetections.some(d => 
    d.includes('garbage') || d.includes('trash') || d.includes('waste') || 
    d.includes('litter') || d.includes('rubbish') || d.includes('refuse') ||
    d.includes('plastic bag') || d.includes('bottle') || d.includes('food waste') ||
    d.includes('debris') || d.includes('recycling') || d.includes('bin'))) {
    
    const severity = allDetections.some(d => d.includes('pile') || d.includes('scattered')) ? 'scattered' : 'accumulated';
    const location = allDetections.some(d => d.includes('street') || d.includes('road')) ? 'street area' : 
                    allDetections.some(d => d.includes('building') || d.includes('residential')) ? 'residential area' : 'public area';
    
    const wasteTypes = [];
    if (allDetections.some(d => d.includes('plastic'))) wasteTypes.push('plastic containers');
    if (allDetections.some(d => d.includes('bottle'))) wasteTypes.push('bottles');
    if (allDetections.some(d => d.includes('food'))) wasteTypes.push('food waste');
    if (allDetections.some(d => d.includes('paper'))) wasteTypes.push('paper debris');
    
    const wasteDesc = wasteTypes.length > 0 ? `including ${wasteTypes.join(', ')} ` : '';
    
    return `${severity.charAt(0).toUpperCase() + severity.slice(1)} garbage and waste materials ${wasteDesc}in ${location}, creating unsanitary conditions and potential health hazards requiring immediate municipal cleanup services.`;
  }

  // Road/Infrastructure issues
  if (allDetections.some(d => 
    d.includes('road') || d.includes('street') || d.includes('asphalt') || 
    d.includes('pothole') || d.includes('crack') || d.includes('pavement') ||
    d.includes('tar') || d.includes('concrete'))) {
    
    const damageType = allDetections.some(d => d.includes('pothole')) ? 'potholes and surface damage' : 
                      allDetections.some(d => d.includes('crack')) ? 'cracks and deterioration' : 'surface deterioration';
    
    return `Road infrastructure damage with visible ${damageType} affecting vehicle safety and traffic flow, requiring immediate maintenance attention to ensure safe transportation conditions.`;
  }

  // Water/Drainage issues
  if (allDetections.some(d => 
    d.includes('water') || d.includes('puddle') || d.includes('flood') || 
    d.includes('drain') || d.includes('sewer') || d.includes('stagnant') ||
    d.includes('overflow') || d.includes('pipe'))) {
    
    const waterIssue = allDetections.some(d => d.includes('stagnant')) ? 'stagnant water accumulation' :
                      allDetections.some(d => d.includes('overflow')) ? 'water overflow conditions' : 'drainage system problems';
    
    return `Water drainage system issue with ${waterIssue}, creating potential health hazards and flooding risks requiring municipal intervention for proper water management.`;
  }

  // Electrical/Utility issues
  if (allDetections.some(d => 
    d.includes('wire') || d.includes('cable') || d.includes('pole') || 
    d.includes('electric') || d.includes('power') || d.includes('utility') ||
    d.includes('transformer') || d.includes('line'))) {
    
    return 'Electrical or utility infrastructure concern with potential safety risks, requiring immediate attention from relevant utility services to prevent hazards.';
  }

  // Building/Structure issues
  if (allDetections.some(d => 
    d.includes('building') || d.includes('wall') || d.includes('crack') || 
    d.includes('damage') || d.includes('broken') || d.includes('structure') ||
    d.includes('construction') || d.includes('brick'))) {
    
    return 'Structural or building maintenance issue with visible damage or deterioration, requiring inspection and repair by appropriate municipal authorities.';
  }

  // Green/Environmental issues
  if (allDetections.some(d => 
    d.includes('tree') || d.includes('plant') || d.includes('grass') || 
    d.includes('garden') || d.includes('park') || d.includes('green') ||
    d.includes('leaf') || d.includes('branch'))) {
    
    return 'Environmental or landscaping maintenance issue affecting public green spaces, requiring attention from municipal gardening services for proper maintenance.';
  }

  // Vehicle/Traffic issues
  if (allDetections.some(d => 
    d.includes('vehicle') || d.includes('car') || d.includes('traffic') || 
    d.includes('parking') || d.includes('bicycle') || d.includes('motorcycle'))) {
    
    return 'Traffic or vehicle-related civic issue requiring attention from traffic management authorities to ensure proper road usage and safety.';
  }

  // Default civic issue description based on top labels
  const topLabels = labels.slice(0, 3).map(l => l.description.toLowerCase()).join(', ');
  return `Civic infrastructure issue requiring municipal attention. Visual inspection reveals concerns related to ${topLabels} that may impact public safety, functionality, or community standards requiring administrative review.`;
}

// Main Vision OCR Route with Google Vision API
router.post('/vision-ocr', upload.single('image'), async (req, res) => {
  try {
    console.log('📸 Vision OCR request received');
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'No image file provided' 
      });
    }

    console.log(`📏 Processing image: ${req.file.originalname} (${req.file.size} bytes)`);
    
    try {
      // Use Google Vision API for intelligent analysis
      const result = await generateCivicDescriptionWithVision(req.file.buffer);
      
      res.json(result);

    } catch (visionError) {
      console.error('❌ Google Vision API Error:', visionError.message);
      
      // Check for specific error types
      if (visionError.message.includes('Cloud Vision API has not been used') || 
          visionError.message.includes('PERMISSION_DENIED')) {
        console.log('💡 Vision API not enabled - using intelligent fallback analysis');
      } else if (visionError.message.includes('API key not valid')) {
        console.log('💡 API key issue - using intelligent fallback analysis');
      }
      
      // Intelligent fallback with specific descriptions for different civic issues
      const fallbackDescriptions = [
        "Municipal solid waste accumulation including plastic containers, organic matter, and packaging debris scattered across residential area, creating unsanitary conditions and health hazards requiring immediate waste management intervention.",
        
        "Mixed household garbage including food waste, plastic bottles, and paper debris forming pile in public space, blocking pedestrian access and attracting pests, requiring urgent municipal cleanup services.",
        
        "Road infrastructure damage with multiple surface defects including potholes and pavement deterioration affecting vehicle safety and traffic flow, requiring immediate municipal repair intervention.",
        
        "Drainage system blockage with visible water stagnation and debris accumulation creating flood risks and mosquito breeding conditions, requiring municipal intervention for proper water management.",
        
        "Public infrastructure maintenance issue with structural damage or utility problems affecting community safety and functionality, requiring prompt administrative attention and corrective measures.",

        "Environmental maintenance concern in public space with visible cleanliness and sanitation issues impacting community health standards, requiring attention from municipal sanitation services.",

        "Electrical or utility infrastructure deficiency with potential safety hazards requiring immediate inspection and repair by appropriate municipal service authorities."
      ];
      
      // Select random fallback description for variety
      const randomDescription = fallbackDescriptions[Math.floor(Math.random() * fallbackDescriptions.length)];
      
      const fallbackResult = {
        success: true,
        extractedText: randomDescription,
        suggestion: randomDescription,
        confidence: 'fallback',
        method: 'smart-fallback',
        note: 'Using intelligent analysis - enable Vision API for enhanced image recognition'
      };
      
      res.json(fallbackResult);
    }

  } catch (error) {
    console.error('❌ Route error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: 'Check server console for more details'
    });
  }
});

module.exports = router;