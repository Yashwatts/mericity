const vision = require('@google-cloud/vision');

async function testVisionSetup() {
  console.log('🔧 Testing Google Vision API setup...');
  
  try {
    // Test API key configuration
    console.log('🔑 API Key exists:', !!process.env.GOOGLE_VISION_API_KEY);
    console.log('🔑 API Key format:', process.env.GOOGLE_VISION_API_KEY ? 'AIza...' + process.env.GOOGLE_VISION_API_KEY.slice(-6) : 'Not found');
    
    // Initialize client
    const client = new vision.ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_VISION_API_KEY,
    });
    
    console.log('✅ Vision client initialized');
    
    // Test with a simple text detection on a small base64 image
    const testImageBase64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';
    
    const [result] = await client.labelDetection({
      image: {
        content: Buffer.from(testImageBase64, 'base64')
      }
    });
    
    console.log('🎯 Test API call successful!');
    console.log('Labels found:', result.labelAnnotations?.length || 0);
    
    if (result.labelAnnotations && result.labelAnnotations.length > 0) {
      console.log('Sample labels:', result.labelAnnotations.slice(0, 3).map(l => l.description));
    }
    
    console.log('✅ Google Vision API is working correctly!');
    
  } catch (error) {
    console.error('❌ Vision API Error:', error.message);
    
    if (error.message.includes('API key not valid')) {
      console.error('💡 Solution: Enable Vision API in Google Cloud Console and ensure API key has Vision API permissions');
    } else if (error.message.includes('Permission denied')) {
      console.error('💡 Solution: Enable Vision API for this project in Google Cloud Console');
    } else if (error.message.includes('quota')) {
      console.error('💡 Solution: Check API quotas and billing in Google Cloud Console');
    } else {
      console.error('💡 Full error details:', error);
    }
  }
}

// Load environment variables
require('dotenv').config();
testVisionSetup();