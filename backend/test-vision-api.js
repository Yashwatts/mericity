const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function testVisionAPI() {
  try {
    console.log('🧪 Testing Vision API endpoint...');
    
    // Check if test image exists
    if (!fs.existsSync('test-image.jpg')) {
      console.log('❌ test-image.jpg not found, testing will use fallback');
      // Test without image to see fallback
      try {
        const response = await axios.post('http://localhost:5000/api/vision-ocr', {});
        console.log('Response:', response.data);
      } catch (error) {
        console.log('Expected error for no image:', error.response?.data || error.message);
      }
      return;
    }
    
    // Create form data with image
    const form = new FormData();
    form.append('image', fs.createReadStream('test-image.jpg'));
    
    console.log('📸 Sending test image to Vision API...');
    
    const response = await axios.post('http://localhost:5000/api/vision-ocr', form, {
      headers: {
        ...form.getHeaders()
      },
      timeout: 30000 // 30 second timeout
    });
    
    console.log('✅ Vision API Response:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\n🎉 SUCCESS! Vision API is working!');
      console.log('📝 Generated Description:', response.data.suggestion);
      console.log('🔍 Method Used:', response.data.method);
      if (response.data.labels) {
        console.log('🏷️  Detected Labels:', response.data.labels.map(l => l.description).join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ Test Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

testVisionAPI();