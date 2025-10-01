const express = require("express");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const router = express.Router();

// Admin Login (using adminId and password)
router.post("/login", async (req, res) => {
  try {
    const { adminId, password } = req.body;

    if (!adminId || !password) {
      return res
        .status(400)
        .json({ error: "Admin ID and password are required" });
    }

    // Find admin by adminId
    const admin = await Admin.findOne({
      adminId: adminId.trim(),
      isActive: true,
    });

    if (!admin) {
      return res.status(401).json({ error: "Invalid admin ID or password" });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid admin ID or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin._id,
        role: "admin",
        city: admin.assignedCity,
        state: admin.assignedState,
        adminId: admin.adminId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        adminId: admin.adminId,
        assignedCity: admin.assignedCity,
        assignedState: admin.assignedState,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Get Admin Profile
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const admin = await Admin.findById(decoded.id).select("-password");
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        assignedCity: admin.assignedCity,
        assignedState: admin.assignedState,
        role: admin.role,
        isActive: admin.isActive,
      },
    });
  } catch (error) {
    console.error("Get admin profile error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get all city admins (for super admin)
router.get("/cities", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const admins = await Admin.find({ isActive: true })
      .select("-password")
      .sort({ assignedState: 1, assignedCity: 1 });

    const cityList = admins.map((admin) => ({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      assignedCity: admin.assignedCity,
      assignedState: admin.assignedState,
      createdAt: admin.createdAt,
    }));

    res.json({ cities: cityList });
  } catch (error) {
    console.error("Get cities error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update admin profile
router.put("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    const { name, email } = req.body;
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Check if email is being changed and is unique
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({
        email: email.toLowerCase().trim(),
      });
      if (existingAdmin) {
        return res.status(400).json({ error: "Email already in use" });
      }
      admin.email = email.toLowerCase().trim();
    }

    if (name) admin.name = name.trim();

    await admin.save();

    res.json({
      message: "Profile updated successfully",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        assignedCity: admin.assignedCity,
        assignedState: admin.assignedState,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Server error", details: error?.message });
  }
});

// Middleware to authenticate admin
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

// Get all complaints from admin's assigned city (viewing only)
router.get("/complaints", authenticateAdmin, async (req, res) => {
  try {
    const Complaint = require("../models/Complaint");

    // Get admin info
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    console.log(
      `Fetching complaints for admin: ${admin.name} (${admin.assignedCity}, ${admin.assignedState})`
    );

    // Find all complaints from admin's assigned city and state
    const complaints = await Complaint.find({
      $and: [
        {
          $or: [
            {
              "location.city": { $regex: new RegExp(admin.assignedCity, "i") },
            },
            { assignedCity: { $regex: new RegExp(admin.assignedCity, "i") } },
          ],
        },
        {
          $or: [
            {
              "location.state": {
                $regex: new RegExp(admin.assignedState, "i"),
              },
            },
            { assignedState: { $regex: new RegExp(admin.assignedState, "i") } },
          ],
        },
      ],
    })
      .populate("userId", "name email phone")
      .populate("assignedDepartment", "name departmentType email contactNumber")
      .sort({ createdAt: -1 });

    // Add full URL to image and audio paths, and canManage property
    const complaintsWithUrls = complaints.map((complaint) => ({
      ...complaint.toObject(),
      imageUrl: complaint.image
        ? `${req.protocol}://${req.get("host")}/${complaint.image}`
        : null,
      audioUrl: complaint.audio
        ? `${req.protocol}://${req.get("host")}/${complaint.audio}`
        : null,
      canApprove: complaint.status === "pending", // Admin can only approve pending complaints
      canReject: complaint.status === "pending", // Admin can only reject pending complaints
      isAssignedToDepartment: !!complaint.assignedDepartment, // Check if assigned to department
      workflowStage: complaint.status === "pending" 
        ? "awaiting_admin_approval" 
        : complaint.status === "in_progress" 
          ? (complaint.assignedDepartment ? "with_department" : "approved_unassigned")
          : "resolved"
    }));

    // Calculate stats
    const stats = {
      pending: complaintsWithUrls.filter((c) => c.status === "pending").length,
      in_progress: complaintsWithUrls.filter((c) => c.status === "in_progress")
        .length,
      resolved: complaintsWithUrls.filter((c) => c.status === "resolved")
        .length,
      rejected: complaintsWithUrls.filter((c) => c.status === "rejected")
        .length,
      total: complaintsWithUrls.length,
      awaiting_approval: complaintsWithUrls.filter((c) => c.status === "pending").length,
      with_departments: complaintsWithUrls.filter((c) => c.status === "in_progress" && c.assignedDepartment).length,
      unassigned_approved: complaintsWithUrls.filter((c) => c.status === "in_progress" && !c.assignedDepartment).length,
    };

    res.json({
      complaints: complaintsWithUrls,
      stats,
      admin: {
        name: admin.name,
        city: admin.assignedCity,
        state: admin.assignedState,
      },
      message: `Found ${complaintsWithUrls.length} complaints from ${admin.assignedCity}, ${admin.assignedState}`,
      workflow: {
        description: "New Complaint Workflow",
        steps: [
          "1. User submits complaint (status: pending)",
          "2. Admin approves complaint (status changes to: in_progress)",  
          "3. System automatically assigns to appropriate department",
          "4. Department resolves complaint (status changes to: resolved)"
        ]
      },
    });
  } catch (error) {
    console.error("Admin complaints fetch error:", error);
    res.status(500).json({ error: "Server error", details: error?.message });
  }
});

// Get complaint statistics for admin's city
router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    const Complaint = require("../models/Complaint");
    const Department = require("../models/Department");

    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Get complaint stats
    const totalComplaints = await Complaint.countDocuments({
      $and: [
        {
          $or: [
            {
              "location.city": { $regex: new RegExp(admin.assignedCity, "i") },
            },
            { assignedCity: { $regex: new RegExp(admin.assignedCity, "i") } },
          ],
        },
        {
          $or: [
            {
              "location.state": {
                $regex: new RegExp(admin.assignedState, "i"),
              },
            },
            { assignedState: { $regex: new RegExp(admin.assignedState, "i") } },
          ],
        },
      ],
    });

    const pendingComplaints = await Complaint.countDocuments({
      status: "pending",
      $and: [
        {
          $or: [
            {
              "location.city": { $regex: new RegExp(admin.assignedCity, "i") },
            },
            { assignedCity: { $regex: new RegExp(admin.assignedCity, "i") } },
          ],
        },
        {
          $or: [
            {
              "location.state": {
                $regex: new RegExp(admin.assignedState, "i"),
              },
            },
            { assignedState: { $regex: new RegExp(admin.assignedState, "i") } },
          ],
        },
      ],
    });

    const inProgressComplaints = await Complaint.countDocuments({
      status: "in_progress",
      $and: [
        {
          $or: [
            {
              "location.city": { $regex: new RegExp(admin.assignedCity, "i") },
            },
            { assignedCity: { $regex: new RegExp(admin.assignedCity, "i") } },
          ],
        },
        {
          $or: [
            {
              "location.state": {
                $regex: new RegExp(admin.assignedState, "i"),
              },
            },
            { assignedState: { $regex: new RegExp(admin.assignedState, "i") } },
          ],
        },
      ],
    });

    const resolvedComplaints = await Complaint.countDocuments({
      status: "resolved",
      $and: [
        {
          $or: [
            {
              "location.city": { $regex: new RegExp(admin.assignedCity, "i") },
            },
            { assignedCity: { $regex: new RegExp(admin.assignedCity, "i") } },
          ],
        },
        {
          $or: [
            {
              "location.state": {
                $regex: new RegExp(admin.assignedState, "i"),
              },
            },
            { assignedState: { $regex: new RegExp(admin.assignedState, "i") } },
          ],
        },
      ],
    });

    const rejectedComplaints = await Complaint.countDocuments({
      status: "rejected",
      $and: [
        {
          $or: [
            {
              "location.city": { $regex: new RegExp(admin.assignedCity, "i") },
            },
            { assignedCity: { $regex: new RegExp(admin.assignedCity, "i") } },
          ],
        },
        {
          $or: [
            {
              "location.state": {
                $regex: new RegExp(admin.assignedState, "i"),
              },
            },
            { assignedState: { $regex: new RegExp(admin.assignedState, "i") } },
          ],
        },
      ],
    });

    // Get department stats
    const activeDepartments = await Department.countDocuments({
      isActive: true,
      $or: [
        { assignedCity: { $regex: new RegExp(admin.assignedCity, "i") } },
        { assignedState: { $regex: new RegExp(admin.assignedState, "i") } },
      ],
    });

    res.json({
      stats: {
        total: totalComplaints,
        pending: pendingComplaints,
        in_progress: inProgressComplaints,
        resolved: resolvedComplaints,
        rejected: rejectedComplaints,
        departments: activeDepartments,
      },
      admin: {
        name: admin.name,
        city: admin.assignedCity,
        state: admin.assignedState,
      },
    });
  } catch (error) {
    console.error("Admin stats fetch error:", error);
    res.status(500).json({ error: "Server error", details: error?.message });
  }
});

