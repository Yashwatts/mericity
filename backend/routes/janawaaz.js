const express = require("express");
const User = require("../models/User");
const Complaint = require("../models/Complaint");
const auth = require("../middleware/auth");
const router = express.Router();

// Get district-wise user rankings (Janawaaz leaderboard)
router.get("/district", auth, async (req, res) => {
  try {
    // Get current user to find their district/city
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.city) {
      return res.status(400).json({
        error:
          "Please complete your profile with city information to view district rankings",
      });
    }

    // Get top users from the same city/district
    const districtUsers = await User.find({
      city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
      points: { $gt: 0 }, // Only show users with points
    })
      .select("name city state district points pointsHistory")
      .sort({ points: -1 })
      .limit(20);

    // Add rank to each user
    const rankedUsers = districtUsers.map((user, index) => ({
      rank: index + 1,
      id: user._id,
      name: user.name,
      city: user.city,
      state: user.state,
      district: user.district,
      points: user.points,
      totalComplaints: user.pointsHistory ? user.pointsHistory.length : 0,
      isCurrentUser: user._id.toString() === req.user.id,
    }));

    // Find current user's rank if they're not in top 20
    let currentUserRank = null;
    const currentUserInTop20 = rankedUsers.find((user) => user.isCurrentUser);

    if (!currentUserInTop20 && currentUser.points > 0) {
      const higherRankedCount = await User.countDocuments({
        city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
        points: { $gt: currentUser.points },
      });
      currentUserRank = {
        rank: higherRankedCount + 1,
        id: currentUser._id,
        name: currentUser.name,
        city: currentUser.city,
        state: currentUser.state,
        district: currentUser.district,
        points: currentUser.points,
        totalComplaints: currentUser.pointsHistory
          ? currentUser.pointsHistory.length
          : 0,
        isCurrentUser: true,
      };
    }

    res.json({
      title: `${currentUser.city} District Rankings`,
      location: {
        city: currentUser.city,
        state: currentUser.state,
        district: currentUser.district,
      },
      rankings: rankedUsers,
      currentUserRank: currentUserRank,
      totalUsers: await User.countDocuments({
        city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
        points: { $gt: 0 },
      }),
    });
  } catch (error) {
    console.error("District rankings error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get state-wise user rankings
router.get("/state", auth, async (req, res) => {
  try {
    // Get current user to find their state
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.state) {
      return res.status(400).json({
        error:
          "Please complete your profile with state information to view state rankings",
      });
    }

    // Get top users from the same state
    const stateUsers = await User.find({
      state: { $regex: new RegExp(`^${currentUser.state}$`, "i") },
      points: { $gt: 0 }, // Only show users with points
    })
      .select("name city state district points pointsHistory")
      .sort({ points: -1 })
      .limit(50);

    // Add rank to each user
    const rankedUsers = stateUsers.map((user, index) => ({
      rank: index + 1,
      id: user._id,
      name: user.name,
      city: user.city,
      state: user.state,
      district: user.district,
      points: user.points,
      totalComplaints: user.pointsHistory ? user.pointsHistory.length : 0,
      isCurrentUser: user._id.toString() === req.user.id,
    }));

    // Find current user's rank if they're not in top 50
    let currentUserRank = null;
    const currentUserInTop50 = rankedUsers.find((user) => user.isCurrentUser);

    if (!currentUserInTop50 && currentUser.points > 0) {
      const higherRankedCount = await User.countDocuments({
        state: { $regex: new RegExp(`^${currentUser.state}$`, "i") },
        points: { $gt: currentUser.points },
      });
      currentUserRank = {
        rank: higherRankedCount + 1,
        id: currentUser._id,
        name: currentUser.name,
        city: currentUser.city,
        state: currentUser.state,
        district: currentUser.district,
        points: currentUser.points,
        totalComplaints: currentUser.pointsHistory
          ? currentUser.pointsHistory.length
          : 0,
        isCurrentUser: true,
      };
    }

    res.json({
      title: `${currentUser.state} State Rankings`,
      location: {
        city: currentUser.city,
        state: currentUser.state,
        district: currentUser.district,
      },
      rankings: rankedUsers,
      currentUserRank: currentUserRank,
      totalUsers: await User.countDocuments({
        state: { $regex: new RegExp(`^${currentUser.state}$`, "i") },
        points: { $gt: 0 },
      }),
    });
  } catch (error) {
    console.error("State rankings error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get user's point history
router.get("/my-points", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate("pointsHistory.complaintId", "description status createdAt")
      .select("name city state district points pointsHistory");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Sort point history by date (newest first)
    const sortedHistory = user.pointsHistory
      ? user.pointsHistory.sort(
          (a, b) => new Date(b.awardedAt) - new Date(a.awardedAt)
        )
      : [];

    res.json({
      user: {
        name: user.name,
        city: user.city,
        state: user.state,
        district: user.district,
        totalPoints: user.points,
      },
      pointsHistory: sortedHistory.map((entry) => ({
        points: entry.points,
        reason: entry.reason,
        awardedAt: entry.awardedAt,
        complaint: entry.complaintId
          ? {
              id: entry.complaintId._id,
              description:
                entry.complaintId.description.substring(0, 100) + "...",
              status: entry.complaintId.status,
              createdAt: entry.complaintId.createdAt,
            }
          : null,
      })),
      summary: {
        totalEntries: sortedHistory.length,
        totalPoints: user.points,
        averagePointsPerComplaint:
          sortedHistory.length > 0
            ? Math.round(user.points / sortedHistory.length)
            : 0,
      },
    });
  } catch (error) {
    console.error("Get user points error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get general statistics for Janawaaz
router.get("/stats", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    // Get district stats
    const districtStats = await User.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
          points: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalPoints: { $sum: "$points" },
          averagePoints: { $avg: "$points" },
        },
      },
    ]);

    // Get state stats
    const stateStats = await User.aggregate([
      {
        $match: {
          state: { $regex: new RegExp(`^${currentUser.state}$`, "i") },
          points: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalPoints: { $sum: "$points" },
          averagePoints: { $avg: "$points" },
        },
      },
    ]);

    // Get top performers
    const topDistrict = await User.find({
      city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
      points: { $gt: 0 },
    })
      .select("name points")
      .sort({ points: -1 })
      .limit(3);

    const topState = await User.find({
      state: { $regex: new RegExp(`^${currentUser.state}$`, "i") },
      points: { $gt: 0 },
    })
      .select("name city points")
      .sort({ points: -1 })
      .limit(3);

    res.json({
      district: {
        name: currentUser.city,
        stats: districtStats[0] || {
          totalUsers: 0,
          totalPoints: 0,
          averagePoints: 0,
        },
        topPerformers: topDistrict,
      },
      state: {
        name: currentUser.state,
        stats: stateStats[0] || {
          totalUsers: 0,
          totalPoints: 0,
          averagePoints: 0,
        },
        topPerformers: topState,
      },
      currentUser: {
        points: currentUser.points,
        name: currentUser.name,
      },
    });
  } catch (error) {
    console.error("Get Janawaaz stats error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get analytics data for charts and graphs
router.get("/analytics", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);

    // Points distribution in district
    const pointsDistribution = await User.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
          points: { $gt: 0 },
        },
      },
      {
        $bucket: {
          groupBy: "$points",
          boundaries: [0, 10, 25, 50, 100, 200, Infinity],
          default: "Other",
          output: {
            count: { $sum: 1 },
            users: { $push: { name: "$name", points: "$points" } },
          },
        },
      },
    ]);

    // Monthly points trend for current user (IST timezone)
    const currentTime = new Date();
    const istCurrentTime = new Date(
      currentTime.getTime() + 5.5 * 60 * 60 * 1000
    );

    const monthlyTrend = await User.aggregate([
      {
        $match: { _id: currentUser._id },
      },
      {
        $unwind: "$pointsHistory",
      },
      {
        $addFields: {
          // Convert to IST (UTC + 5:30)
          istDate: {
            $dateAdd: {
              startDate: "$pointsHistory.awardedAt",
              unit: "hour",
              amount: 5,
            },
          },
        },
      },
      {
        $addFields: {
          istDateWithMinutes: {
            $dateAdd: {
              startDate: "$istDate",
              unit: "minute",
              amount: 30,
            },
          },
        },
      },
      {
        $match: {
          // Only include data up to current date in IST
          istDateWithMinutes: { $lte: istCurrentTime },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$istDateWithMinutes" },
            month: { $month: "$istDateWithMinutes" },
            day: { $dayOfMonth: "$istDateWithMinutes" },
          },
          totalPoints: { $sum: "$pointsHistory.points" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
      {
        $limit: 30, // Last 30 days
      },
    ]);

    // Daily complaints filed for current user (IST timezone)
    const Complaint = require("../models/Complaint");
    const dailyComplaints = await Complaint.aggregate([
      {
        $match: { userId: currentUser._id },
      },
      {
        $addFields: {
          // Convert to IST (UTC + 5:30)
          istDate: {
            $dateAdd: {
              startDate: "$createdAt",
              unit: "hour",
              amount: 5,
            },
          },
        },
      },
      {
        $addFields: {
          istDateWithMinutes: {
            $dateAdd: {
              startDate: "$istDate",
              unit: "minute",
              amount: 30,
            },
          },
        },
      },
      {
        $match: {
          // Only include data up to current date in IST
          istDateWithMinutes: { $lte: istCurrentTime },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$istDateWithMinutes" },
            month: { $month: "$istDateWithMinutes" },
            day: { $dayOfMonth: "$istDateWithMinutes" },
          },
          complaintsCount: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 },
      },
      {
        $limit: 30, // Last 30 days
      },
    ]);

    // Top cities in state comparison
    const cityComparison = await User.aggregate([
      {
        $match: {
          state: { $regex: new RegExp(`^${currentUser.state}$`, "i") },
          points: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: "$city",
          totalUsers: { $sum: 1 },
          totalPoints: { $sum: "$points" },
          averagePoints: { $avg: "$points" },
          topUser: { $max: "$points" },
        },
      },
      {
        $sort: { totalPoints: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Complaint status vs points correlation
    const statusAnalysis = await User.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
          points: { $gt: 0 },
        },
      },
      {
        $lookup: {
          from: "complaints",
          localField: "_id",
          foreignField: "userId",
          as: "complaints",
        },
      },
      {
        $project: {
          name: 1,
          points: 1,
          totalComplaints: { $size: "$complaints" },
          resolvedComplaints: {
            $size: {
              $filter: {
                input: "$complaints",
                cond: { $eq: ["$$this.status", "resolved"] },
              },
            },
          },
          inProgressComplaints: {
            $size: {
              $filter: {
                input: "$complaints",
                cond: { $eq: ["$$this.status", "in_progress"] },
              },
            },
          },
        },
      },
      {
        $match: { totalComplaints: { $gt: 0 } },
      },
    ]);

    // Recent achievements (top point earners this month) - IST timezone
    const now = new Date();
    // Convert current time to IST
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const thisMonth = new Date(istNow.getFullYear(), istNow.getMonth(), 1);
    // Convert back to UTC for MongoDB query
    const thisMonthUTC = new Date(thisMonth.getTime() - 5.5 * 60 * 60 * 1000);

    const recentAchievers = await User.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
          "pointsHistory.awardedAt": { $gte: thisMonthUTC },
        },
      },
      {
        $addFields: {
          monthlyPoints: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$pointsHistory",
                    cond: { $gte: ["$$this.awardedAt", thisMonthUTC] },
                  },
                },
                as: "entry",
                in: "$$entry.points",
              },
            },
          },
        },
      },
      {
        $match: { monthlyPoints: { $gt: 0 } },
      },
      {
        $sort: { monthlyPoints: -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          name: 1,
          monthlyPoints: 1,
          totalPoints: "$points",
        },
      },
    ]);

    // Combine points and complaints data by date
    const combinedDailyData = {};

    // Add points data
    monthlyTrend.forEach((item) => {
      const dateKey = `${item._id.year}-${String(item._id.month).padStart(
        2,
        "0"
      )}-${String(item._id.day).padStart(2, "0")}`;
      combinedDailyData[dateKey] = {
        date: dateKey,
        points: item.totalPoints,
        complaints: 0, // Initialize complaints to 0
      };
    });

    // Add complaints data
    dailyComplaints.forEach((item) => {
      const dateKey = `${item._id.year}-${String(item._id.month).padStart(
        2,
        "0"
      )}-${String(item._id.day).padStart(2, "0")}`;
      if (combinedDailyData[dateKey]) {
        combinedDailyData[dateKey].complaints = item.complaintsCount;
      } else {
        combinedDailyData[dateKey] = {
          date: dateKey,
          points: 0,
          complaints: item.complaintsCount,
        };
      }
    });

    // Convert to array and sort by date
    const finalDailyData = Object.values(combinedDailyData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      pointsDistribution: pointsDistribution.map((bucket, index) => {
        const ranges = ["0-9", "10-24", "25-49", "50-99", "100-199", "200+"];
        return {
          range: ranges[index] || "Other",
          count: bucket.count,
          users: bucket.users,
        };
      }),
      monthlyTrend: finalDailyData,
      cityComparison: cityComparison.map((city) => ({
        city: city._id,
        totalUsers: city.totalUsers,
        totalPoints: city.totalPoints,
        averagePoints: Math.round(city.averagePoints * 100) / 100, // Round to 2 decimal places
        topUser: city.topUser,
        isCurrentCity:
          city._id.toLowerCase() === currentUser.city.toLowerCase(),
      })),
      statusAnalysis,
      recentAchievers,
      summary: {
        userRank:
          (await User.countDocuments({
            city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
            points: { $gt: currentUser.points },
          })) + 1,
        totalDistrictUsers: await User.countDocuments({
          city: { $regex: new RegExp(`^${currentUser.city}$`, "i") },
          points: { $gt: 0 },
        }),
        userPoints: currentUser.points,
        userCity: currentUser.city,
        userState: currentUser.state,
      },
    });
  } catch (error) {
    console.error("Get Janawaaz analytics error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
