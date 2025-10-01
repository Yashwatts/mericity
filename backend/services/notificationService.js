const Notification = require('../models/Notification');
const smsService = require('./smsService');

class NotificationService {
  // Create in-app notification
  async createNotification(userId, complaintId, type, title, message, metadata = {}) {
    try {
      const notification = new Notification({
        userId,
        complaintId,
        type,
        title,
        message,
        metadata,
      });
      
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send notification for complaint status change
  async sendStatusUpdateNotification(complaint, oldStatus, newStatus, adminName) {
    try {
      console.log(`[NOTIFICATION] Sending status update: ${complaint._id} - ${oldStatus} → ${newStatus}`);
      
      const title = this.getStatusTitle(newStatus);
      const message = this.getStatusMessage(newStatus, complaint.description);
      
      console.log(`[NOTIFICATION] Creating notification for user ${complaint.userId}: ${title}`);
      
      // Create in-app notification
      const notification = await this.createNotification(
        complaint.userId,
        complaint._id,
        'status_update',
        title,
        message,
        {
          oldStatus,
          newStatus,
          adminName,
          complaintDescription: complaint.description.substring(0, 100),
        }
      );

      console.log(`[NOTIFICATION] In-app notification created: ${notification._id}`);

      // Send SMS notification
      if (complaint.phone) {
        const smsMessage = smsService.getStatusMessage(newStatus, complaint.description);
        const formattedPhone = smsService.formatPhoneNumber(complaint.phone);
        
        const smsResult = await smsService.sendSMS(formattedPhone, smsMessage);
        console.log('[NOTIFICATION] SMS sent result:', smsResult);
      }

      console.log(`[NOTIFICATION] ✅ Notifications sent for complaint ${complaint._id} status change: ${oldStatus} → ${newStatus}`);
      return notification;
    } catch (error) {
      console.error('[NOTIFICATION] ❌ Error sending status update notification:', error);
      console.error('[NOTIFICATION] Complaint data:', {
        id: complaint._id,
        userId: complaint.userId,
        oldStatus,
        newStatus
      });
      // Don't throw error to avoid breaking the main flow
      return null;
    }
  }

  // Get user's unread notification count
  async getUnreadCount(userId) {
    try {
      return await Notification.countDocuments({
        userId,
        status: 'unread',
      });
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  // Get user's notifications with pagination
  async getUserNotifications(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const notifications = await Notification.find({ userId })
        .populate('complaintId', 'description location status createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments({ userId });
      
      return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { status: 'read', readAt: new Date() }
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId) {
    try {
      await Notification.updateMany(
        { userId, status: 'unread' },
        { status: 'read', readAt: new Date() }
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Helper methods for generating notification content
  getStatusTitle(status) {
    switch (status) {
      case 'in_progress':
        return '🚧 Complaint In Progress';
      case 'resolved':
        return '✅ Complaint Resolved';
      case 'rejected':
        return '❌ Complaint Rejected';
      case 'rejected_no_answer':
        return '❌ Complaint Rejected - No Answer';
      case 'rejected_by_user':
        return '❌ Complaint Rejected by User';
      default:
        return '📋 Complaint Updated';
    }
  }

  getStatusMessage(status, description) {
    const shortDescription = description?.length > 50 
      ? description.substring(0, 50) + '...' 
      : description;

    switch (status) {
      case 'in_progress':
        return `Great news! Your complaint "${shortDescription}" has been approved and is now being worked on by our team.`;
      case 'resolved':
        return `Excellent! Your complaint "${shortDescription}" has been resolved. Thank you for helping improve our community.`;
      case 'rejected':
        return `Your complaint "${shortDescription}" has been reviewed and rejected. Please check the rejection reason for more details.`;
      case 'rejected_no_answer':
        return `Your complaint "${shortDescription}" was rejected because we couldn't verify your phone number. You can submit a new complaint if needed.`;
      case 'rejected_by_user':
        return `Your complaint "${shortDescription}" was marked as rejected by user request.`;
      default:
        return `Your complaint "${shortDescription}" status has been updated.`;
    }
  }

  // Send notification for missed verification call
  async sendMissedCallNotification(complaint) {
    try {
      const title = 'Verification Call Missed';
      const shortDescription = complaint.description.length > 50 
        ? complaint.description.substring(0, 50) + '...' 
        : complaint.description;
      
      const message = `We tried to call you to verify your complaint "${shortDescription}" but couldn't reach you. Your complaint has been closed. You can submit a new complaint if needed.`;
      
      // Create in-app notification
      await this.createNotification(
        complaint.userId,
        complaint._id,
        'missed_call',
        title,
        message,
        { 
          callStatus: complaint.noAnswerCallStatus,
          missedAt: complaint.noAnswerTimestamp
        }
      );

      console.log(`[NOTIFICATION] Created missed call notification for user ${complaint.userId}`);

      // Optional: Send SMS notification if phone number available
      if (complaint.phone && smsService) {
        try {
          const smsMessage = `Meri City: We tried calling ${complaint.phone} to verify your complaint but couldn't reach you. Your complaint has been closed. Submit a new one if needed.`;
          await smsService.sendSMS(complaint.phone, smsMessage);
          console.log(`[NOTIFICATION] Sent missed call SMS to ${complaint.phone}`);
        } catch (smsError) {
          console.warn(`[NOTIFICATION] Failed to send missed call SMS:`, smsError.message);
        }
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATION] Error sending missed call notification:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();