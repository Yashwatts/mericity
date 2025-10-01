const nodemailer = require('nodemailer');
require('dotenv').config();

// Email service for sending reward coupons - updated

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendCouponEmail(userEmail, userName, couponDetails, rewardTitle) {
    try {
      const { couponCode, expiryDate } = couponDetails;
      
      // Format expiry date
      const formattedExpiryDate = new Date(expiryDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const mailOptions = {
        from: `"Civic Sense - Reward System" <${process.env.GMAIL_USER}>`,
        to: userEmail,
        subject: '🎉 Your Reward Coupon is Ready!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Congratulations ${userName}!</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Your reward has been successfully redeemed</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0; font-size: 24px;">Reward Details</h2>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff;">
                <h3 style="color: #007bff; margin: 0 0 10px 0;">${rewardTitle}</h3>
                <p style="color: #666; margin: 0;">Thank you for being an active member of our civic community!</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #ff7b7b 0%, #ff8e53 100%); padding: 25px; border-radius: 10px; text-align: center; margin: 25px 0;">
                <h3 style="color: white; margin: 0 0 15px 0; font-size: 18px;">Your Coupon Code</h3>
                <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; border: 2px dashed white;">
                  <span style="font-size: 24px; font-weight: bold; color: white; letter-spacing: 3px;">${couponCode}</span>
                </div>
                <p style="color: white; margin: 15px 0 0 0; font-size: 14px;">Click or copy this code to use your reward</p>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin: 20px 0;">
                <div style="flex: 1; padding: 15px; background: #e8f4f8; border-radius: 8px; margin-right: 10px;">
                  <strong style="color: #333;">Valid Until:</strong><br>
                  <span style="color: #007bff; font-weight: bold;">${formattedExpiryDate}</span>
                </div>
                <div style="flex: 1; padding: 15px; background: #f0f8e8; border-radius: 8px; margin-left: 10px;">
                  <strong style="color: #333;">Status:</strong><br>
                  <span style="color: #28a745; font-weight: bold;">✅ Active</span>
                </div>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="color: #856404; margin: 0 0 10px 0;">📋 How to Use Your Coupon</h4>
                <ul style="color: #856404; margin: 0; padding-left: 20px;">
                  <li>Present this coupon code when redeeming your reward</li>
                  <li>Coupon is valid until the expiry date mentioned above</li>
                  <li>Each coupon can be used only once</li>
                  <li>Contact support if you face any issues</li>
                </ul>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://mericity.app/rewards" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View My Rewards</a>
              </div>
              
              <hr style="border: none; height: 1px; background: #eee; margin: 30px 0;">
              
              <div style="text-align: center; color: #666; font-size: 14px;">
                <p style="margin: 5px 0;">Thank you for making your city better! 🏛️</p>
                <p style="margin: 5px 0;">This is an automated email from Civic Sense Reward System</p>
                <p style="margin: 5px 0;">Need help? Contact us at <a href="mailto:${process.env.GMAIL_USER}" style="color: #007bff;">${process.env.GMAIL_USER}</a></p>
              </div>
            </div>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
      
    } catch (error) {
      console.error('❌ Error sending email:', error);
      return { success: false, error: error.message };
    }
  }

  // Test email configuration
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service is ready to send emails');
      return true;
    } catch (error) {
      console.error('❌ Email service configuration error:', error);
      return false;
    }
  }
}

module.exports = new EmailService();