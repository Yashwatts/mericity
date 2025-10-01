require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiAPI() {
  try {
    console.log('🧪 Testing Gemini API connection...');
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try different model names
    const modelNames = [
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro",
      "gemini-pro",
      "gemini-1.5-flash",
      "gemini-pro-vision"
    ];
    
    for (const modelName of modelNames) {
      try {
        console.log(`🔄 Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Simple text test
        const result = await model.generateContent("Test message");
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ SUCCESS with model: ${modelName}`);
        console.log('🎯 Sample Response:', text.substring(0, 100) + '...');
        return; // Exit on first successful model
        
      } catch (modelError) {
        console.log(`❌ Failed with ${modelName}:`, modelError.message.substring(0, 100));
      }
    }
    
    console.log('❌ All models failed');
    
  } catch (error) {
    console.error('❌ Gemini API Test Failed:', error.message);
  }
}

testGeminiAPI();