const mongoose = require("mongoose");

const RewardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "transport",
        "food",
        "utility",
        "entertainment",
        "healthcare",
        "education",
      ],
      default: "utility",
    },
    pointsRequired: {
      type: Number,
      required: true,
      min: 0,
    },
    icon: {
      type: String,
      required: true,
      default: "gift",
    },
    color: {
      type: String,
      default: "#3B82F6",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    maxRedemptionsPerUser: {
      type: Number,
      default: 1, // How many times a user can redeem this reward
    },
    totalAvailable: {
      type: Number,
      default: -1, // -1 means unlimited, positive number means limited quantity
    },
    totalRedeemed: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null, // null means no expiry
    },
    terms: {
      type: String,
      default: "Terms and conditions apply.",
    },
  },
  {
    timestamps: true,
  }
);

// Check if reward is available
RewardSchema.methods.isAvailable = function () {
  const now = new Date();

  if (!this.isActive) return false;
  if (this.validFrom > now) return false;
  if (this.validUntil && this.validUntil < now) return false;
  if (this.totalAvailable > 0 && this.totalRedeemed >= this.totalAvailable)
    return false;

  return true;
};

module.exports = mongoose.model("Reward", RewardSchema);
