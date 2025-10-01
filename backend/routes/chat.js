const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Department = require("../models/Department");
const auth = require("../middleware/auth");

// Simple rate limiting for chat endpoints
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
// Allow a bit more headroom for init + fetch + read in quick succession
const MAX_REQUESTS_PER_WINDOW = 6; // 6 requests per 10 seconds per user

const rateLimitMiddleware = (req, res, next) => {
  // Rate-limit by route group (GET/POST) and resource, not the full URL incl. querystring
  const pathKey = req.originalUrl.split('?')[0];
  const key = `${req.user.id}-${req.method}-${pathKey}`;
  const now = Date.now();
  
  // Clean up old entries to prevent memory leaks
  if (rateLimit.size > 1000) {
    for (const [k, v] of rateLimit.entries()) {
      if (now > v.resetTime) {
        rateLimit.delete(k);
      }
    }
  }
  
  if (!rateLimit.has(key)) {
    rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const limit = rateLimit.get(key);
  
  if (now > limit.resetTime) {
    // Reset the limit
    rateLimit.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  if (limit.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: "Too many requests. Please wait." });
  }
  
  limit.count++;
  next();
};

// Middleware to determine user type and get user info
const getUserInfo = async (req, res, next) => {
  try {
    let userInfo = null;
    let userModel = '';
    let role = '';

    // Use normalized role/type from auth middleware
    const effectiveRole = req.user.role || req.user.type || 'user';

    // Find user based on effective role
    if (effectiveRole === 'admin') {
      userInfo = await Admin.findById(req.user.id);
      userModel = 'Admin';
      role = 'admin';
    } else if (effectiveRole === 'department') {
      userInfo = await Department.findById(req.user.id);
      userModel = 'Department';
      role = 'department';
    } else {
      // Default to user if no specific role or role is 'user'
      // Also try to find in User collection if role is undefined or null
      userInfo = await User.findById(req.user.id);
      userModel = 'User';
      role = 'user';
    }

    if (!userInfo) {
      return res.status(404).json({ error: "User not found" });
    }

    req.userInfo = userInfo;
    req.userModel = userModel;
    req.userRole = role;
    
    next();
  } catch (error) {
    console.error("Error getting user info:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Initialize chat for a complaint (called when chat is accessed)
router.post("/init/:complaintId", auth, getUserInfo, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { chatWith } = req.body; // 'user', 'admin', or undefined for department users

    console.log(`[CHAT DEBUG] Initializing chat for complaint: ${complaintId}, user: ${req.user.id}, role: ${req.userRole}, chatWith: ${chatWith}`);

    // Verify complaint exists and user has permission
    const complaint = await Complaint.findById(complaintId)
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email')
      .populate('assignedDepartment', 'name email');

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Allow chat only for in_progress complaints
    const allowedStatuses = ['in_progress'];
    if (!allowedStatuses.includes(complaint.status)) {
      return res.status(403).json({ 
        error: `Chat is only available for complaints in progress. Current status: ${complaint.status}` 
      });
    }

    // Check permissions and determine chat type
    let hasPermission = false;
    let chatType;
    let participants = [];
    
    console.log(`[CHAT DEBUG] INIT - Permission check - UserRole: ${req.userRole}, UserId: ${req.user.id}`);
    console.log(`[CHAT DEBUG] INIT - Complaint UserId: ${complaint.userId?._id}, Status: ${complaint.status}`);
    
    if (req.userRole === 'user') {
      // User can only chat if they filed the complaint
      // Handle both ObjectId and string comparisons
      let userOwnsComplaint = false;
      if (complaint.userId) {
        const complaintUserId = complaint.userId._id.toString();
        const currentUserId = req.user.id.toString();
        userOwnsComplaint = complaintUserId === currentUserId;
        console.log(`[CHAT DEBUG] INIT - User permission check - ComplaintUser: ${complaintUserId}, CurrentUser: ${currentUserId}, Match: ${userOwnsComplaint}`);
      }
      
      if (userOwnsComplaint) {
        hasPermission = true;
        chatType = 'user-department';
        console.log(`[CHAT DEBUG] INIT - User permission GRANTED`);
        
        // Add user
        participants.push({
          participantId: complaint.userId._id,
          participantModel: 'User',
          participantName: complaint.userId.name,
          participantRole: 'user'
        });
        
        // Add current department or find a department in same city
        if (complaint.assignedDepartment) {
          participants.push({
            participantId: complaint.assignedDepartment._id,
            participantModel: 'Department',
            participantName: complaint.assignedDepartment.name,
            participantRole: 'department'
          });
        } else {
          // Find any department in the same city
          const cityDepartment = await Department.findOne({
            assignedCity: { $regex: new RegExp(`^${complaint.location.city}$`, "i") },
            assignedState: { $regex: new RegExp(`^${complaint.location.state}$`, "i") },
            isActive: true
          });
          
          if (cityDepartment) {
            participants.push({
              participantId: cityDepartment._id,
              participantModel: 'Department',
              participantName: cityDepartment.name,
              participantRole: 'department'
            });
          }
        }
      } else {
        console.log(`[CHAT DEBUG] INIT - User permission DENIED - User doesn't own this complaint`);
      }
    } else if (req.userRole === 'admin') {
      // Admin permission check
      if (complaint.assignedAdmin && complaint.assignedAdmin._id.toString() === req.user.id) {
        hasPermission = true;
      } else {
        const admin = req.userInfo;
        if (admin.assignedCity && admin.assignedState && 
            complaint.location.city && complaint.location.state) {
          const adminCity = admin.assignedCity.toLowerCase().trim();
          const adminState = admin.assignedState.toLowerCase().trim();
          const complaintCity = complaint.location.city.toLowerCase().trim();
          const complaintState = complaint.location.state.toLowerCase().trim();
          
          if (adminCity === complaintCity && adminState === complaintState) {
            hasPermission = true;
          }
        }
      }
      
      if (hasPermission) {
        chatType = 'admin-department';
        
        // Add admin
        participants.push({
          participantId: req.user.id,
          participantModel: 'Admin',
          participantName: req.userInfo.name,
          participantRole: 'admin'
        });
        
        // Add department
        if (complaint.assignedDepartment) {
          participants.push({
            participantId: complaint.assignedDepartment._id,
            participantModel: 'Department',
            participantName: complaint.assignedDepartment.name,
            participantRole: 'department'
          });
        } else {
          // Find any department in the same city
          const cityDepartment = await Department.findOne({
            assignedCity: { $regex: new RegExp(`^${complaint.location.city}$`, "i") },
            assignedState: { $regex: new RegExp(`^${complaint.location.state}$`, "i") },
            isActive: true
          });
          
          if (cityDepartment) {
            participants.push({
              participantId: cityDepartment._id,
              participantModel: 'Department',
              participantName: cityDepartment.name,
              participantRole: 'department'
            });
          }
        }
      }
    } else if (req.userRole === 'department') {
      // Department permission check
      if (complaint.assignedDepartment && complaint.assignedDepartment._id.toString() === req.user.id) {
        hasPermission = true;
      } else {
        const department = req.userInfo;
        if (department.assignedCity && department.assignedState && 
            complaint.location.city && complaint.location.state) {
          const deptCity = department.assignedCity.toLowerCase().trim();
          const deptState = department.assignedState.toLowerCase().trim();
          const complaintCity = complaint.location.city.toLowerCase().trim();
          const complaintState = complaint.location.state.toLowerCase().trim();
          
          if (deptCity === complaintCity && deptState === complaintState) {
            hasPermission = true;
          }
        }
      }
      
      if (hasPermission) {
        // Department can chat with user or admin based on chatWith parameter
        if (chatWith === 'admin') {
          chatType = 'admin-department';
          
          // Add admin
          if (complaint.assignedAdmin) {
            participants.push({
              participantId: complaint.assignedAdmin._id,
              participantModel: 'Admin',
              participantName: complaint.assignedAdmin.name,
              participantRole: 'admin'
            });
          } else {
            // Find city admin if no specific admin assigned
            const cityAdmin = await Admin.findOne({
              assignedCity: { $regex: new RegExp(`^${complaint.location.city}$`, "i") },
              assignedState: { $regex: new RegExp(`^${complaint.location.state}$`, "i") },
              isActive: true
            });
            
            if (cityAdmin) {
              participants.push({
                participantId: cityAdmin._id,
                participantModel: 'Admin',
                participantName: cityAdmin.name,
                participantRole: 'admin'
              });
            }
          }
          
          // Add department
          participants.push({
            participantId: req.user.id,
            participantModel: 'Department',
            participantName: req.userInfo.name,
            participantRole: 'department'
          });
        } else {
          // Default to chatting with user
          chatType = 'user-department';
          
          // Add user
          participants.push({
            participantId: complaint.userId._id,
            participantModel: 'User',
            participantName: complaint.userId.name,
            participantRole: 'user'
          });
          
          // Add department
          participants.push({
            participantId: req.user.id,
            participantModel: 'Department',
            participantName: req.userInfo.name,
            participantRole: 'department'
          });
        }
      }
    }

    console.log(`[CHAT DEBUG] INIT - Final permission result: ${hasPermission}, chatType: ${chatType}`);

    if (!hasPermission) {
      console.log(`[CHAT DEBUG] INIT - ACCESS DENIED - UserRole: ${req.userRole}, ComplaintUserId: ${complaint.userId?._id}, CurrentUserId: ${req.user.id}`);
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if specific chat type already exists
    let chat = await Chat.findOne({ complaintId, chatType });

    console.log(`[CHAT DEBUG] Existing chat found: ${chat ? 'YES' : 'NO'}, chatType: ${chatType}`);

    if (!chat) {
      // Create new chat with specific type and participants
      chat = new Chat({
        complaintId,
        chatType,
        participants
      });

      await chat.save();
      console.log(`[CHAT DEBUG] New chat created with ID: ${chat._id}`);
    } else {
      console.log(`[CHAT DEBUG] Using existing chat with ID: ${chat._id}, messages: ${chat.messages.length}`);
    }

    res.json({
      success: true,
      chatId: chat._id,
      chatType: chat.chatType,
      participants: chat.participants,
      message: "Chat initialized successfully"
    });

  } catch (error) {
    console.error("Error initializing chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get chat messages for a complaint
router.get("/:complaintId", auth, rateLimitMiddleware, getUserInfo, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { chatWith } = req.query; // Get chatWith from query parameters

    console.log(`[CHAT DEBUG] GET messages for complaint: ${complaintId}, user: ${req.user.id}, role: ${req.userRole}, chatWith: ${chatWith}`);

    // Validate ObjectId format to prevent unnecessary database queries
    if (!complaintId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid complaint ID format" });
    }

    // Same permission and chatType logic as init route
    const complaint = await Complaint.findById(complaintId)
      .select('status userId assignedAdmin assignedDepartment location') // Only select needed fields
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email')
      .populate('assignedDepartment', 'name email');

    console.log(`[CHAT DEBUG] Complaint assigned - Admin: ${complaint?.assignedAdmin?._id}, Department: ${complaint?.assignedDepartment?._id}`);

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Allow chat only for in_progress complaints
    const allowedStatuses = ['in_progress'];
    if (!allowedStatuses.includes(complaint.status)) {
      return res.status(403).json({ error: "Chat is only available for complaints in progress" });
    }

    // Determine chat type and check permissions
    let hasPermission = false;
    let chatType;
    let possibleChatTypes = []; // For admins to check multiple chat types
    
    console.log(`[CHAT DEBUG] Permission check - UserRole: ${req.userRole}, UserId: ${req.user.id}`);
    console.log(`[CHAT DEBUG] Complaint UserId: ${complaint.userId?._id}, Status: ${complaint.status}`);
    
    if (req.userRole === 'user') {
      const complaintUserId = complaint.userId?._id?.toString();
      const currentUserId = req.user.id?.toString();
      console.log(`[CHAT DEBUG] User permission check - ComplaintUser: ${complaintUserId}, CurrentUser: ${currentUserId}, Match: ${complaintUserId === currentUserId}`);
      
      if (complaint.userId && complaintUserId === currentUserId) {
        hasPermission = true;
        chatType = 'user-department';
        console.log(`[CHAT DEBUG] User permission GRANTED`);
      } else {
        console.log(`[CHAT DEBUG] User permission DENIED - User doesn't own this complaint`);
      }
    } else if (req.userRole === 'admin') {
      if (complaint.assignedAdmin && complaint.assignedAdmin._id.toString() === req.user.id) {
        hasPermission = true;
      } else {
        const admin = req.userInfo;
        if (admin.assignedCity && admin.assignedState && 
            complaint.location.city && complaint.location.state) {
          const adminCity = admin.assignedCity.toLowerCase().trim();
          const adminState = admin.assignedState.toLowerCase().trim();
          const complaintCity = complaint.location.city.toLowerCase().trim();
          const complaintState = complaint.location.state.toLowerCase().trim();
          
          if (adminCity === complaintCity && adminState === complaintState) {
            hasPermission = true;
          }
        }
      }
      // For admins, we should check for admin-department chats
      chatType = 'admin-department';
      possibleChatTypes = ['admin-department']; // Admin can participate in admin-department chats
    } else if (req.userRole === 'department') {
      if (complaint.assignedDepartment && complaint.assignedDepartment._id.toString() === req.user.id) {
        hasPermission = true;
      } else {
        const department = req.userInfo;
        if (department.assignedCity && department.assignedState && 
            complaint.location.city && complaint.location.state) {
          const deptCity = department.assignedCity.toLowerCase().trim();
          const deptState = department.assignedState.toLowerCase().trim();
          const complaintCity = complaint.location.city.toLowerCase().trim();
          const complaintState = complaint.location.state.toLowerCase().trim();
          
          if (deptCity === complaintCity && deptState === complaintState) {
            hasPermission = true;
          }
        }
      }
      
      // Determine chat type based on chatWith parameter
      if (chatWith === 'admin') {
        chatType = 'admin-department';
      } else {
        chatType = 'user-department';
      }
    }

    console.log(`[CHAT DEBUG] GET - Final permission result: ${hasPermission}, chatType: ${chatType}`);

    if (!hasPermission) {
      console.log(`[CHAT DEBUG] GET - ACCESS DENIED - UserRole: ${req.userRole}, ComplaintUserId: ${complaint.userId?._id}, CurrentUserId: ${req.user.id}`);
      return res.status(403).json({ error: "Access denied" });
    }

    // Find the specific chat
    let chat = await Chat.findOne({ complaintId, chatType });

    console.log(`[CHAT DEBUG] GET messages - Found chat: ${chat ? 'YES' : 'NO'}, chatType: ${chatType}`);
    console.log(`[CHAT DEBUG] Requester: ${req.userRole} (${req.userInfo.name}), Looking for chatType: ${chatType}`);
    
    if (chat) {
      console.log(`[CHAT DEBUG] Chat has ${chat.messages ? chat.messages.length : 0} messages`);
    } else {
      // Let's check what chats DO exist for this complaint
      const allChats = await Chat.find({ complaintId });
      console.log(`[CHAT DEBUG] No chat found. Available chats for this complaint: ${allChats.map(c => `${c.chatType}(${c.messages.length} msgs)`).join(', ')}`);
    }

    if (!chat) {
      // Try to auto-initialize a chat room for valid roles to reduce UX friction
      try {
        const participants = [];
        if (chatType === 'user-department') {
          // add user and department when discoverable
          if (complaint.userId) {
            participants.push({
              participantId: complaint.userId._id,
              participantModel: 'User',
              participantName: complaint.userId.name,
              participantRole: 'user'
            });
          }
          if (complaint.assignedDepartment) {
            participants.push({
              participantId: complaint.assignedDepartment._id,
              participantModel: 'Department',
              participantName: complaint.assignedDepartment.name,
              participantRole: 'department'
            });
          }
        } else if (chatType === 'admin-department') {
          if (complaint.assignedAdmin) {
            participants.push({
              participantId: complaint.assignedAdmin._id,
              participantModel: 'Admin',
              participantName: complaint.assignedAdmin.name,
              participantRole: 'admin'
            });
          }
          if (complaint.assignedDepartment) {
            participants.push({
              participantId: complaint.assignedDepartment._id,
              participantModel: 'Department',
              participantName: complaint.assignedDepartment.name,
              participantRole: 'department'
            });
          }
        }

        if (participants.length >= 2) {
          const newChat = new Chat({ complaintId, chatType, participants });
          await newChat.save();
          chat = newChat;
        }
      } catch (e) {
        console.warn('[CHAT DEBUG] Auto-init failed:', e?.message);
      }

      if (!chat) {
        return res.json({
          success: true,
          chat: null,
          chatType: chatType,
          unreadCount: 0
        });
      }
    }

    // Calculate unread count - only received messages that haven't been read
    const allMessages = chat.messages || [];
    const currentUserId = req.user.id;
    
    const unreadMessages = allMessages.filter(msg => {
      // Skip messages sent by current user - only count received messages
      if (msg.senderId.toString() === currentUserId) {
        return false;
      }
      
      // Check if current user has read this message
      const hasUserReadMessage = msg.isRead.some(read => 
        read.userId && read.userId.toString() === currentUserId
      );
      
      // Only count if the user hasn't read it
      return !hasUserReadMessage;
    });

    // Update last seen for the requesting user
    if (chat.participants) {
      const participantIndex = chat.participants.findIndex(p => 
        p.participantId.toString() === req.user.id
      );
      
      if (participantIndex !== -1) {
        chat.participants[participantIndex].lastSeenAt = new Date();
        await chat.save();
      }
    }

    console.log(`[CHAT DEBUG] Returning chat with ${chat.messages.length} messages, unreadCount: ${unreadMessages.length}`);

    res.json({
      success: true,
      chat: {
        _id: chat._id,
        complaintId: chat.complaintId,
        chatType: chat.chatType,
        participants: chat.participants,
        messages: chat.messages,
        isActive: chat.isActive,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      },
      chatType: chat.chatType,
      unreadCount: unreadMessages.length
    });

  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Send a message in the chat
router.post("/:complaintId/message", auth, getUserInfo, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { content, messageType = 'text', chatWith } = req.body;

    console.log(`[CHAT DEBUG] Sending message for complaint: ${complaintId}, user: ${req.user.id}, role: ${req.userRole}, chatWith: ${chatWith}`);

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: "Message content is required" });
    }

    // Same permission and chatType logic as other routes
    const complaint = await Complaint.findById(complaintId)
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email')
      .populate('assignedDepartment', 'name email');

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Allow chat only for in_progress complaints
    const allowedStatuses = ['in_progress'];
    if (!allowedStatuses.includes(complaint.status)) {
      return res.status(403).json({ 
        error: `Chat is only available for complaints in progress. Current status: ${complaint.status}` 
      });
    }

    // Determine chat type and check permissions (same logic as GET route)
    let hasPermission = false;
    let chatType;
    
    if (req.userRole === 'user') {
      // User can only send messages if they filed the complaint
      // Handle both ObjectId and string comparisons
      let userOwnsComplaint = false;
      if (complaint.userId) {
        const complaintUserId = complaint.userId._id.toString();
        const currentUserId = req.user.id.toString();
        userOwnsComplaint = complaintUserId === currentUserId;
      }
      
      if (userOwnsComplaint) {
        hasPermission = true;
        chatType = 'user-department';
      }
    } else if (req.userRole === 'admin') {
      if (complaint.assignedAdmin && complaint.assignedAdmin._id.toString() === req.user.id) {
        hasPermission = true;
      } else {
        const admin = req.userInfo;
        if (admin.assignedCity && admin.assignedState && 
            complaint.location.city && complaint.location.state) {
          const adminCity = admin.assignedCity.toLowerCase().trim();
          const adminState = admin.assignedState.toLowerCase().trim();
          const complaintCity = complaint.location.city.toLowerCase().trim();
          const complaintState = complaint.location.state.toLowerCase().trim();
          
          if (adminCity === complaintCity && adminState === complaintState) {
            hasPermission = true;
          }
        }
      }
      chatType = 'admin-department';
    } else if (req.userRole === 'department') {
      if (complaint.assignedDepartment && complaint.assignedDepartment._id.toString() === req.user.id) {
        hasPermission = true;
      } else {
        const department = req.userInfo;
        if (department.assignedCity && department.assignedState && 
            complaint.location.city && complaint.location.state) {
          const deptCity = department.assignedCity.toLowerCase().trim();
          const deptState = department.assignedState.toLowerCase().trim();
          const complaintCity = complaint.location.city.toLowerCase().trim();
          const complaintState = complaint.location.state.toLowerCase().trim();
          
          if (deptCity === complaintCity && deptState === complaintState) {
            hasPermission = true;
          }
        }
      }
      
      // Determine chat type based on chatWith parameter
      if (chatWith === 'admin') {
        chatType = 'admin-department';
      } else {
        chatType = 'user-department';
      }
    }

    if (!hasPermission) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Find the specific chat
    let chat = await Chat.findOne({ complaintId, chatType });

    console.log(`[CHAT DEBUG] Sending message - Found chat: ${chat ? 'YES' : 'NO'}, chatType: ${chatType}`);
    console.log(`[CHAT DEBUG] Sender: ${req.userRole} (${req.userInfo.name}), Looking for chatType: ${chatType}`);

    if (!chat) {
      console.log(`[CHAT DEBUG] ❌ Chat not found for complaint: ${complaintId}, chatType: ${chatType}`);
      // Let's check what chats DO exist for this complaint
      const allChats = await Chat.find({ complaintId });
      console.log(`[CHAT DEBUG] Available chats for this complaint: ${allChats.map(c => c.chatType).join(', ')}`);
      
      return res.status(404).json({ error: "Chat not found. Please initialize chat first." });
    }

    // Create new message
    const newMessage = {
      senderId: req.user.id,
      senderModel: req.userModel,
      senderName: req.userInfo.name,
      senderRole: req.userRole,
      content: content.trim(),
      messageType,
      timestamp: new Date(),
      isRead: []
    };

    chat.messages.push(newMessage);
    await chat.save();

    // Get the saved message with ID
    const savedMessage = chat.messages[chat.messages.length - 1];

    console.log(`[CHAT DEBUG] Message saved successfully, chat now has ${chat.messages.length} messages`);

    res.json({
      success: true,
      message: savedMessage,
      chatType: chat.chatType
    });

  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark messages as read
router.post("/:complaintId/read", auth, getUserInfo, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { chatWith } = req.body;

    // Determine chat type same way as other routes
    let chatType;
    if (req.userRole === 'user') {
      chatType = 'user-department';
    } else if (req.userRole === 'admin') {
      chatType = 'admin-department';
    } else if (req.userRole === 'department') {
      if (chatWith === 'admin') {
        chatType = 'admin-department';
      } else {
        chatType = 'user-department';
      }
    }

    const chat = await Chat.findOne({ complaintId, chatType });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Mark unread messages as read - only messages from others
    let markedAsRead = 0;
    chat.messages.forEach(message => {
      // Only mark messages as read that were NOT sent by the current user
      if (message.senderId.toString() !== req.user.id) {
        const existingReadEntry = message.isRead.find(read => 
          read.userId && read.userId.toString() === req.user.id
        );
        
        if (!existingReadEntry) {
          message.isRead.push({
            userId: req.user.id,
            userModel: req.userModel,
            readAt: new Date()
          });
          markedAsRead++;
        }
      }
    });

    await chat.save();

    res.json({
      success: true,
      message: "Messages marked as read",
      markedCount: markedAsRead
    });

  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;