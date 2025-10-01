const mongoose = require("mongoose");
require("dotenv").config();

const Reward = require("./models/Reward");

const seedRewards = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Clear existing rewards
    await Reward.deleteMany({});

    const sampleRewards = [
      {
        title: "Free Bus Ticket",
        description: "Get a free local bus ticket for city transportation",
        category: "transport",
        pointsRequired: 50,
        icon: "bus",
        color: "#10B981",
        maxRedemptionsPerUser: 2,
        totalAvailable: 100,
        terms: "Valid for local city buses only. Cannot be transferred.",
      },
      {
        title: "Free Rashan Package",
        description: "Basic food package including rice, dal, and essentials",
        category: "food",
        pointsRequired: 100,
        icon: "shopping-bag",
        color: "#F59E0B",
        maxRedemptionsPerUser: 1,
        totalAvailable: 50,
        terms: "Package includes 5kg rice, 2kg dal, and other essentials.",
      },
      {
        title: "Metro Card Recharge",
        description: "₹100 recharge for your metro travel card",
        category: "transport",
        pointsRequired: 150,
        icon: "credit-card",
        color: "#3B82F6",
        maxRedemptionsPerUser: 2,
        totalAvailable: 200,
        terms:
          "Valid for metro services. Recharge will be done within 48 hours.",
      },
      {
        title: "Free Health Checkup",
        description: "Basic health checkup at government health center",
        category: "healthcare",
        pointsRequired: 200,
        icon: "heart",
        color: "#EF4444",
        maxRedemptionsPerUser: 1,
        totalAvailable: 30,
        terms: "Includes basic tests and consultation. Appointment required.",
      },
      {
        title: "Movie Ticket",
        description: "Free movie ticket for local cinema halls",
        category: "entertainment",
        pointsRequired: 75,
        icon: "film",
        color: "#8B5CF6",
        maxRedemptionsPerUser: 3,
        totalAvailable: 100,
        terms: "Valid for selected shows. Subject to availability.",
      },
      {
        title: "Library Membership",
        description: "6-month membership at public library",
        category: "education",
        pointsRequired: 125,
        icon: "book",
        color: "#06B6D4",
        maxRedemptionsPerUser: 1,
        totalAvailable: 25,
        terms: "Includes book borrowing and reading room access.",
      },
      {
        title: "Water Bill Discount",
        description: "20% discount on next water bill payment",
        category: "utility",
        pointsRequired: 80,
        icon: "droplet",
        color: "#0EA5E9",
        maxRedemptionsPerUser: 2,
        totalAvailable: 150,
        terms: "Discount applied to next bill. Maximum discount ₹500.",
      },
      {
        title: "Cooking Gas Subsidy",
        description: "Additional subsidy on LPG cylinder booking",
        category: "utility",
        pointsRequired: 250,
        icon: "flame",
        color: "#F97316",
        maxRedemptionsPerUser: 1,
        totalAvailable: 75,
        terms: "₹200 additional subsidy. Valid for registered connections.",
      },
    ];

    await Reward.insertMany(sampleRewards);
    console.log(`✅ Successfully seeded ${sampleRewards.length} rewards`);

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding rewards:", error);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  seedRewards();
}

module.exports = seedRewards;
