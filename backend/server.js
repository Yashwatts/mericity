require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const complaintRoutes = require("./routes/complaints");
const adminRoutes = require("./routes/admin");
const janawaazRoutes = require("./routes/janawaaz");
const rewardsRoutes = require("./routes/rewards");
const notificationRoutes = require("./routes/notifications");
const departmentRoutes = require("./routes/department");
const chatRoutes = require("./routes/chat");
const visionOcrRoutes = require("./routes/vision-ocr");

const app = express();

// CORS configuration for Google OAuth
app.use(
  cors({
    origin: [
      "http://localhost:5173", 
      "http://localhost:5174",
      "https://sih-project-frontend-green.vercel.app",
      "https://sih-project-2.vercel.app",
      "https://mericity.app",
      "https://www.mericity.app"

    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Cross-Origin-Opener-Policy"],
    optionsSuccessStatus: 200,
  })
);

// Security headers for Google OAuth
app.use((req, res, next) => {
  res.header("Cross-Origin-Opener-Policy", "unsafe-none");
  res.header("Cross-Origin-Embedder-Policy", "unsafe-none");
  res.header("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});
app.use(express.json());
// Parse application/x-www-form-urlencoded (required for Twilio webhooks)
app.use(express.urlencoded({ extended: false }));

// --- Debug request logger (temporary) ---
// Request logging middleware (disabled for production)
app.use((req, _res, next) => {
  // Only log non-chat requests to reduce spam
  if (!req.originalUrl.startsWith('/chat/')) {
    try {
      const bodyPreview =
        typeof req.body === "object"
          ? JSON.stringify(req.body).slice(0, 100)
          : "";
      console.log(`[REQ] ${req.method} ${req.originalUrl} ${bodyPreview}`);
    } catch {
      console.log(`[REQ] ${req.method} ${req.originalUrl}`);
    }
  }
  next();
});

// Serve uploaded files statically
app.use("/uploads", express.static("uploads"));

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.use("/auth", authRoutes);
app.use("/user", userRoutes);
app.use("/complaints", complaintRoutes);
app.use("/admin", adminRoutes);
app.use("/janawaaz", janawaazRoutes);
app.use("/rewards", rewardsRoutes);
app.use("/notifications", notificationRoutes);
app.use("/department", departmentRoutes);
app.use("/chat", chatRoutes);
app.use("/", visionOcrRoutes);

// Health check endpoint for Render
app.get("/", (req, res) => {
  res.json({ 
    status: "Server is running!", 
    timestamp: new Date().toISOString(),
    endpoints: {
      complaints: "/api/complaints",
      auth: "/api/auth",
      admin: "/api/admin",
      phone_verification: "/api/complaints/verify-call",
      vision_ocr: "/api/vision-ocr"
    }
  });
});

// API routes with /api prefix for clarity
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/janawaaz", janawaazRoutes);
app.use("/api/rewards", rewardsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/department", departmentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api", visionOcrRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Phone verification webhooks ready at: ${process.env.TWILIO_WEBHOOK_BASE_URL || 'http://localhost:' + PORT}`);
});
