# 📱 Mobile SMS Notifications - How It Works

## Overview
The mobile text notification system sends SMS messages to users when their complaint status changes. It works in two modes:
- **Development Mode**: Logs SMS to console (for testing)
- **Production Mode**: Actually sends SMS via TextLocal API (or any SMS provider)

## 🔄 Complete Flow

### 1. **User Submits Complaint**
```javascript
// User provides phone number during complaint submission
{
  description: "Street light not working",
  phone: "9876543210",  // ← This phone number is stored
  location: {...},
  images: [...]
}
```

### 2. **Admin Changes Status**
```javascript
// Admin updates complaint status via admin dashboard
PUT /admin/complaints/:id
{
  status: "in_progress"  // or "resolved"
}
```

### 3. **System Triggers Notifications**
When status changes to `in_progress` or `resolved`, the system:

#### a) Creates In-App Notification
```javascript
await notificationService.createNotification(
  complaint.userId,
  complaint._id,
  'status_update',
  '🚧 Complaint In Progress',
  'Great news! Your complaint "Street light not working..." is now being worked on by our team.',
  {
    oldStatus: 'submitted',
    newStatus: 'in_progress',
    adminName: 'Admin John'
  }
);
```

#### b) Sends SMS Notification
```javascript
// Format phone number (adds country code if needed)
const formattedPhone = '919876543210'; // 91 + 9876543210

// Generate SMS message
const smsMessage = "🚧 Good news! Your complaint \"Street light not working...\" is now being worked on. We'll keep you updated on the progress. Thank you for reporting! - CivicSense";

// Send SMS
await smsService.sendSMS(formattedPhone, smsMessage);
```

## 📱 SMS Message Templates

### Status: In Progress
```
🚧 Good news! Your complaint "Street light not working..." is now being worked on. We'll keep you updated on the progress. Thank you for reporting! - CivicSense
```

### Status: Resolved
```
✅ Great news! Your complaint "Street light not working..." has been resolved. Thank you for helping improve our community! - CivicSense
```

## 🛠 Development vs Production Mode

### Development Mode (Current)
```javascript
// In development, SMS are logged to console:
console.log('📱 SMS NOTIFICATION:', {
  to: '919876543210',
  from: 'CivicSense',
  message: 'Good news! Your complaint...',
  timestamp: '2025-09-19T10:30:00.000Z'
});
```

### Production Mode
```javascript
// In production, actual SMS sent via API:
const response = await fetch('https://api.textlocal.in/send/', {
  method: 'POST',
  body: new URLSearchParams({
    apikey: process.env.SMS_API_KEY,
    numbers: '919876543210',
    message: 'Good news! Your complaint...',
    sender: 'CivicSense'
  })
});
```

## 📋 Configuration Required for Production

### Environment Variables (.env)
```env
# SMS Service Configuration
SMS_API_KEY=your_textlocal_api_key_here
SMS_API_URL=https://api.textlocal.in/send/
SMS_SENDER_NAME=CivicSense
NODE_ENV=production
```

### Supported SMS Providers
- **TextLocal** (currently configured)
- **Twilio** (can be easily integrated)
- **AWS SNS** (can be added)
- **Any HTTP-based SMS API**

## 🧪 Testing SMS Notifications

### Method 1: Development Mode (Current)
1. Submit a complaint with phone number
2. Admin changes status to "in_progress"
3. Check backend console for SMS log

### Method 2: Live Testing
1. Set `NODE_ENV=production` in .env
2. Add valid SMS API credentials
3. Test with real phone numbers

## 📊 SMS Flow Example

```
User: Rohit (Phone: 9876543210)
Complaint: "Pothole on Main Street"

Timeline:
09:00 AM - User submits complaint
10:30 AM - Admin changes status to "in_progress"
10:30 AM - System sends:
           ├─ In-app notification (bell icon)
           └─ SMS: "🚧 Good news! Your complaint 'Pothole on Main Street...' is now being worked on..."

02:15 PM - Admin changes status to "resolved"  
02:15 PM - System sends:
           ├─ In-app notification (bell icon)
           └─ SMS: "✅ Great news! Your complaint 'Pothole on Main Street...' has been resolved..."
```

## 🔍 Current Status
- ✅ SMS service implemented
- ✅ Phone number formatting
- ✅ Message templates created
- ✅ Development logging active
- ⏳ Production SMS API credentials needed
- ⏳ Production testing required

## 🚀 To Enable Production SMS:
1. Sign up for TextLocal or preferred SMS provider
2. Get API key and configure in .env
3. Set NODE_ENV=production
4. Test with real phone numbers