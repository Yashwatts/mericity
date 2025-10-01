// phoneVerificationService.js (full updated file with enhanced logging and error handling)
const twilio = require('twilio');

// Twilio configuration (Free tier - $15 trial credit)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;

// Initialize Twilio client if credentials are available
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

/**
 * Makes a verification call to the user for complaint confirmation
 * @param {Object} complaintData - Complaint data including user phone
 * @param {string} complaintId - ID of the complaint
 * @param {boolean} isRetry - Whether this is a retry call
 * @returns {Promise<Object>} - Call initiation result
 */
async function initiateVerificationCall(complaintData, complaintId, isRetry = false) {
  try {
    console.log(`[PHONE-VERIFY-DEBUG] Starting verification call process for complaint ${complaintId}`);
    console.log(`[PHONE-VERIFY-DEBUG] Complaint data:`, {
      hasUserPhone: !!complaintData.userPhone,
      phoneNumber: complaintData.userPhone ? complaintData.userPhone.replace(/\d(?=\d{4})/g, '*') : 'No phone',
      hasDescription: !!complaintData.description,
      hasLocation: !!complaintData.location,
      isRetry
    });
    
    if (!client) {
      console.error('[PHONE-VERIFY-DEBUG] ❌ Twilio not configured, using mock verification');
      return await mockVerificationCall(complaintData, complaintId);
    }

    const { userPhone, description, location } = complaintData;
    
    if (!userPhone) {
      console.error('[PHONE-VERIFY-DEBUG] ❌ No phone number provided');
      throw new Error('User phone number not provided');
    }

    // Format phone number for India (+91)
    const formattedPhone = formatIndianPhoneNumber(userPhone);
    
    console.log(`[PHONE-VERIFY-DEBUG] 📞 Initiating ${isRetry ? 'RETRY' : 'initial'} verification call`);
    console.log(`[PHONE-VERIFY-DEBUG] 📞 Original phone: ${userPhone.replace(/\d(?=\d{4})/g, '*')}`);
    console.log(`[PHONE-VERIFY-DEBUG] 📞 Formatted phone: ${formattedPhone.replace(/\d(?=\d{4})/g, '*')}`);
    console.log(`[PHONE-VERIFY-DEBUG] 📞 Complaint ID: ${complaintId}`);

    // Create TwiML for the call
    const webhookBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const twimlUrl = `${webhookBaseUrl}/api/complaints/verify-call/${complaintId}`;

    console.log(`[PHONE-VERIFY-DEBUG] 📞 TwiML URL: ${twimlUrl}`);
    console.log(`[PHONE-VERIFY-DEBUG] 📞 Webhook base URL: ${webhookBaseUrl}`);

    const call = await client.calls.create({
      to: formattedPhone,
      from: twilioPhoneNumber,
      url: twimlUrl,
      method: 'POST',
      statusCallback: `${webhookBaseUrl}/api/complaints/call-status/${complaintId}`,
      statusCallbackMethod: 'POST',
      timeout: 30, // Ring for 30 seconds before giving up
      machineDetection: 'Enable', // Detect if answering machine picks up
    });

    console.log(`[PHONE-VERIFY-DEBUG] ✅ Call creation request sent to Twilio`);
    console.log(`[PHONE-VERIFY-DEBUG] ✅ ${isRetry ? 'Retry' : 'Initial'} call initiated successfully - Call SID: ${call.sid}`);
    console.log(`[PHONE-VERIFY-DEBUG] ✅ Call status: ${call.status}`);
    console.log(`[PHONE-VERIFY-DEBUG] ✅ Call to: ${call.to}`);
    console.log(`[PHONE-VERIFY-DEBUG] ✅ Call from: ${call.from}`);

    return {
      success: true,
      callSid: call.sid,
      status: 'initiated',
      phone: formattedPhone,
      isRetry: isRetry,
      message: `${isRetry ? 'Retry verification' : 'Verification'} call initiated successfully`
    };

  } catch (error) {
    console.error('[PHONE-VERIFY-DEBUG] ❌ Error initiating verification call:', error);
    console.error('[PHONE-VERIFY-DEBUG] ❌ Error details:', error.message);
    console.error('[PHONE-VERIFY-DEBUG] ❌ Error stack:', error.stack);
    
    // Fallback to mock for development/testing
    if (process.env.NODE_ENV === 'development') {
      console.log('[PHONE-VERIFY-DEBUG] 🔄 Falling back to mock verification due to error');
      return await mockVerificationCall(complaintData, complaintId);
    }
    
    throw error;
  }
}

