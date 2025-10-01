const express = require("express");
const router = express.Router();
const Reward = require("../models/Reward");
const UserRedemption = require("../models/UserRedemption");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const emailService = require("../services/emailService");

// Get all available rewards
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all active rewards
    const rewards = await Reward.find({ isActive: true }).sort({
      pointsRequired: 1,
    });

    // Get user's redemption history to check limits
    const userRedemptions = await UserRedemption.find({
      user: userId,
    }).populate("reward");

    // Process rewards to add availability info
    const processedRewards = rewards.map((reward) => {
      const userRedemptionCount = userRedemptions.filter(
        (redemption) =>
          redemption.reward._id.toString() === reward._id.toString()
      ).length;

      const canRedeem =
        reward.isAvailable() &&
        user.points >= reward.pointsRequired &&
        userRedemptionCount < reward.maxRedemptionsPerUser;

      return {
        ...reward.toObject(),
        canRedeem,
        userRedemptionCount,
        userPoints: user.points,
      };
    });

    res.json({
      success: true,
      rewards: processedRewards,
      userPoints: user.points,
    });
  } catch (error) {
    console.error("Error fetching rewards:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Redeem a reward
router.post("/redeem/:rewardId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const rewardId = req.params.rewardId;
    const { deliveryAddress, contactPhone, notes, sendEmail } = req.body;

    // Get user and reward
    const user = await User.findById(userId);
    const reward = await Reward.findById(rewardId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!reward) {
      return res.status(404).json({ message: "Reward not found" });
    }

    // Check if reward is available
    if (!reward.isAvailable()) {
      return res
        .status(400)
        .json({ message: "Reward is not currently available" });
    }

    // Check if user has enough points
    if (user.points < reward.pointsRequired) {
      return res.status(400).json({
        message: `Insufficient points. You need ${reward.pointsRequired} points but have only ${user.points} points.`,
      });
    }

    // Check user redemption limit for this reward
    const userRedemptionCount = await UserRedemption.countDocuments({
      user: userId,
      reward: rewardId,
    });

    if (userRedemptionCount >= reward.maxRedemptionsPerUser) {
      return res.status(400).json({
        message:
          "You have reached the maximum redemption limit for this reward",
      });
    }

    // Generate coupon details
    const couponCode = "CPN" + Date.now() + Math.random().toString(36).substr(2, 6).toUpperCase();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now

    // Create redemption record
    const redemption = new UserRedemption({
      user: userId,
      reward: rewardId,
      pointsDeducted: reward.pointsRequired,
      deliveryAddress: deliveryAddress || "",
      contactPhone: contactPhone || "",
      notes: notes || "",
      redemptionCode: couponCode,
    });

    await redemption.save();

    // Deduct points from user
    user.points -= reward.pointsRequired;

    // Add to points history
    user.pointsHistory.push({
      points: -reward.pointsRequired,
      reason: `Redeemed reward: ${reward.title}`,
      date: new Date(),
      type: "redemption",
      redemption: redemption._id,
    });

    await user.save();

    // Update reward redemption count
    reward.totalRedeemed += 1;
    await reward.save();

    // Populate reward details for response
    await redemption.populate("reward");

    // Prepare response with coupon details
    const responseData = {
      success: true,
      message: "Reward redeemed successfully!",
      redemption: redemption,
      remainingPoints: user.points,
    };

    // Add coupon details if requested
    if (sendEmail) {
      responseData.couponDetails = {
        couponCode: couponCode,
        expiryDate: expiryDate,
      };

      // Send email with coupon details
      try {
        const emailResult = await emailService.sendCouponEmail(
          user.email,
          user.name,
          { couponCode, expiryDate },
          reward.title
        );
        
        if (emailResult.success) {
          console.log(`✅ Email sent successfully to ${user.email}`);
          responseData.emailSent = true;
        } else {
          console.log(`❌ Failed to send email to ${user.email}:`, emailResult.error);
          responseData.emailSent = false;
          responseData.emailError = emailResult.error;
        }
      } catch (emailError) {
        console.error('❌ Email service error:', emailError);
        responseData.emailSent = false;
        responseData.emailError = emailError.message;
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error("Error redeeming reward:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get user's redemption history
router.get("/my-redemptions", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const redemptions = await UserRedemption.find({ user: userId })
      .populate("reward")
      .sort({ redeemedAt: -1 });

    res.json({
      success: true,
      redemptions,
    });
  } catch (error) {
    console.error("Error fetching user redemptions:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Get redemption details by code
router.get("/redemption/:code", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const redemptionCode = req.params.code;

    const redemption = await UserRedemption.findOne({
      redemptionCode,
      user: userId,
    }).populate("reward");

    if (!redemption) {
      return res.status(404).json({ message: "Redemption not found" });
    }

    res.json({
      success: true,
      redemption,
    });
  } catch (error) {
    console.error("Error fetching redemption:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Test email service
router.post("/test-email", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Test email connection
    const connectionTest = await emailService.testConnection();
    
    if (!connectionTest) {
      return res.status(500).json({ 
        message: "Email service configuration error",
        success: false 
      });
    }

    // Send test email
    const testEmailResult = await emailService.sendCouponEmail(
      user.email,
      user.name,
      {
        couponCode: "TEST123456",
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      },
      "Test Reward"
    );

    res.json({
      success: testEmailResult.success,
      message: testEmailResult.success 
        ? "Test email sent successfully!" 
        : "Failed to send test email",
      error: testEmailResult.error || null
    });

  } catch (error) {
    console.error("Error testing email:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
