const fetch = require('node-fetch');

class SMSService {
  constructor() {
    // Twilio configuration
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    this.sender = process.env.SMS_SENDER_NAME || 'CivicSense';
  }

  async sendSMS(phoneNumber, message) {
    try {
      // For development, we'll just log the SMS
      if (process.env.NODE_ENV !== 'production') {
        console.log('📱 SMS NOTIFICATION (DEV MODE):', {
          to: phoneNumber,
          from: this.twilioPhoneNumber || '+1234567890',
          message: message,
          timestamp: new Date().toISOString(),
          provider: 'Twilio (Simulated)'
        });
        return { success: true, messageId: 'dev-twilio-' + Date.now() };
      }

      // Production SMS sending using Twilio
      if (!this.twilioAccountSid || !this.twilioAuthToken || !this.twilioPhoneNumber) {
        throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in your environment variables.');
      }

      // Twilio API endpoint
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;

      // Basic Auth for Twilio (Account SID:Auth Token)
      const authHeader = 'Basic ' + Buffer.from(`${this.twilioAccountSid}:${this.twilioAuthToken}`).toString('base64');

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: this.twilioPhoneNumber,
          To: phoneNumber,
          Body: message,
        }).toString(),
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ SMS sent successfully via Twilio:', {
          sid: result.sid,
          to: result.to,
          status: result.status,
          price: result.price,
          priceUnit: result.price_unit
        });
        
        return { 
          success: true, 
          messageId: result.sid,
          status: result.status,
          price: result.price,
          priceUnit: result.price_unit
        };
      } else {
        throw new Error(result.message || 'Twilio SMS sending failed');
      }
    } catch (error) {
      console.error('❌ SMS Service Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Template messages for different complaint statuses (optimized for SMS length)
  getStatusMessage(status, complaintDescription) {
    const shortDescription = complaintDescription?.length > 40 
      ? complaintDescription.substring(0, 40) + '...' 
      : complaintDescription;

    switch (status) {
      case 'in_progress':
        return `Good news! Your complaint "${shortDescription}" is now being worked on. We'll update you soon. - CivicSense`;
      
      case 'resolved':
        return `Great! Your complaint "${shortDescription}" has been resolved. Thanks for helping our community! - CivicSense`;
      
      case 'rejected':
        return `Your complaint "${shortDescription}" has been reviewed and rejected. Please check the app for rejection details. - CivicSense`;
      
      default:
        return `Your complaint "${shortDescription}" status updated to: ${status}. Check app for details. - CivicSense`;
    }
  }

  // Format phone number for Twilio (international format)
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it's a 10-digit Indian number, add country code
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }
    
    // If it already has country code without +, add +
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return '+' + cleaned;
    }
    
    // If it already has + and country code, return as is
    if (cleaned.length === 12 && phoneNumber.startsWith('+91')) {
      return phoneNumber;
    }
    
    // For other countries or if unsure, add + if missing
    return phoneNumber.startsWith('+') ? phoneNumber : '+' + cleaned;
  }
}

module.exports = new SMSService();