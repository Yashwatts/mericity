const mongoose = require("mongoose");

const UserRedemptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reward",
      required: true,
    },
    pointsDeducted: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "completed", "cancelled"],
      default: "pending",
    },
    redemptionCode: {
      type: String,
      unique: true,
      required: true,
    },
    redeemedAt: {
      type: Date,
      default: Date.now,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    // Additional details for different types of rewards
    deliveryAddress: {
      type: String,
      default: "",
    },
    contactPhone: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Generate unique redemption code
UserRedemptionSchema.pre("save", function (next) {
  if (!this.redemptionCode) {
    this.redemptionCode =
      "RDM" +
      Date.now() +
      Math.random().toString(36).substr(2, 5).toUpperCase();
  }
  next();
});

module.exports = mongoose.model("UserRedemption", UserRedemptionSchema);