/**
 * Mock verification call for development/testing
 */
async function mockVerificationCall(complaintData, complaintId) {
  console.log(`[PHONE-VERIFY] 🔄 MOCK - Simulating verification call for complaint ${complaintId}`);
  
  const mockResult = {
    success: true,
    callSid: `MOCK_${Date.now()}`,
    status: 'initiated',
    phone: complaintData.userPhone,
    message: 'Mock verification call initiated (development mode)',
    isMock: true
  };

  // Only auto-process in development mode when NODE_ENV is explicitly 'development'
  if (process.env.NODE_ENV === 'development') {
    setTimeout(async () => {
      try {
        console.log(`[PHONE-VERIFY] 🤖 AUTO-MOCK - Simulating user pressing 1 for complaint ${complaintId}`);
        await processVerificationInput(complaintId, '1', mockResult.callSid);
        console.log(`[PHONE-VERIFY] ✅ AUTO-MOCK - Complaint ${complaintId} automatically verified`);
      } catch (error) {
        console.error(`[PHONE-VERIFY] ❌ AUTO-MOCK - Error auto-verifying complaint ${complaintId}:`, error.message);
      }
    }, 3000);
  }

  return mockResult;
}

/**
 * Formats Indian phone number to international format
 * @param {string} phone - Input phone number
 * @returns {string} - Formatted phone number
 */
function formatIndianPhoneNumber(phone) {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats and format with spaces like Twilio verified numbers
  if (cleaned.length === 10) {
    // Format: +91 XXXXX XXXXX (like your verified numbers in Twilio)
    return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    // Format: +91 XXXXX XXXXX
    const number = cleaned.substring(2);
    return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
  } else if (cleaned.length === 13 && cleaned.startsWith('91')) {
    const number = cleaned.substring(2, 12);
    return `+91 ${number.substring(0, 5)} ${number.substring(5)}`;
  }
  
  return phone; // Return as-is if format is unclear
}

/**
 * Generate TwiML response for verification call
 * @param {string} complaintId - Complaint ID
 * @returns {string} - TwiML XML response
 */