// Approve complaint (admin only) - new workflow
router.put("/complaints/:id/approve", authenticateAdmin, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { comment } = req.body; // Optional admin comment

    // Find admin
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Find complaint (only if it's in admin's city AND not already approved)
    const Complaint = require("../models/Complaint");
    const complaint = await Complaint.findOne({
      _id: complaintId,
      "location.city": { $regex: new RegExp(`^${admin.assignedCity}$`, "i") },
      "location.state": { $regex: new RegExp(`^${admin.assignedState}$`, "i") },
      status: "pending", // Only pending complaints can be approved
    });

    if (!complaint) {
      return res.status(404).json({
        error: "Complaint not found, not in your city, or already processed",
      });
    }

    // Store old status for notifications
    const oldStatus = complaint.status;

    // Approve complaint - automatically set to in_progress
    complaint.status = "in_progress";
    complaint.updatedAt = new Date();
    
    // Add admin comment if provided
    if (comment) {
      if (!complaint.messages) {
        complaint.messages = [];
      }
      complaint.messages.push({
        sender: "admin",
        text: comment,
        createdAt: new Date(),
      });
    }

    // Try to automatically assign to appropriate department if not already assigned
    let assignedDepartment = null;
    try {
      const departmentDetectionService = require("../services/departmentDetectionService");
      
      if (departmentDetectionService && !complaint.assignedDepartment) {
        const complaintData = {
          description: complaint.description,
          priority: complaint.priority,
          location: {
            city: complaint.location.city,
            state: complaint.location.state,
            district: complaint.location.district,
          },
        };

        const departmentRouting = await departmentDetectionService.routeComplaintToDepartment(complaintData);
        
        if (departmentRouting.success && departmentRouting.assignedDepartment) {
          assignedDepartment = departmentRouting.assignedDepartment;
          complaint.assignedDepartment = assignedDepartment._id;
          complaint.departmentRouting = {
            detectedDepartment: departmentRouting.detectedDepartment,
            confidence: departmentRouting.confidence,
            reasoning: departmentRouting.reasoning,
            analysisMethod: departmentRouting.analysis_method,
            isFallback: departmentRouting.is_fallback || false,
          };
          console.log(`Complaint approved and automatically assigned to department: ${assignedDepartment.name}`);
        }
      }
    } catch (error) {
      console.error("Failed to auto-assign department after approval:", error);
      // Continue without auto-assignment if it fails
    }

    await complaint.save();

    // Send notification to user about approval
    try {
      const notificationService = require("../services/notificationService");
      await notificationService.sendStatusUpdateNotification(
        complaint,
        oldStatus,
        "in_progress",
        admin.name,
        "Admin approved your complaint"
      );
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }

    // Award points to user for complaint approval
    try {
      const User = require("../models/User");
      const user = await User.findById(complaint.userId);
      if (user) {
        user.points = (user.points || 0) + 5;
        if (!user.pointsHistory) {
          user.pointsHistory = [];
        }
        user.pointsHistory.push({
          points: 5,
          reason: "Complaint approved by admin",
          complaintId: complaint._id,
          awardedAt: new Date(),
        });
        await user.save();
        console.log(`Awarded 5 points to user for complaint approval`);
      }
    } catch (pointsError) {
      console.error("Failed to award points:", pointsError);
    }

    // Initialize chat for approved complaint
    try {
      const Chat = require("../models/Chat");
      
      // Check if chat already exists
      let chat = await Chat.findOne({ complaintId: complaint._id });

      if (!chat) {
        // Create new chat with all participants
        const participants = [];

        // Add user
        if (complaint.userId) {
          participants.push({
            participantId: complaint.userId,
            participantModel: 'User',
            participantName: 'User', // Will be populated later
            participantRole: 'user'
          });
        }

        // Add admin
        participants.push({
          participantId: admin._id,
          participantModel: 'Admin',
          participantName: admin.name,
          participantRole: 'admin'
        });

        // Add department if assigned
        if (assignedDepartment) {
          participants.push({
            participantId: assignedDepartment._id,
            participantModel: 'Department',
            participantName: assignedDepartment.name,
            participantRole: 'department'
          });
        }

        chat = new Chat({
          complaintId: complaint._id,
          participants
        });

        await chat.save();
        console.log(`Chat initialized for complaint ${complaint._id}`);
      }
    } catch (chatError) {
      console.error("Failed to initialize chat:", chatError);
      // Don't fail the request if chat initialization fails
    }

    res.json({
      message: "Complaint approved successfully and status changed to in-progress",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        updatedAt: complaint.updatedAt,
        assignedDepartment: assignedDepartment ? {
          id: assignedDepartment._id,
          name: assignedDepartment.name,
          departmentType: assignedDepartment.departmentType
        } : null,
      },
      pointsAwarded: 5,
      notificationSent: true,
      autoAssigned: !!assignedDepartment,
    });
  } catch (error) {
    console.error("Approve complaint error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Reject complaint (admin only)
router.put("/complaints/:id/reject", authenticateAdmin, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { reason } = req.body; // Required rejection reason

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    // Find admin
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    // Find complaint (only if it's in admin's city AND pending)
    const Complaint = require("../models/Complaint");
    const complaint = await Complaint.findOne({
      _id: complaintId,
      "location.city": { $regex: new RegExp(`^${admin.assignedCity}$`, "i") },
      "location.state": { $regex: new RegExp(`^${admin.assignedState}$`, "i") },
      status: "pending",
    });

    if (!complaint) {
      return res.status(404).json({
        error: "Complaint not found, not in your city, or already processed",
      });
    }

    // Set complaint status to rejected
    complaint.status = "rejected";
    complaint.rejectionReason = reason; // Save rejection reason
    
    // Add rejection message
    if (!complaint.messages) {
      complaint.messages = [];
    }
    complaint.messages.push({
      sender: "admin",
      text: `Complaint rejected: ${reason}`,
      createdAt: new Date(),
    });

    complaint.updatedAt = new Date();
    await complaint.save();

    // Send notification to user about rejection
    try {
      const notificationService = require("../services/notificationService");
      await notificationService.sendStatusUpdateNotification(
        complaint,
        "pending",
        "rejected",
        admin.name
      );
    } catch (notifError) {
      console.error("Failed to send notification:", notifError);
    }

    res.json({
      message: "Complaint rejected successfully",
      complaint: {
        id: complaint._id,
        status: complaint.status,
        updatedAt: complaint.updatedAt,
      },
      notificationSent: true,
    });
  } catch (error) {
    console.error("Reject complaint error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get complaint workflow information
router.get("/workflow", authenticateAdmin, async (req, res) => {
  try {
    res.json({
      workflow: {
        title: "Civic Sense Complaint Management Workflow",
        description: "Updated complaint processing system with admin approval and department routing",
        steps: [
          {
            step: 1,
            title: "Complaint Submission",
            description: "User submits complaint with location, image, and description",
            status: "pending",
            actor: "User",
            outcome: "Complaint created in pending status"
          },
          {
            step: 2, 
            title: "AI Department Detection",
            description: "System uses AI to detect appropriate department based on complaint content",
            status: "pending",
            actor: "AI System", 
            outcome: "Department pre-assigned but complaint remains pending admin approval"
          },
          {
            step: 3,
            title: "Admin Review & Approval",
            description: "City admin reviews complaint and decides to approve or reject",
            status: "pending → in_progress",
            actor: "City Admin",
            outcome: "If approved: status changes to in_progress, complaint forwarded to department"
          },
          {
            step: 4,
            title: "Department Processing", 
            description: "Assigned department works on resolving the complaint",
            status: "in_progress",
            actor: "Department",
            outcome: "Department investigates and takes action"
          },
          {
            step: 5,
            title: "Resolution",
            description: "Department marks complaint as resolved with comments",
            status: "in_progress → resolved", 
            actor: "Department",
            outcome: "Complaint closed, user notified, points awarded"
          }
        ],
        roles: {
          user: {
            permissions: ["Create complaints", "View own complaints", "Add comments", "Vote on community complaints"],
            restrictions: ["Cannot change status", "Cannot assign departments"]
          },
          admin: {
            permissions: ["View city complaints", "Approve/Reject pending complaints", "View all complaint details"],
            restrictions: ["Cannot resolve complaints", "Cannot directly change to resolved status"]
          },
          department: {
            permissions: ["View assigned complaints", "Resolve in-progress complaints", "Add department comments"],
            restrictions: ["Cannot approve pending complaints", "Can only resolve complaints assigned to them"]
          }
        },
        statusFlow: {
          pending: {
            description: "New complaint awaiting admin approval",
            nextStates: ["in_progress (via admin approval)", "pending (via admin rejection)"],
            allowedActions: ["Admin approve", "Admin reject"]
          },
          in_progress: {
            description: "Approved complaint being processed by department", 
            nextStates: ["resolved (via department resolution)"],
            allowedActions: ["Department resolve"]
          },
          resolved: {
            description: "Complaint completed by department",
            nextStates: [],
            allowedActions: ["View only"]
          }
        }
      }
    });
  } catch (error) {
    console.error("Get workflow error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get department-wise analytics data
router.get("/analytics", async (req, res) => {
  try {
    // Token verification
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Access denied" });
    }

    req.admin = decoded;

    // Get admin info to filter by city/state
    const admin = await Admin.findById(req.admin.id);
    if (!admin || !admin.isActive) {
      return res.status(404).json({ error: "Admin not found or inactive" });
    }

    const Complaint = require("../models/Complaint");
    const Department = require("../models/Department");

    // Get all departments for this admin's city/state
    const departments = await Department.find({
      assignedCity: admin.assignedCity,
      assignedState: admin.assignedState,
      isActive: true
    });

    const departmentAnalytics = [];

    // Calculate analytics for each department
    for (const department of departments) {
      const complaints = await Complaint.find({
        assignedDepartment: department._id,
        assignedCity: admin.assignedCity,
        assignedState: admin.assignedState
      });

      // Calculate daily complaints for the last 30 days
      const dailyComplaints = {};
      const responseTimeSum = [];
      const resolveTimeSum = [];
      const currentDate = new Date();

      // Initialize last 30 days with 0
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(currentDate.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dailyComplaints[dateStr] = 0;
      }

      // Process each complaint
      complaints.forEach(complaint => {
        const createdDate = new Date(complaint.createdAt);
        const dateStr = createdDate.toISOString().split('T')[0];
        
        if (dailyComplaints.hasOwnProperty(dateStr)) {
          dailyComplaints[dateStr]++;
        }

        // Calculate response time (from creation to assignment)
        if (complaint.assignedAt) {
          const responseTime = (new Date(complaint.assignedAt) - new Date(complaint.createdAt)) / (1000 * 60 * 60); // hours
          responseTimeSum.push(responseTime);
        }

        // Calculate resolve time (from assignment to resolution)
        if (complaint.status === 'resolved' && complaint.assignedAt && complaint.updatedAt) {
          const resolveTime = (new Date(complaint.updatedAt) - new Date(complaint.assignedAt)) / (1000 * 60 * 60); // hours
          resolveTimeSum.push(resolveTime);
        }
      });

      // Calculate averages
      const avgResponseTime = responseTimeSum.length > 0 
        ? responseTimeSum.reduce((a, b) => a + b, 0) / responseTimeSum.length 
        : 0;
      
      const avgResolveTime = resolveTimeSum.length > 0 
        ? resolveTimeSum.reduce((a, b) => a + b, 0) / resolveTimeSum.length 
        : 0;

      // Status breakdown
      const statusBreakdown = {
        pending: complaints.filter(c => c.status === 'pending').length,
        in_progress: complaints.filter(c => c.status === 'in_progress').length,
        resolved: complaints.filter(c => c.status === 'resolved').length,
        rejected: complaints.filter(c => c.status === 'rejected').length
      };

      departmentAnalytics.push({
        department: {
          _id: department._id,
          name: department.name,
          departmentType: department.departmentType,
          email: department.email,
          contactNumber: department.contactNumber,
          headOfDepartment: department.headOfDepartment
        },
        metrics: {
          totalComplaints: complaints.length,
          avgResponseTime: parseFloat(avgResponseTime.toFixed(2)),
          avgResolveTime: parseFloat(avgResolveTime.toFixed(2)),
          statusBreakdown,
          dailyComplaints: Object.entries(dailyComplaints).map(([date, count]) => ({
            date,
            count
          }))
        }
      });
    }

    res.json({
      success: true,
      data: {
        totalDepartments: departments.length,
        city: admin.assignedCity,
        state: admin.assignedState,
        departmentAnalytics
      }
    });

  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Give warning to user
router.post("/give-warning/:userId", authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, complaintId, notes } = req.body;
    const adminId = req.admin.id;

    console.log(`[ADMIN-WARNING] Admin ${adminId} giving warning to user ${userId}`);

    if (!reason) {
      return res.status(400).json({
        error: "Warning reason is required"
      });
    }

    const User = require("../models/User");
    const Complaint = require("../models/Complaint");

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Add warning to user
    user.warnings.count += 1;
    user.warnings.history.push({
      reason: reason,
      complaintId: complaintId || null,
      givenBy: adminId,
      givenAt: new Date(),
      acknowledged: false
    });

    // Update account status
    if (user.warnings.count >= 3) {
      user.accountStatus = 'warned';
    }

    await user.save();

    // If complaint ID provided, add admin action and reject the complaint
    if (complaintId) {
      const complaint = await Complaint.findById(complaintId);
      if (complaint) {
        // Add admin action
        complaint.adminActions.push({
          actionType: 'warning',
          reason: reason,
          adminId: adminId,
          actionDate: new Date(),
          notes: notes
        });
        
        // Automatically reject the complaint with warning reason
        complaint.status = 'rejected';
        complaint.rejectedBy = adminId;
        complaint.rejectedAt = new Date();
        complaint.rejectionReason = 'Warning Given';
        complaint.adminComment = `Complaint rejected due to warning given to user. Warning reason: ${reason}${notes ? `. Notes: ${notes}` : ''}`;
        
        await complaint.save();
        console.log(`[ADMIN-WARNING] Complaint ${complaintId} automatically rejected due to warning`);
      }
    }

    console.log(`[ADMIN-WARNING] Warning given successfully. User now has ${user.warnings.count} warnings`);

    res.json({
      success: true,
      message: "Warning given successfully",
      warningCount: user.warnings.count,
      accountStatus: user.accountStatus
    });

  } catch (error) {
    console.error("Give warning error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// Blacklist user
router.post("/blacklist-user/:userId", authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, notes } = req.body;
    const adminId = req.admin.id;

    console.log(`[ADMIN-BLACKLIST] Admin ${adminId} blacklisting user ${userId}`);

    if (!reason) {
      return res.status(400).json({
        error: "Blacklist reason is required"
      });
    }

    const User = require("../models/User");

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    // Blacklist user
    user.isBlacklisted = true;
    user.blacklistReason = reason;
    user.blacklistedBy = adminId;
    user.blacklistedAt = new Date();
    user.accountStatus = 'blacklisted';

    await user.save();

    console.log(`[ADMIN-BLACKLIST] User ${userId} blacklisted successfully`);

    res.json({
      success: true,
      message: "User blacklisted successfully",
      accountStatus: user.accountStatus
    });

  } catch (error) {
    console.error("Blacklist user error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// Get user warnings history
router.get("/user-warnings/:userId", authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const User = require("../models/User");
    const user = await User.findById(userId)
      .populate('warnings.history.givenBy', 'name email')
      .populate('warnings.history.complaintId', 'description createdAt')
      .select('warnings accountStatus isBlacklisted blacklistReason blacklistedAt');

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.json({
      success: true,
      warningCount: user.warnings.count,
      accountStatus: user.accountStatus,
      isBlacklisted: user.isBlacklisted,
      blacklistReason: user.blacklistReason,
      blacklistedAt: user.blacklistedAt,
      warningHistory: user.warnings.history
    });

  } catch (error) {
    console.error("Get user warnings error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

// Get user by phone number
router.get("/user-by-phone/:phone", authenticateAdmin, async (req, res) => {
  try {
    const { phone } = req.params;

    console.log(`[ADMIN-USER-LOOKUP] Admin ${req.admin.id} looking up user by phone: ${phone}`);

    const User = require("../models/User");
    
    // Find user by phone number
    const user = await User.findOne({ phone: phone });
    
    if (!user) {
      return res.status(404).json({
        error: "User not found with this phone number"
      });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        warnings: user.warnings,
        accountStatus: user.accountStatus,
        isBlacklisted: user.isBlacklisted
      }
    });

  } catch (error) {
    console.error("Get user by phone error:", error);
    res.status(500).json({
      error: "Internal server error"
    });
  }
});

module.exports = router;
