const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");

class CompanyImageManager {
  static UPLOAD_PATH = path.join(__dirname, "../../uploads/company");
  static TEMP_PATH = path.join(__dirname, "../../uploads/company/temp");

  // Ensure directories exist
  static async ensureDirectories() {
    try {
      await fs.mkdir(this.UPLOAD_PATH, { recursive: true });
      await fs.mkdir(this.TEMP_PATH, { recursive: true });
      return true;
    } catch (error) {
      console.error("Failed to create directories:", error);
      return false;
    }
  }

  // Process and optimize uploaded image
  static async processImage(tempFile, type) {
    await this.ensureDirectories();

    const filename = type === "logo" ? "logo.png" : "signature.png";
    const outputPath = path.join(this.UPLOAD_PATH, filename);

    try {
      // Define dimensions based on type
      const dimensions =
        type === "logo"
          ? { width: 300, height: 150 }
          : { width: 400, height: 200 };

      // Process image with Sharp
      await sharp(tempFile.path)
        .resize(dimensions.width, dimensions.height, {
          fit: "inside",
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 0 }, // Transparent background
        })
        .png({
          quality: 90,
          compressionLevel: 6,
          adaptiveFiltering: true,
        })
        .toFile(outputPath);

      // Delete temporary file
      await fs.unlink(tempFile.path);

      return {
        success: true,
        url: `/uploads/company/${filename}`,
        path: outputPath,
      };
    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempFile.path);
      } catch {}

      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  // Check if images exist
  static async checkImages() {
    const logoPath = path.join(this.UPLOAD_PATH, "logo.png");
    const signaturePath = path.join(this.UPLOAD_PATH, "signature.png");

    try {
      const [logoExists, signatureExists] = await Promise.all([
        fs
          .access(logoPath)
          .then(() => true)
          .catch(() => false),
        fs
          .access(signaturePath)
          .then(() => true)
          .catch(() => false),
      ]);

      return { logo: logoExists, signature: signatureExists };
    } catch (error) {
      return { logo: false, signature: false };
    }
  }

  // Get image information
  static async getImageInfo(type) {
    const filename = type === "logo" ? "logo.png" : "signature.png";
    const imagePath = path.join(this.UPLOAD_PATH, filename);

    try {
      const stats = await fs.stat(imagePath);
      return {
        exists: true,
        size: Math.round(stats.size / 1024), // Size in KB
        lastModified: stats.mtime,
        url: `/api/admin/company/${type}`, // Secure URL
      };
    } catch (error) {
      return {
        exists: false,
        url: `/api/admin/company/${type}`, // Still use secure endpoint
      };
    }
  }

  // Validate uploaded file
  static validateFile(file) {
    const errors = [];

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push("Only JPEG, PNG, and GIF files are allowed");
    }

    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      errors.push("File size too large. Maximum 5MB allowed");
    }

    // Check filename
    if (!file.originalname || file.originalname.length > 100) {
      errors.push("Invalid filename");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = CompanyImageManager;
