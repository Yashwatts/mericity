const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// helper: create our JWT
function createJWT(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// 1) Google login (frontend sends id_token)
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload.email_verified)
      return res.status(400).json({ error: "Google email not verified" });

    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.findOne({ email: payload.email });
      if (user) {
        user.googleId = payload.sub; // link account
      } else {
        user = new User({
          googleId: payload.sub,
          email: payload.email,
          picture: payload.picture,
          profileComplete: false,
        });
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const tokenToClient = createJWT(user);

    res.json({
      token: tokenToClient,
      user,
      needsProfile: !user.profileComplete, // <--- tell frontend if profile is incomplete
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

// 2) Manual register
router.post("/register", async (req, res) => {
  const { email, phone, password, name } = req.body;

  console.log("Registration attempt:", {
    email,
    phone: phone || "not provided",
    name,
    hasPassword: !!password,
  });

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (!email && !phone) {
    return res.status(400).json({ error: "Either email or phone is required" });
  }

  try {
    // Check if user already exists with this email or phone
    let existingUser = null;
    if (email) {
      existingUser = await User.findOne({ email });
      console.log("Email check result:", !!existingUser);
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "Email already registered. Please login." });
      }
    }

    if (phone) {
      existingUser = await User.findOne({ phone });
      console.log("Phone check result:", !!existingUser);
      if (existingUser) {
        console.log("Found existing user with phone:", {
          id: existingUser._id,
          hasPassword: !!existingUser.password,
        });
        return res
          .status(400)
          .json({ error: "Phone number already registered. Please login." });
      }
    }

    const hashed = await bcrypt.hash(password, 12);
    const userData = {
      password: hashed,
      name,
      profileComplete: false,
      role: "user",
    };

    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    console.log("Creating user with data:", {
      ...userData,
      password: "[HASHED]",
    });

    const user = new User(userData);
    await user.save();

    console.log("User created successfully:", {
      id: user._id,
      phone: user.phone,
      email: user.email,
    });

    const token = createJWT(user);
    res.json({ token, user, needsProfile: !user.profileComplete });
  } catch (error) {
    console.error("Registration error:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

// 3) Manual login
router.post("/login", async (req, res) => {
  const { email, phone, password } = req.body;

  console.log("Login attempt:", {
    email,
    phone: phone || "not provided",
    hasPassword: !!password,
  });

  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  if (!email && !phone) {
    return res.status(400).json({ error: "Either email or phone is required" });
  }

  try {
    let user = null;
    if (email) {
      user = await User.findOne({ email });
      console.log("Email login - user found:", !!user);
      if (!user) {
        return res
          .status(400)
          .json({ error: "Email not registered. Please register first." });
      }
    } else if (phone) {
      user = await User.findOne({ phone });
      console.log("Phone login - user found:", !!user);
      if (!user) {
        return res.status(400).json({
          error: "Phone number not registered. Please register first.",
        });
      }
    }

    console.log("User details:", {
      id: user._id,
      hasPassword: !!user.password,
      phone: user.phone,
      email: user.email,
    });

    if (!user.password) {
      console.log("User has no password - likely Google OAuth user");
      return res
        .status(400)
        .json({ error: "Use Google login for this account." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", passwordMatch);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Incorrect password." });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = createJWT(user);
    res.json({ token, user, needsProfile: !user.profileComplete });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

module.exports = router;
