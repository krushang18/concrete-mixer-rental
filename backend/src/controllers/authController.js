const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const emailService = require("../services/emailService");
const { validationResult } = require("express-validator");

class AuthController {
  // Admin login
  static async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { username, password } = req.body;

      // Find user
      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: "8h" }
      );

      // Update last login
      await User.updateLastLogin(user.id);

      res.json({
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
          expiresIn: "8h",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email,
          created_at: user.created_at,
          last_login: user.last_login,
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get user profile",
      });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;

      // Get current user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await User.updatePassword(userId, hashedPassword);

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to change password",
      });
    }
  }

  // Forgot password - initiate reset
  static async forgotPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { email } = req.body;

      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not (security best practice)
        return res.json({
          success: true,
          message: "If the email exists, a password reset link has been sent",
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { userId: user.id, purpose: "password_reset" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      // Save reset token to database
      await User.savePasswordResetToken(user.id, resetToken);

      // Send password reset email
      const emailResult = await emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.username
      );

      if (emailResult.success) {
        console.log(`Password reset email sent to ${user.email}`);

        res.json({
          success: true,
          message: "If the email exists, a password reset link has been sent",
          // For development only - remove in production
          ...(process.env.NODE_ENV === "development" && {
            dev_info: {
              resetToken: resetToken,
              email_sent: true,
              messageId: emailResult.messageId,
            },
          }),
        });
      } else {
        // Log error but don't reveal to user for security
        console.error(
          "Failed to send password reset email:",
          emailResult.error
        );

        res.json({
          success: true,
          message: "If the email exists, a password reset link has been sent",
          // For development only - remove in production
          ...(process.env.NODE_ENV === "development" && {
            dev_info: {
              resetToken: resetToken,
              email_sent: false,
              error: emailResult.error,
            },
          }),
        });
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process password reset request",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Reset password with token
  static async resetPassword(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { token, newPassword } = req.body;

      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset token",
        });
      }

      if (decoded.purpose !== "password_reset") {
        return res.status(400).json({
          success: false,
          message: "Invalid reset token",
        });
      }

      // Check if token is still valid in database
      const isValidToken = await User.validatePasswordResetToken(
        decoded.userId,
        token
      );
      if (!isValidToken) {
        return res.status(400).json({
          success: false,
          message: "Reset token has been used or expired",
        });
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password and invalidate reset token
      await User.resetPasswordWithToken(decoded.userId, hashedPassword, token);

      res.json({
        success: true,
        message: "Password reset successfully",
      });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reset password",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Logout (optional - mainly for token blacklisting)
  static async logout(req, res) {
    try {
      // In a more complex system, you might blacklist the token
      // For now, we'll just send a success response
      res.json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
  }

  // Verify token endpoint
  static async verifyToken(req, res) {
    try {
      // If we reach here, the token is valid (checked by auth middleware)
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.json({
        success: true,
        message: "Token is valid",
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        },
      });
    } catch (error) {
      console.error("Verify token error:", error);
      res.status(500).json({
        success: false,
        message: "Token verification failed",
      });
    }
  }
}

module.exports = AuthController;
