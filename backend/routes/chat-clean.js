const express = require("express");
const router = express.Router();
const Chat = require("../models/Chat");
const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Admin = require("../models/Admin");
const Department = require("../models/Department");
const auth = require("../middleware/auth");

// Middleware to determine user type and get user info
const getUserInfo = async (req, res, next) => {
  try {
    let userInfo = null;
    let userModel = '';
    let role = '';

    // Try to find user in each collection based on the role from JWT
    if (req.user.role === 'admin') {
      userInfo = await Admin.findById(req.user.id);
      userModel = 'Admin';
      role = 'admin';
    } else if (req.user.role === 'department') {
      userInfo = await Department.findById(req.user.id);
      userModel = 'Department';
      role = 'department';
    } else {
      // Default to user if no specific role or role is 'user'
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

    // Verify complaint exists and user has permission
    const complaint = await Complaint.findById(complaintId)
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email')
      .populate('assignedDepartment', 'name email');

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Only allow chat for in-progress complaints
    if (complaint.status !== 'in_progress') {
      return res.status(403).json({ error: "Chat is only available for in-progress complaints" });
    }

    // Check permissions and determine chat type
    let hasPermission = false;
    let chatType;
    let participants = [];
    
    if (req.userRole === 'user') {
      // User can only chat if they filed the complaint
      hasPermission = complaint.userId._id.toString() === req.user.id;
      chatType = 'user-department';
      
      if (hasPermission) {
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

    if (!hasPermission) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if specific chat type already exists
    let chat = await Chat.findOne({ complaintId, chatType });

    if (!chat) {
      // Create new chat with specific type and participants
      chat = new Chat({
        complaintId,
        chatType,
        participants
      });

      await chat.save();
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
router.get("/:complaintId", auth, getUserInfo, async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { chatWith } = req.query; // Get chatWith from query parameters

    // Same permission and chatType logic as init route
    const complaint = await Complaint.findById(complaintId)
      .populate('userId', 'name email')
      .populate('assignedAdmin', 'name email')
      .populate('assignedDepartment', 'name email');

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (complaint.status !== 'in_progress') {
      return res.status(403).json({ error: "Chat is only available for in-progress complaints" });
    }

    // Determine chat type and check permissions
    let hasPermission = false;
    let chatType;
    
    if (req.userRole === 'user') {
      hasPermission = complaint.userId._id.toString() === req.user.id;
      chatType = 'user-department';
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

    if (!chat) {
      return res.status(404).json({ error: "Chat not found. Please initialize chat first." });
    }

    // Update last seen
    const participantIndex = chat.participants.findIndex(p => 
      p.participantId.toString() === req.user.id
    );
    
    if (participantIndex !== -1) {
      chat.participants[participantIndex].lastSeenAt = new Date();
      await chat.save();
    }

    res.json({
      success: true,
      chat,
      chatType: chat.chatType,
      unreadCount: chat.messages.filter(msg => 
        msg.senderId.toString() !== req.user.id &&
        !msg.isRead.some(read => read.userId && read.userId.toString() === req.user.id)
      ).length
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

    if (complaint.status !== 'in_progress') {
      return res.status(403).json({ error: "Chat is only available for in-progress complaints" });
    }

    // Determine chat type and check permissions (same logic as GET route)
    let hasPermission = false;
    let chatType;
    
    if (req.userRole === 'user') {
      hasPermission = complaint.userId._id.toString() === req.user.id;
      chatType = 'user-department';
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

    if (!chat) {
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

    // Mark unread messages as read
    chat.messages.forEach(message => {
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
        }
      }
    });

    await chat.save();

    res.json({
      success: true,
      message: "Messages marked as read"
    });

  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;