const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Department = require("../models/Department");
const Admin = require("../models/Admin");

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key"
    );

    let authenticatedEntity = null;

    // Check the type of entity from the token payload
    if (payload.type === "department") {
      // Department authentication
      authenticatedEntity = await Department.findById(payload.id);
      if (!authenticatedEntity || !authenticatedEntity.isActive) {
        return res
          .status(401)
          .json({ error: "Department not found or inactive" });
      }
    } else if (payload.role === "admin") {
      // Admin authentication
      authenticatedEntity = await Admin.findById(payload.id || payload.userId);
      if (!authenticatedEntity) {
        return res.status(401).json({ error: "Admin not found" });
      }
    } else {
      // User authentication (default/fallback)
      const userId = payload.userId || payload.id;
      authenticatedEntity = await User.findById(userId);
      if (!authenticatedEntity) {
        return res.status(401).json({ error: "User not found" });
      }

      // Check if user is blacklisted
      if (authenticatedEntity.isBlacklisted) {
        return res.status(403).json({ 
          error: "Account has been blacklisted", 
          reason: authenticatedEntity.blacklistReason,
          blacklistedAt: authenticatedEntity.blacklistedAt 
        });
      }
    }

    // Derive a consistent role and type for downstream logic
    // Priority: explicit payload.role, then payload.type for non-user actors, then model role, else 'user'
    const derivedType = payload.type || (payload.role === 'admin' ? 'admin' : 'user');
    let derivedRole = payload.role || authenticatedEntity.role;
    if (!derivedRole) {
      if (derivedType === 'department') derivedRole = 'department';
      else if (derivedType === 'admin') derivedRole = 'admin';
      else derivedRole = 'user';
    }

    // Add the authenticated entity to the request object
    req.user = {
      ...authenticatedEntity.toJSON(),
      id: authenticatedEntity._id,
      type: derivedType,
      role: derivedRole,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};
