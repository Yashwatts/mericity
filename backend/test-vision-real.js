const { ImageAnnotatorClient } = require('@google-cloud/vision');
require('dotenv').config();

console.log('🔧 Testing Google Vision API with real scenario...');

// Test basic API functionality
async function testRealVision() {
  try {
    const client = new ImageAnnotatorClient({
      apiKey: process.env.GOOGLE_VISION_API_KEY,
    });

    console.log('✅ Vision client initialized');
    console.log('🔑 API Key configured:', process.env.GOOGLE_VISION_API_KEY ? 'YES' : 'NO');

    // Test with a simple image URL (publicly accessible)
    const testImageUrl = 'https://picsum.photos/400/300';
    
    console.log('📡 Testing API call...');
    
    const [result] = await client.labelDetection({
      image: { source: { imageUri: testImageUrl } }
    });

    const labels = result.labelAnnotations;
    
    if (labels && labels.length > 0) {
      console.log('✅ Google Vision API is WORKING!');
      console.log('🏷️  Detected labels:');
      labels.forEach(label => {
        console.log(`   - ${label.description} (${(label.score * 100).toFixed(1)}%)`);
      });
    } else {
      console.log('⚠️  API responding but no labels detected');
    }

    return true;

  } catch (error) {
    console.error('❌ Vision API Test Failed:', error.message);
    
    if (error.message.includes('Cloud Vision API has not been used')) {
      console.log('💡 Solution: Enable Cloud Vision API in Google Cloud Console');
    } else if (error.message.includes('API key not valid')) {
      console.log('💡 Solution: Check your GOOGLE_VISION_API_KEY in .env file');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('💡 Solution: Ensure API key has Vision API permissions');
    }
    
    return false;
  }
}

// Run the test
testRealVision().then(success => {
  if (success) {
    console.log('\n🎉 Google Vision API is ready for garbage detection!');
    console.log('📱 You can now test the AI prediction in your app');
  } else {
    console.log('\n⚠️  Vision API needs configuration');
    console.log('📱 App will use smart fallback descriptions for now');
  }
});