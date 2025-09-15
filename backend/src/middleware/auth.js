const jwt = require("jsonwebtoken");
const User = require("../models/User");

// JWT Authentication Middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Token has expired",
        });
      }

      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
        });
      }

      throw error;
    }

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists",
      });
    }

    // Add user info to request object
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      // No token provided, continue without authentication
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user) {
        req.user = {
          userId: decoded.userId,
          username: decoded.username,
          email: decoded.email,
        };
      }
    } catch (error) {
      // Invalid token, but continue without authentication
      console.log("Optional auth failed:", error.message);
    }

    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next(); // Continue without authentication
  }
};

// Check if user is admin (for future role-based access)
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // For now, all authenticated users are admins
    // In future, you can add role checking here
    next();
  } catch (error) {
    console.error("Admin check middleware error:", error);
    res.status(500).json({
      success: false,
      message: "Authorization check failed",
    });
  }
};

// Generate JWT token
const generateToken = (userData) => {
  return jwt.sign(
    {
      userId: userData.id,
      username: userData.username,
      email: userData.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );
};

// Verify token without middleware (utility function)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

// Extract token from request
const extractToken = (req) => {
  const authHeader = req.headers["authorization"];
  return authHeader && authHeader.split(" ")[1];
};

// Check token expiry
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Refresh token (generate new token with same payload)
const refreshToken = async (oldToken) => {
  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET, {
      ignoreExpiration: true,
    });

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw new Error("User no longer exists");
    }

    // Generate new token
    const newToken = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
    });

    return {
      success: true,
      token: newToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  } catch (error) {
    throw new Error("Token refresh failed");
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  generateToken,
  verifyToken,
  extractToken,
  isTokenExpired,
  refreshToken,
};