function generateVerificationTwiML(complaintId) {
  const base = process.env.TWILIO_WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const webhookBaseUrl = base.replace(/\/$/, ''); // trim trailing slash just in case
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <!-- Initial greeting from Meri City -->
    <Say voice="alice" language="hi-IN">
        नमस्कार! हम मेरी सिटी से आपकी शिकायत की पुष्टि के लिए कॉल कर रहे हैं।
    </Say>
    <Say voice="alice" language="en-US">
        Hello! We are calling from Meri City to verify your complaint.
    </Say>
    
    <Pause length="2"/>
    
    <!-- Language selection with gather -->
    <Gather input="dtmf" timeout="10" numDigits="1" action="${webhookBaseUrl}/api/complaints/language-selection/${complaintId}" method="POST">
        <Say voice="alice" language="en-US">
            Press 1 for English continuation.
        </Say>
        <Pause length="1"/>
        <Say voice="alice" language="hi-IN">
            हिंदी के लिए 2 दबाएं।
        </Say>
        <Pause length="5"/>
        <Say voice="alice" language="en-US">
            I repeat - Press 1 for English continuation.
        </Say>
        <Pause length="1"/>
        <Say voice="alice" language="hi-IN">
            मैं दोहराता हूं - हिंदी के लिए 2 दबाएं।
        </Say>
    </Gather>
    
    <!-- Default to English if no input -->
    <Say voice="alice" language="en-US">
        No language selected. Continuing in English.
    </Say>
    <Redirect method="POST">${webhookBaseUrl}/api/complaints/verify-complaint/${complaintId}?lang=en</Redirect>
</Response>`;
}

/**
 * Generate TwiML for language-specific verification
 * @param {string} complaintId - Complaint ID
 * @param {string} language - Selected language ('en' or 'hi')
 * @returns {string} - TwiML XML response
 */
function generateLanguageSpecificVerificationTwiML(complaintId, language) {
  const webhookBaseUrl = process.env.TWILIO_WEBHOOK_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  
  if (language === 'hi') {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="dtmf" timeout="15" numDigits="1" action="${webhookBaseUrl}/api/complaints/process-verification/${complaintId}" method="POST">
        <Say voice="alice" language="hi-IN">
            आपकी शिकायत की पुष्टि के लिए 1 दबाएं।
        </Say>
        <Pause length="2"/>
        <Say voice="alice" language="hi-IN">
            शिकायत रद्द करने के लिए 2 दबाएं।
        </Say>
        <Pause length="5"/>
        <Say voice="alice" language="hi-IN">
            मैं दोहराता हूं - पुष्टि के लिए 1 दबाएं, रद्द करने के लिए 2 दबाएं।
        </Say>
        <Pause length="3"/>
    </Gather>
    
    <Say voice="alice" language="hi-IN">
        कोई जवाब नहीं मिला। आपकी शिकायत की पुष्टि समय समाप्त हो गई।
    </Say>
    <Redirect method="POST">${webhookBaseUrl}/api/complaints/verification-timeout/${complaintId}</Redirect>
</Response>`;
  } else {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="dtmf" timeout="15" numDigits="1" action="${webhookBaseUrl}/api/complaints/process-verification/${complaintId}" method="POST">
        <Say voice="alice" language="en-US">
            Press 1 to confirm your complaint.
        </Say>
        <Pause length="2"/>
        <Say voice="alice" language="en-US">
            Press 2 to reject your complaint.
        </Say>
        <Pause length="5"/>
        <Say voice="alice" language="en-US">
            I repeat - Press 1 to confirm, Press 2 to reject.
        </Say>
        <Pause length="3"/>
    </Gather>
    
    <Say voice="alice" language="en-US">
        No response received. Your complaint verification has timed out.
    </Say>
    <Redirect method="POST">${webhookBaseUrl}/api/complaints/verification-timeout/${complaintId}</Redirect>
</Response>`;
  }
}

/**
 * Schedule retry call after 10 minutes
 * @param {string} complaintId - Complaint ID
 * @param {string} userPhone - User's phone number
 */
async function scheduleRetryCall(complaintId, userPhone) {
  const Complaint = require('../models/Complaint');
  
  try {
    console.log(`[PHONE-VERIFY] Scheduling retry call for complaint ${complaintId} in 10 minutes`);
    
    // Update complaint with retry info
    await Complaint.findByIdAndUpdate(complaintId, {
      phoneVerificationRetryScheduled: true,
      phoneVerificationRetryAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
    });
    
    // Schedule the retry call
    setTimeout(async () => {
      try {
        console.log(`[PHONE-VERIFY] Executing retry call for complaint ${complaintId}`);
        
        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
          console.log(`[PHONE-VERIFY] Complaint ${complaintId} not found for retry`);
          return;
        }
        
        // Check if complaint is still in verification state
        if (complaint.status !== 'pending_verification' && complaint.phoneVerificationStatus !== 'no_answer') {
          console.log(`[PHONE-VERIFY] Complaint ${complaintId} already processed, skipping retry`);
          return;
        }
        
        // Make retry call
        const retryResult = await initiateVerificationCall({
          userPhone: userPhone,
          description: complaint.description,
          location: complaint.location
        }, complaintId, true); // true indicates this is a retry
        
        if (retryResult.success) {
          await Complaint.findByIdAndUpdate(complaintId, {
            phoneVerificationCallSid: retryResult.callSid,
            phoneVerificationRetryExecuted: true,
            phoneVerificationRetriedAt: new Date()
          });
          console.log(`[PHONE-VERIFY] Retry call initiated successfully for ${complaintId}`);
        } else {
          // If retry also fails, mark complaint as verification failed
          await Complaint.findByIdAndUpdate(complaintId, {
            status: 'rejected',
            phoneVerificationStatus: 'failed',
            phoneVerificationAt: new Date(),
            rejectionReason: 'Phone verification failed - user did not respond to calls'
          });
          console.log(`[PHONE-VERIFY] Retry call failed for ${complaintId}, marking as rejected`);
        }
        
      } catch (retryError) {
        console.error(`[PHONE-VERIFY] Error in retry call for ${complaintId}:`, retryError);
        
        // Mark as rejected on retry error
        await Complaint.findByIdAndUpdate(complaintId, {
          status: 'rejected',
          phoneVerificationStatus: 'error',
          phoneVerificationAt: new Date(),
          rejectionReason: 'Phone verification system error during retry'
        });
      }
    }, 10 * 60 * 1000); // 10 minutes
    
  } catch (error) {
    console.error('[PHONE-VERIFY] Error scheduling retry call:', error);
  }
}

/**
 * Process user's DTMF input from verification call
 * @param {string} complaintId - Complaint ID
 * @param {string} digits - User's DTMF input
 * @returns {Object} - Processing result
 */
async function processVerificationInput(complaintId, digits) {
  const Complaint = require('../models/Complaint');
  
  try {
    console.log(`[PHONE-VERIFY] Processing verification input: ${digits} for complaint ${complaintId}`);
    
    // Validate complaintId format (MongoDB ObjectId is 24 hex chars)
    if (!complaintId || complaintId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(complaintId)) {
      console.error(`[PHONE-VERIFY] Invalid complaint ID format: ${complaintId}`);
      throw new Error('Invalid complaint ID format');
    }
    
    // Simplified query without complex populate
    const complaint = await Complaint.findById(complaintId);
    
    if (!complaint) {
      console.error(`[PHONE-VERIFY] Complaint ${complaintId} not found`);
      throw new Error('Complaint not found');
    }

    console.log(`[PHONE-VERIFY] Found complaint ${complaintId}, current status: ${complaint.status}`);

    let newStatus, responseMessage, shouldRouteToDepartment = false;
    
    switch (digits) {
      case '1':
        // User confirmed - update status to phone_verified
        console.log(`[PHONE-VERIFY] ✅ User CONFIRMED complaint ${complaintId}`);
        
        newStatus = 'phone_verified';
        responseMessage = 'Thank you for confirming! Your complaint has been verified and will be assigned to the appropriate department shortly.';
        
        const updateResult = await Complaint.findByIdAndUpdate(complaintId, {
          status: 'phone_verified',
          phoneVerificationStatus: 'phone_verified',
          phoneVerificationAt: new Date(),
          phoneVerificationInput: digits,
          updatedAt: new Date()
        }, { new: true });
        
        if (!updateResult) {
          console.error(`[PHONE-VERIFY] Failed to update complaint ${complaintId} status`);
          throw new Error('Failed to update complaint status');
        }
        
        console.log(`[PHONE-VERIFY] ✅ Complaint ${complaintId} verified successfully, status updated to: ${updateResult.status}`);
        
        // Try to route to department after verification - enhanced routing logic
        try {
          console.log(`[PHONE-VERIFY] Attempting to route complaint ${complaintId} to department...`);
          console.log(`[PHONE-VERIFY] Complaint data for routing:`, {
            hasDetectedDepartmentInfo: !!complaint.detectedDepartmentInfo,
            detectedDepartmentInfo: complaint.detectedDepartmentInfo,
            description: complaint.description.substring(0, 50) + '...',
            location: complaint.location.city
          });
          
          // Always try routing - either use pre-detected info or run fresh detection
          if (complaint.detectedDepartmentInfo && complaint.detectedDepartmentInfo.assignedDepartment) {
            // Use pre-detected department
            console.log(`[PHONE-VERIFY] Using pre-detected department for complaint ${complaintId}`);
            await routeToPreDetectedDepartment(updateResult, complaint.detectedDepartmentInfo);
            shouldRouteToDepartment = true;
            responseMessage = 'Thank you for confirming! Your complaint has been forwarded to the appropriate department.';
          } else {
            // Run fresh department detection and routing (most common case)
            console.log(`[PHONE-VERIFY] Running fresh department detection for complaint ${complaintId}`);
            
            const complaintData = {
              description: complaint.description,
              category: complaint.category || '',
              location: complaint.location
            };
            
            const departmentDetectionService = require('./departmentDetectionService');
            const routingResult = await departmentDetectionService.routeComplaintToDepartment(complaintData);
            
            if (routingResult.success) {
              if (routingResult.assignedDepartment) {
                // Department found and assigned - route to department
                const finalUpdate = await Complaint.findByIdAndUpdate(complaintId, {
                  status: 'in_progress',
                  assignedDepartment: routingResult.assignedDepartment._id,
                  assignedAt: new Date(),
                  autoRoutingData: {
                    detectedDepartment: routingResult.detectedDepartment,
                    confidence: routingResult.confidence,
                    reasoning: routingResult.reasoning,
                    method: routingResult.analysis_method || 'phone-verification-routing',
                    is_fallback: routingResult.is_fallback
                  },
                  // Also store the detection info for future reference
                  detectedDepartmentInfo: {
                    detectedDepartment: routingResult.detectedDepartment,
                    assignedDepartment: routingResult.assignedDepartment,
                    confidence: routingResult.confidence,
                    reasoning: routingResult.reasoning,
                    analysisMethod: routingResult.analysis_method,
                    isFallback: routingResult.is_fallback || false,
                  }
                }, { new: true });
                
                if (finalUpdate) {
                  shouldRouteToDepartment = true;
                  responseMessage = `Thank you for confirming! Your complaint has been forwarded to ${routingResult.assignedDepartment.name}.`;
                  console.log(`[PHONE-VERIFY] ✅ Fresh routing successful - assigned to ${routingResult.assignedDepartment.name}`);
                  
                  // Award points to user for complaint approval
                  try {
                    const User = require("../models/User");
                    const user = await User.findById(finalUpdate.userId);
                    if (user) {
                      user.points = (user.points || 0) + 5;
                      if (!user.pointsHistory) {
                        user.pointsHistory = [];
                      }
                      user.pointsHistory.push({
                        points: 5,
                        reason: "Complaint approved via phone verification",
                        complaintId: finalUpdate._id,
                        awardedAt: new Date(),
                      });
                      await user.save();
                      console.log(`[PHONE-VERIFY] ✅ Awarded 5 points to user for complaint approval`);
                    }
                  } catch (pointsError) {
                    console.error("Failed to award points:", pointsError);
                  }
                  
                } else {
                  throw new Error('Failed to update complaint with department assignment');
                }
              } else {
                // No department assigned but routing was successful (manual assignment needed)
                console.log(`[PHONE-VERIFY] ✅ Routing successful but no department assigned - requires manual assignment`);
                
                // Update with detection info but keep as phone_verified for manual assignment
                await Complaint.findByIdAndUpdate(complaintId, {
                  // Keep status as phone_verified for manual assignment
                  autoRoutingData: {
                    detectedDepartment: routingResult.detectedDepartment,
                    confidence: routingResult.confidence,
                    reasoning: routingResult.reasoning,
                    method: routingResult.analysis_method || 'phone-verification-routing',
                    requires_manual_assignment: true
                  },
                  detectedDepartmentInfo: {
                    detectedDepartment: routingResult.detectedDepartment,
                    confidence: routingResult.confidence,
                    reasoning: routingResult.reasoning,
                    analysisMethod: routingResult.analysis_method,
                    requiresManualAssignment: true
                  }
                });
                
                responseMessage = 'Thank you for confirming! Your complaint has been verified and will be assigned to the appropriate department shortly.';
              }
            } else {
              console.warn(`[PHONE-VERIFY] Fresh routing failed for complaint ${complaintId}:`, routingResult.error || 'No suitable department found');
              // Keep complaint as phone_verified for manual assignment - don't let routing failure break verification
              responseMessage = 'Thank you for confirming! Your complaint has been verified and will be assigned to the appropriate department shortly.';
            }
          }
          
          console.log(`[PHONE-VERIFY] ✅ Department routing process completed for complaint ${complaintId}`);
        } catch (routingError) {
          console.warn(`[PHONE-VERIFY] Failed to auto-route complaint ${complaintId}:`, routingError.message);
          console.warn(`[PHONE-VERIFY] Stack trace:`, routingError.stack);
          console.warn(`[PHONE-VERIFY] Continuing with verification - complaint will remain phone_verified for manual assignment`);
          
          // Even if routing completely fails, ensure the phone verification succeeds
          responseMessage = 'Thank you for confirming! Your complaint has been verified and will be assigned to the appropriate department shortly.';
          
          // Do not re-throw - verification should succeed even if routing fails completely
          // This prevents phone calls from hanging up due to routing errors
        }
        break;
        
      case '2':
        // User rejected - move to closed complaints
        newStatus = 'rejected';
        responseMessage = 'Your complaint has been rejected as per your request. It has been moved to closed complaints.';
        console.log(`[PHONE-VERIFY] ❌ User REJECTED complaint ${complaintId}`);
        
        await Complaint.findByIdAndUpdate(complaintId, {
          status: 'rejected',
          phoneVerificationStatus: 'rejected_by_user',
          phoneVerificationAt: new Date(),
          phoneVerificationInput: digits,
          rejectedAt: new Date(),
          rejectionReason: 'User rejected during phone verification',
          updatedAt: new Date()
        });
        
        console.log(`[PHONE-VERIFY] ❌ Complaint ${complaintId} rejected successfully`);
        break;
        
      default:
        // Invalid input - keep in verification pending
        newStatus = 'verification_failed';
        responseMessage = 'Invalid input received. Please contact support for assistance.';
        console.log(`[PHONE-VERIFY] ⚠️ Invalid input ${digits} for complaint ${complaintId}`);
        
        await Complaint.findByIdAndUpdate(complaintId, {
          status: 'verification_failed',
          phoneVerificationStatus: 'verification_failed',
          phoneVerificationAt: new Date(),
          phoneVerificationInput: digits,
          updatedAt: new Date()
        });
        break;
    }

    console.log(`[PHONE-VERIFY] Successfully processed verification for complaint ${complaintId} with status: ${newStatus}`);

    return {
      success: true,
      status: newStatus,
      message: responseMessage,
      routedToDepartment: shouldRouteToDepartment
    };

  } catch (error) {
    console.error(`[PHONE-VERIFY] Error processing verification input for complaint ${complaintId}:`, {
      message: error.message,
      stack: error.stack,
      digits,
      complaintId
    });
    throw error;
  }
}

/**
 * Route complaint to pre-detected department
 * @param {Object} complaint - Updated complaint object
 * @param {Object} detectedDepartmentInfo - Pre-detected department info
 */
async function routeToPreDetectedDepartment(complaint, detectedDepartmentInfo) {
  const Complaint = require('../models/Complaint');
  
  try {
    console.log(`[PHONE-VERIFY] 🔄 Routing complaint ${complaint._id} to pre-detected department`);
    
    const assignedDepartment = detectedDepartmentInfo.assignedDepartment;
    
    if (!assignedDepartment || !assignedDepartment._id) {
      throw new Error('Invalid pre-detected department - missing department ID');
    }
    
    // Update complaint with department assignment
    const updateResult = await Complaint.findByIdAndUpdate(complaint._id, {
      status: 'in_progress',
      assignedDepartment: assignedDepartment._id,
      assignedAt: new Date(),
      autoRoutingData: {
        detectedDepartment: detectedDepartmentInfo.detectedDepartment,
        confidence: detectedDepartmentInfo.confidence,
        reasoning: detectedDepartmentInfo.reasoning,
        method: detectedDepartmentInfo.analysisMethod || 'pre-detected'
      }
    }, { new: true });

    if (!updateResult) {
      throw new Error('Failed to update complaint with pre-detected department assignment');
    }

    console.log(`[PHONE-VERIFY] ✅ Complaint ${complaint._id} routed to pre-detected ${assignedDepartment.name || assignedDepartment._id}`);
    
    // Award points to user for complaint approval
    try {
      const User = require("../models/User");
      const user = await User.findById(updateResult.userId);
      if (user) {
        user.points = (user.points || 0) + 5;
        if (!user.pointsHistory) {
          user.pointsHistory = [];
        }
        user.pointsHistory.push({
          points: 5,
          reason: "Complaint approved via pre-detected department routing",
          complaintId: updateResult._id,
          awardedAt: new Date(),
        });
        await user.save();
        console.log(`[PHONE-VERIFY] ✅ Awarded 5 points to user for pre-detected complaint approval`);
      }
    } catch (pointsError) {
      console.error("Failed to award points:", pointsError);
    }
    
    // Send notification to department (implement as needed)
    try {
      await notifyDepartment(assignedDepartment, complaint);
    } catch (notifyError) {
      console.warn('[PHONE-VERIFY] Failed to notify pre-detected department:', notifyError.message);
    }
    
  } catch (error) {
    console.error('[PHONE-VERIFY] Error routing to pre-detected department:', error);
    throw error;
  }
}

/**
 * Route verified complaint to appropriate department
 * @param {Object} complaint - Complaint object
 */
async function routeVerifiedComplaintToDepartment(complaint) {
  let departmentDetectionService;
  try {
    departmentDetectionService = require('./departmentDetectionService');
  } catch (requireError) {
    console.error('[PHONE-VERIFY] Failed to load departmentDetectionService:', requireError.message);
    throw new Error('Department detection service unavailable');
  }
  
  const Complaint = require('../models/Complaint');
  
  try {
    console.log(`[PHONE-VERIFY] 🔄 Routing verified complaint ${complaint._id} to department`);
    
    const complaintData = {
      description: complaint.description,
      category: complaint.category,
      location: complaint.location
    };

    // Check if the service has the required method
    if (!departmentDetectionService || typeof departmentDetectionService.routeComplaintToDepartment !== 'function') {
      throw new Error('Department detection service not properly initialized');
    }

    // Use existing department detection service
    const routing = await departmentDetectionService.routeComplaintToDepartment(complaintData);
    
    if (routing && routing.success && routing.assignedDepartment && routing.assignedDepartment._id) {
      // Update complaint with department assignment
      const updateResult = await Complaint.findByIdAndUpdate(complaint._id, {
        status: 'in_progress',
        assignedDepartment: routing.assignedDepartment._id,
        assignedAt: new Date(),
        autoRoutingData: {
          detectedDepartment: routing.detectedDepartment,
          confidence: routing.confidence,
          reasoning: routing.reasoning,
          method: routing.analysis_method
        }
      }, { new: true });

      if (!updateResult) {
        throw new Error('Failed to update complaint with department assignment');
      }

      console.log(`[PHONE-VERIFY] ✅ Complaint ${complaint._id} routed to ${routing.assignedDepartment.name}`);
      
      // Award points to user for complaint approval
      try {
        const User = require("../models/User");
        const user = await User.findById(updateResult.userId);
        if (user) {
          user.points = (user.points || 0) + 5;
          if (!user.pointsHistory) {
            user.pointsHistory = [];
          }
          user.pointsHistory.push({
            points: 5,
            reason: "Complaint approved via department routing",
            complaintId: updateResult._id,
            awardedAt: new Date(),
          });
          await user.save();
          console.log(`[PHONE-VERIFY] ✅ Awarded 5 points to user for complaint approval via department routing`);
        }
      } catch (pointsError) {
        console.error("Failed to award points:", pointsError);
      }
      
      // Send notification to department (implement as needed)
      try {
        await notifyDepartment(routing.assignedDepartment, complaint);
      } catch (notifyError) {
        console.warn('[PHONE-VERIFY] Failed to notify department:', notifyError.message);
      }
      
    } else {
      console.log(`[PHONE-VERIFY] ⚠️ Failed to route complaint ${complaint._id} to department - invalid routing result`);
      throw new Error(routing?.error || 'No suitable department found or routing unsuccessful');
    }
    
  } catch (error) {
    console.error('[PHONE-VERIFY] Error routing verified complaint:', error);
    throw error;
  }
}

/**
 * Send notification to department about new complaint
 * @param {Object} department - Department object
 * @param {Object} complaint - Complaint object
 */
async function notifyDepartment(department, complaint) {
  try {
    // Here you can implement various notification methods:
    // 1. Email notification
    // 2. SMS to department
    // 3. Push notification to department dashboard
    // 4. Webhook to department system
    
    console.log(`[PHONE-VERIFY] 📧 Sending notification to ${department.name} for complaint ${complaint._id}`);
    
    // Placeholder for notification implementation
    // await emailService.sendDepartmentNotification(department, complaint);
    // await smsService.sendDepartmentSMS(department, complaint);
    
  } catch (error) {
    console.error('[PHONE-VERIFY] Error sending department notification:', error);
    throw error;
  }
}

/**
 * Handle call status updates from Twilio
 * @param {Object} statusData - Call status data from Twilio
 */
async function handleCallStatus(complaintId, statusData) {
  const Complaint = require('../models/Complaint');
  
  try {
    console.log(`[PHONE-VERIFY] Call status update for complaint ${complaintId}:`, statusData);
    
    await Complaint.findByIdAndUpdate(complaintId, {
      $push: {
        callStatusUpdates: {
          status: statusData.CallStatus,
          timestamp: new Date(),
          duration: statusData.CallDuration,
          data: statusData
        }
      }
    });
    
  } catch (error) {
    console.error('[PHONE-VERIFY] Error updating call status:', error);
  }
}

module.exports = {
  initiateVerificationCall,
  generateVerificationTwiML,
  generateLanguageSpecificVerificationTwiML,
  processVerificationInput,
  handleCallStatus,
  scheduleRetryCall,
  formatIndianPhoneNumber,
  routeToPreDetectedDepartment
};