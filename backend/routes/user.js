const express = require("express");
const bcrypt = require("bcryptjs");
const fetch = require("node-fetch");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

router.post("/complete", auth, async (req, res) => {
  try {
    const { name, phone, address, city, state, district } = req.body;
    
    // Fetch the actual user document from the database
    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // Check if phone number is already taken by another user
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ error: "Phone number already in use" });
      }
    }
    
    // Update user fields
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (city) user.city = city;
    if (state) user.state = state;
    if (district) user.district = district;
    user.profileComplete = true;
    
    await user.save();
    res.json({ success: true, user });
  } catch (error) {
    console.error("Error completing user profile:", error);
    // Log the full error for debugging
    console.error("Full error details:", error);
    res.status(500).json({ error: "Server error while completing profile" });
  }
});

// Get current user info (for forms)
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      phone: user.phone || "",
      name: user.name || "",
      email: user.email || "",
      city: user.city || "",
      state: user.state || "",
    });
  } catch (error) {
    console.error("Error fetching user info:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    console.log("Fetching profile for user ID:", req.user._id || req.user.id);
    const user = await User.findById(req.user._id || req.user.id).select("-password");
    if (!user) {
      console.log("User not found in database");
      return res.status(404).json({ error: "User not found" });
    }
    console.log("User profile data:", {
      name: user.name,
      email: user.email,
      city: user.city,
      state: user.state,
      phone: user.phone,
    });
    res.json({ user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Update user profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email, city, state, phone } = req.body;
    console.log("Updating profile for user ID:", req.user._id || req.user.id);
    console.log("Update data:", { name, email, city, state, phone });

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    // Check if phone is already taken by another user
    if (phone && phone !== user.phone) {
      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ error: "Phone number already in use" });
      }
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (city) user.city = city;
    if (state) user.state = state;
    if (phone) user.phone = phone;

    await user.save();

    const updatedUser = await User.findById(req.user._id || req.user.id).select("-password");
    console.log("Updated user data:", updatedUser);
    res.json({ message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: "Server error while updating profile" });
  }
});

// Change password
router.put("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters long" });
    }

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if user has a password (Google OAuth users might not have one)
    if (!user.password) {
      return res.status(400).json({
        error: "No password set. Please use Google sign-in or contact support.",
      });
    }

    // Check current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    user.password = hashedNewPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Pincode lookup endpoint
router.get("/pincode/:pincode", async (req, res) => {
  try {
    const { pincode } = req.params;

    // Validate pincode format
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        error: "Invalid pincode format. Please enter a 6-digit pincode.",
      });
    }

    // Fetch data from postal pincode API
    const response = await fetch(
      `https://api.postalpincode.in/pincode/${pincode}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
      const postOffice = data[0].PostOffice[0];
      res.json({
        success: true,
        data: {
          city: postOffice.District || "",
          state: postOffice.State || "",
          area: postOffice.Name || "",
          pincode: pincode,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        error: "Invalid pincode or no data found for this pincode",
      });
    }
  } catch (error) {
    console.error("Error fetching pincode data:", error);
    res.status(500).json({
      success: false,
      error:
        "Failed to fetch pincode data. Please try again or enter city and state manually.",
    });
  }
});

// Get user warnings and account status
router.get("/warnings", auth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId)
      .populate('warnings.history.complaintId', 'description createdAt')
      .select('warnings accountStatus isBlacklisted blacklistReason blacklistedAt');

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get unacknowledged warnings
    const unacknowledgedWarnings = user.warnings.history.filter(w => !w.acknowledged);

    res.json({
      success: true,
      warningCount: user.warnings.count,
      accountStatus: user.accountStatus,
      isBlacklisted: user.isBlacklisted,
      blacklistReason: user.blacklistReason,
      blacklistedAt: user.blacklistedAt,
      unacknowledgedWarnings,
      allWarnings: user.warnings.history
    });

  } catch (error) {
    console.error("Error fetching user warnings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Acknowledge warning
router.post("/acknowledge-warning/:warningId", auth, async (req, res) => {
  try {
    const { warningId } = req.params;
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Find and acknowledge the warning
    const warning = user.warnings.history.id(warningId);
    if (!warning) {
      return res.status(404).json({ error: "Warning not found" });
    }

    warning.acknowledged = true;
    await user.save();

    res.json({
      success: true,
      message: "Warning acknowledged"
    });

  } catch (error) {
    console.error("Error acknowledging warning:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
