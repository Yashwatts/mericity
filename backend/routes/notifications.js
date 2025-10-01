const express = require("express");
const auth = require("../middleware/auth");
const notificationService = require("../services/notificationService");
const router = express.Router();

// Get user's notifications with pagination
router.get("/", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await notificationService.getUserNotifications(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );

    res.json(result);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get unread notification count
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    res.json({ count });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark a specific notification as read
router.put("/:id/read", auth, async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    res.json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark all notifications as read
router.put("/mark-all-read", auth, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Test route to create a notification manually (for debugging)
router.post("/test", auth, async (req, res) => {
  try {
    const testNotification = await notificationService.createNotification(
      req.user.id,
      req.user.id, // Using user ID as complaint ID for test
      'status_update',
      'Test Notification',
      'This is a test notification to verify the system is working.',
      { test: true }
    );
    
    console.log('[NOTIFICATION-TEST] Created test notification:', testNotification._id);
    res.json({ message: "Test notification created", notification: testNotification });
  } catch (error) {
    console.error("Test notification error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;