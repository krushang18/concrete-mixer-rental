const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["warn", "error"],
});

const testConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
};

const disconnectDB = async () => {
  await prisma.$disconnect();
};

module.exports = { prisma, testConnection, disconnectDB };
