# Notification System Documentation

## Overview
The notification system provides comprehensive user notifications for complaint status updates through two channels:

1. **In-App Notifications**: Bell icon with badge count and dropdown
2. **SMS Notifications**: Text messages sent to user's phone number

## Features

### In-App Notifications
- 🔔 Bell icon in the header next to the profile icon
- 🔴 Red badge showing unread notification count
- 📋 Dropdown showing recent notifications
- ✅ Mark individual notifications as read
- ✅✅ Mark all notifications as read
- 🔄 Real-time polling for new notifications (every 30 seconds)

### SMS Notifications
- 📱 Automatic SMS when complaint status changes to "in-progress"
- 📱 Automatic SMS when complaint status changes to "resolved"
- 🎯 Contextual messages with complaint description
- 🛡️ Development mode logs to console instead of sending actual SMS

## Technical Implementation

### Backend Components

1. **Notification Model** (`/backend/models/Notification.js`)
   - Stores in-app notifications
   - Links to users and complaints
   - Tracks read/unread status

2. **SMS Service** (`/backend/services/smsService.js`)
   - Handles SMS delivery
   - Supports multiple providers (TextLocal example)
   - Development mode for testing

3. **Notification Service** (`/backend/services/notificationService.js`)
   - Central service for creating notifications
   - Handles both in-app and SMS notifications
   - Template management for messages

4. **API Routes** (`/backend/routes/notifications.js`)
   - GET `/notifications` - Fetch user notifications
   - GET `/notifications/unread-count` - Get unread count
   - PUT `/notifications/:id/read` - Mark as read
   - PUT `/notifications/mark-all-read` - Mark all as read

### Frontend Components

1. **NotificationIcon** (`/frontend/src/components/NotificationIcon.jsx`)
   - Bell icon with badge
   - Dropdown interface
   - Polling for updates

2. **ToastContainer** (`/frontend/src/components/ToastContainer.jsx`)
   - Success/warning/info toast notifications
   - Auto-dismiss functionality
   - Global `window.showToast()` method

3. **Integration** 
   - Added to ResponsiveDashboard header
   - Responsive design for mobile/desktop

## Configuration

### Environment Variables (Backend)
```bash
# For production SMS (optional)
SMS_API_KEY=your_api_key
SMS_API_URL=https://api.textlocal.in/send/
SMS_SENDER_NAME=CivicSense

# Development mode (default)
NODE_ENV=development
```

### SMS Provider Setup
The system is configured for TextLocal by default but can be adapted for:
- Twilio
- AWS SNS
- Firebase Cloud Messaging
- Any REST-based SMS API

## Usage

### For Users
1. **Receiving Notifications**:
   - Look for red badge on bell icon
   - Click bell to view notifications
   - Click "Mark as read" or "Mark all read"

2. **SMS Notifications**:
   - Automatically sent to phone number from complaint
   - No user action required

### For Administrators
1. **Triggering Notifications**:
   - Change complaint status to "in-progress" or "resolved"
   - System automatically sends both in-app and SMS notifications

2. **Monitoring**:
   - Check backend logs for SMS delivery status
   - In development mode, SMS content is logged to console

## Message Templates

### In-Progress Status
- **In-App**: "🚧 Great news! Your complaint '[description]' is now being worked on by our team."
- **SMS**: "✅ Good news! Your complaint '[description]' is now being worked on. We'll keep you updated on the progress. Thank you for reporting! - CivicSense"

### Resolved Status
- **In-App**: "✅ Excellent! Your complaint '[description]' has been resolved. Thank you for helping improve our community."
- **SMS**: "🎉 Great news! Your complaint '[description]' has been resolved. Thank you for helping improve our community! - CivicSense"

## Database Schema

### Notifications Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  complaintId: ObjectId (ref: Complaint),
  type: "status_update",
  title: "🚧 Complaint In Progress",
  message: "Great news! Your complaint '...' is now being worked on...",
  status: "unread" | "read",
  metadata: {
    oldStatus: "pending",
    newStatus: "in_progress", 
    adminName: "Admin Name",
    complaintDescription: "Complaint description..."
  },
  createdAt: Date,
  readAt: Date
}
```

## Testing

### Development Testing
1. Start backend: `npm run dev`
2. Start frontend: `npm run dev`
3. Login as user
4. Submit a complaint
5. Login as admin
6. Change complaint status
7. Check console for SMS logs
8. Check user dashboard for notifications

### Production Testing
1. Configure SMS API credentials
2. Set `NODE_ENV=production`
3. Test with real phone numbers
4. Monitor SMS delivery logs

## Security Features

- 🔐 JWT token validation for all notification endpoints
- 🛡️ User isolation (users only see their notifications)
- 📱 Phone number formatting and validation
- 🔒 Rate limiting through SMS service
- 🧹 Input sanitization and validation

## Performance Considerations

- 📊 Indexed database queries for notifications
- 🔄 Efficient polling (30-second intervals)
- 🗑️ Automatic cleanup of old notifications (can be implemented)
- 📦 Pagination support for notification history
- ⚡ Lazy loading of notification content

## Future Enhancements

1. **Real-time Updates**:
   - WebSocket integration for instant notifications
   - Push notifications for mobile apps

2. **Additional Notification Types**:
   - Comment notifications
   - Upvote/downvote notifications
   - Admin message notifications

3. **User Preferences**:
   - Enable/disable SMS notifications
   - Choose notification frequency
   - Customize message templates

4. **Analytics**:
   - Notification delivery tracking
   - User engagement metrics
   - SMS delivery success rates

## Troubleshooting

### Common Issues

1. **Notifications not showing**:
   - Check JWT token validity
   - Verify API endpoints are accessible
   - Check browser console for errors

2. **SMS not sending**:
   - Verify SMS API credentials
   - Check phone number formatting
   - Review SMS service logs

3. **High notification count**:
   - Check notification polling frequency
   - Verify mark-as-read functionality
   - Clear browser cache

### Debug Commands
```bash
# Check notification count
curl -H "Authorization: Bearer <token>" http://localhost:5000/notifications/unread-count

# Test notification creation
# (Triggered automatically when admin changes complaint status)
```