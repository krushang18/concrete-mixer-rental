const { executeQuery } = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  // Find user by username
  static async findByUsername(username) {
    try {
      const query = "SELECT * FROM users WHERE username = ? LIMIT 1";
      const result = await executeQuery(query, [username]);
      return result[0] || null;
    } catch (error) {
      console.error("Error finding user by username:", error);
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const query = "SELECT * FROM users WHERE email = ? LIMIT 1";
      const result = await executeQuery(query, [email]);
      return result[0] || null;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const query = "SELECT * FROM users WHERE id = ? LIMIT 1";
      const result = await executeQuery(query, [id]);
      return result[0] || null;
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const { username, password, email } = userData;

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const query = `
        INSERT INTO users (username, password, email, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `;

      const result = await executeQuery(query, [
        username,
        hashedPassword,
        email,
      ]);

      return {
        success: true,
        id: result.insertId,
        message: "User created successfully",
      };
    } catch (error) {
      console.error("Error creating user:", error);

      // Handle duplicate key errors
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("username")) {
          throw new Error("Username already exists");
        }
        if (error.message.includes("email")) {
          throw new Error("Email already exists");
        }
      }

      throw error;
    }
  }

  // Update user password
  static async updatePassword(userId, hashedPassword) {
    try {
      const query =
        "UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?";
      await executeQuery(query, [hashedPassword, userId]);
      return { success: true };
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  }

  // Update last login timestamp
  static async updateLastLogin(userId) {
    try {
      const query =
        "UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = ?";
      await executeQuery(query, [userId]);
      return { success: true };
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  // Save password reset token
  static async savePasswordResetToken(userId, token) {
    try {
      // First, invalidate any existing reset tokens for this user
      await executeQuery(
        "UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
        [userId]
      );

      // Save new reset token with expiration (1 hour)
      const query = `
        UPDATE users 
        SET reset_token = ?, 
            reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR),
            updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(query, [token, userId]);
      return { success: true };
    } catch (error) {
      console.error("Error saving password reset token:", error);
      throw error;
    }
  }

  // Validate password reset token
  static async validatePasswordResetToken(userId, token) {
    try {
      const query = `
        SELECT id FROM users 
        WHERE id = ? 
        AND reset_token = ? 
        AND reset_token_expires > NOW()
        LIMIT 1
      `;

      const result = await executeQuery(query, [userId, token]);
      return result.length > 0;
    } catch (error) {
      console.error("Error validating reset token:", error);
      throw error;
    }
  }

  // Reset password with token and invalidate token
  static async resetPasswordWithToken(userId, hashedPassword, token) {
    try {
      const query = `
        UPDATE users 
        SET password = ?, 
            reset_token = NULL, 
            reset_token_expires = NULL,
            updated_at = NOW()
        WHERE id = ? AND reset_token = ?
      `;

      const result = await executeQuery(query, [hashedPassword, userId, token]);

      if (result.affectedRows === 0) {
        throw new Error("Invalid reset token");
      }

      return { success: true };
    } catch (error) {
      console.error("Error resetting password with token:", error);
      throw error;
    }
  }

  // Get all users (for admin management)
  static async getAll() {
    try {
      const query = `
        SELECT id, username, email, created_at, last_login, updated_at
        FROM users 
        ORDER BY created_at DESC
      `;

      const result = await executeQuery(query);
      return result;
    } catch (error) {
      console.error("Error getting all users:", error);
      throw error;
    }
  }

  // Delete user
  static async delete(userId) {
    try {
      const query = "DELETE FROM users WHERE id = ?";
      const result = await executeQuery(query, [userId]);

      if (result.affectedRows === 0) {
        return { success: false, message: "User not found" };
      }

      return { success: true, message: "User deleted successfully" };
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(userId, updateData) {
    try {
      const { username, email } = updateData;

      const query = `
        UPDATE users 
        SET username = ?, email = ?, updated_at = NOW()
        WHERE id = ?
      `;

      const result = await executeQuery(query, [username, email, userId]);

      if (result.affectedRows === 0) {
        return { success: false, message: "User not found" };
      }

      return { success: true, message: "Profile updated successfully" };
    } catch (error) {
      console.error("Error updating user profile:", error);

      // Handle duplicate key errors
      if (error.code === "ER_DUP_ENTRY") {
        if (error.message.includes("username")) {
          throw new Error("Username already exists");
        }
        if (error.message.includes("email")) {
          throw new Error("Email already exists");
        }
      }

      throw error;
    }
  }

  // Check if user exists
  static async exists(username, email) {
    try {
      const query =
        "SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1";
      const result = await executeQuery(query, [username, email]);
      return result.length > 0;
    } catch (error) {
      console.error("Error checking if user exists:", error);
      throw error;
    }
  }

  // Initialize default admin users
  static async initializeDefaultUsers() {
    try {
      // Check if any users exist
      const existingUsers = await executeQuery(
        "SELECT COUNT(*) as count FROM users"
      );

      if (existingUsers[0].count > 0) {
        console.log("Users already exist, skipping initialization");
        return;
      }

      // Create default admin users based on admin emails from env
      const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];

      const defaultUsers = [
        {
          username: "Krushang",
          email: adminEmails[0] || "krushangshah18@gmail.com",
          password: "ks@123",
        },
        {
          username: "Ajay",
          email: adminEmails[4] || "talodman@yahoo.com",
          password: "Ajay6444",
        },
        {
          username: "Mayur",
          email: adminEmails[1] || "ocsfiori@gmail.com",
          password: "mayur@123",
        },
        {
          username: "Yashraj",
          email: adminEmails[3] || "ypchauhan47@gmail.com",
          password: "yashraj@123",
        },
        {
          username: "Vairanya",
          email: adminEmails[2] || "vairanya_shah@yahoo.co.in",
          password: "vairanya6444",
        },
      ];

      for (const user of defaultUsers) {
        try {
          await this.create(user);
          console.log(`✅ Created admin user: ${user.username}`);
        } catch (error) {
          console.log(
            `⚠️ Could not create user ${user.username}:`,
            error.message
          );
        }
      }

      console.log("✅ Default admin users initialization completed");
    } catch (error) {
      console.error("❌ Error initializing default users:", error);
    }
  }

  // Validate user data
  static validateUserData(userData) {
    const errors = [];
    const { username, password, email } = userData;

    // Username validation
    if (!username || username.trim().length < 3) {
      errors.push("Username must be at least 3 characters long");
    }

    if (username && username.length > 50) {
      errors.push("Username must be less than 50 characters");
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push("Valid email address is required");
    }

    // Password validation
    if (!password || password.length < 6) {
      errors.push("Password must be at least 6 characters long");
    }

    if (password && password.length > 255) {
      errors.push("Password must be less than 255 characters");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = User;
