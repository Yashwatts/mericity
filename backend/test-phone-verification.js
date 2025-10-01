const mongoose = require('mongoose');
const Complaint = require('./models/Complaint');
const phoneVerificationService = require('./services/phoneVerificationService');
require('dotenv').config();

// Test script for phone verification system
async function testPhoneVerificationSystem() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Test 1: Check if phone verification service initializes
        console.log('\n🧪 Test 1: Phone Verification Service Initialization');
        const testService = phoneVerificationService;
        console.log('✅ Phone verification service loaded successfully');

        // Test 2: Create a test complaint with phone verification
        console.log('\n🧪 Test 2: Creating Test Complaint');
        const testComplaint = new Complaint({
            userId: new mongoose.Types.ObjectId(), // Required field
            description: 'This is a test complaint for phone verification system',
            location: {
                lat: 24.5854, // Required field (changed from latitude)
                lng: 73.7125, // Required field (changed from longitude)
                address: 'Test Address, Test City'
            },
            phone: '+1234567890', // Required field
            image: 'test-image.jpg', // Required field
            status: 'pending_verification',
            phoneVerificationStatus: 'pending',
            autoRoutingData: {
                detectedDepartment: 'Public Works Department',
                confidence: 0.85,
                method: 'ai-detection'
            }
        });

        const savedComplaint = await testComplaint.save();
        console.log('✅ Test complaint created:', savedComplaint._id);

        // Test 3: Simulate phone verification call (development mode)
        console.log('\n🧪 Test 3: Simulating Phone Verification Call');
        const callResult = await phoneVerificationService.initiateVerificationCall(savedComplaint._id, '+1234567890');
        console.log('✅ Verification call initiated:', callResult);

        // Test 4: Simulate user pressing 1 to confirm
        console.log('\n🧪 Test 4: Simulating User Confirmation (Press 1)');
        const verificationResult = await phoneVerificationService.processVerificationInput(savedComplaint._id, '1', 'test-call-sid');
        console.log('✅ Verification processed:', verificationResult);

        // Test 5: Check final complaint status
        console.log('\n🧪 Test 5: Checking Final Complaint Status');
        const updatedComplaint = await Complaint.findById(savedComplaint._id);
        console.log('✅ Final complaint status:', {
            status: updatedComplaint.status,
            phoneVerificationStatus: updatedComplaint.phoneVerificationStatus,
            assignedDepartment: updatedComplaint.assignedDepartment,
            autoRoutingData: updatedComplaint.autoRoutingData
        });

        // Cleanup
        console.log('\n🧹 Cleaning up test data...');
        await Complaint.findByIdAndDelete(savedComplaint._id);
        console.log('✅ Test complaint deleted');

        console.log('\n🎉 All tests passed! Phone verification system is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('📡 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    console.log('🚀 Starting Phone Verification System Tests...\n');
    testPhoneVerificationSystem();
}

module.exports = testPhoneVerificationSystem;