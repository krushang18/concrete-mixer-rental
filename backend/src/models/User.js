const { prisma } = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  static async findByUsername(username) {
    try {
      return await prisma.user.findUnique({ where: { username } });
    } catch (error) {
      console.error("Error finding user by username:", error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      return await prisma.user.findFirst({ where: { email } });
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      return await prisma.user.findUnique({ where: { id: parseInt(id) } });
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      const { username, password, email } = userData;
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: { username, password: hashedPassword, email },
      });
      return { success: true, id: user.id, message: "User created successfully" };
    } catch (error) {
      console.error("Error creating user:", error);
      if (error.code === "P2002") {
        const field = error.meta?.target?.includes("username") ? "Username" : "Email";
        throw new Error(`${field} already exists`);
      }
      throw error;
    }
  }

  static async updatePassword(userId, hashedPassword) {
    try {
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { password: hashedPassword },
      });
      return { success: true };
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  }

  static async updateLastLogin(userId) {
    try {
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { lastLogin: new Date() },
      });
      return { success: true };
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  static async savePasswordResetToken(userId, token) {
    try {
      await prisma.user.update({
        where: { id: parseInt(userId) },
        data: {
          resetToken: token,
          resetTokenExpires: new Date(Date.now() + 3600000),
        },
      });
      return { success: true };
    } catch (error) {
      console.error("Error saving password reset token:", error);
      throw error;
    }
  }

  static async validatePasswordResetToken(userId, token) {
    try {
      const user = await prisma.user.findFirst({
        where: {
          id: parseInt(userId),
          resetToken: token,
          resetTokenExpires: { gt: new Date() },
        },
      });
      return user !== null;
    } catch (error) {
      console.error("Error validating reset token:", error);
      throw error;
    }
  }

  static async resetPasswordWithToken(userId, hashedPassword, token) {
    try {
      const result = await prisma.user.updateMany({
        where: { id: parseInt(userId), resetToken: token },
        data: { password: hashedPassword, resetToken: null, resetTokenExpires: null },
      });
      if (result.count === 0) throw new Error("Invalid reset token");
      return { success: true };
    } catch (error) {
      console.error("Error resetting password with token:", error);
      throw error;
    }
  }

  static async initializeDefaultUsers() {
    try {
      const count = await prisma.user.count();
      if (count > 0) {
        console.log("Users already exist, skipping initialization");
        return;
      }

      const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
      const defaultUsers = [
        { username: "Krushang", email: adminEmails[0] || "krushangshah18@gmail.com", password: "ks@123" },
        { username: "Ajay", email: adminEmails[4] || "talodman@yahoo.com", password: "Ajay6444" },
        { username: "Mayur", email: adminEmails[1] || "ocsfiori@gmail.com", password: "mayur@123" },
        { username: "Yashraj", email: adminEmails[3] || "ypchauhan47@gmail.com", password: "yashraj@123" },
        { username: "Vairanya", email: adminEmails[2] || "vairanya_shah@yahoo.co.in", password: "vairanya6444" },
      ];

      for (const user of defaultUsers) {
        try {
          await this.create(user);
          console.log(`✅ Created admin user: ${user.username}`);
        } catch (error) {
          console.log(`⚠️ Could not create user ${user.username}:`, error.message);
        }
      }
      console.log("✅ Default admin users initialization completed");
    } catch (error) {
      console.error("❌ Error initializing default users:", error);
    }
  }
}

module.exports = User;
