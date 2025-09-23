const { executeQuery } = require("../config/database");

class Company {
  // Get company details
  static async getDetails() {
    const query = `
      SELECT company_name, gst_number, email, phone, phone2, address, 
             logo_url, signature_url, created_at, updated_at
      FROM our_company_details 
      ORDER BY id DESC 
      LIMIT 1
    `;

    try {
      const rows = await executeQuery(query);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching company details:", error);
      throw new Error("Failed to fetch company details");
    }
  }

  // Create or update company details
  static async createOrUpdate(companyData) {
    const existingQuery = "SELECT id FROM our_company_details LIMIT 1";
    const existing = await executeQuery(existingQuery);

    let query, params;

    if (existing.length > 0) {
      // Update existing
      query = `
        UPDATE our_company_details 
        SET company_name = ?, gst_number = ?, email = ?, phone = ?, phone2 = ?,
            address = ?, logo_url = ?, signature_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      params = [
        companyData.company_name,
        companyData.gst_number,
        companyData.email,
        companyData.phone,
        companyData.phone2 || null,
        companyData.address,
        companyData.logo_url || null,
        companyData.signature_url || null,
        existing[0].id,
      ];
    } else {
      // Create new
      query = `
        INSERT INTO our_company_details 
        (company_name, gst_number, email, phone, phone2, address, logo_url, signature_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      params = [
        companyData.company_name,
        companyData.gst_number,
        companyData.email,
        companyData.phone,
        companyData.phone2 || null,
        companyData.address,
        companyData.logo_url || "/uploads/company/logo.png",
        companyData.signature_url || "/uploads/company/signature.png",
      ];
    }

    try {
      const result = await executeQuery(query, params);
      return {
        success: true,
        id: existing.length > 0 ? existing[0].id : result.insertId,
        message: "Company details saved successfully",
      };
    } catch (error) {
      console.error("Error saving company details:", error);
      throw new Error("Failed to save company details");
    }
  }

  // Get company details with image info
  static async getDetailsWithImages() {
    try {
      const CompanyImageManager = require("../utils/imageManager");
      const company = await this.getDetails();

      if (!company) return null;

      // Get actual image info from the file system
      const [logoInfo, signatureInfo] = await Promise.all([
        CompanyImageManager.getImageInfo("logo"),
        CompanyImageManager.getImageInfo("signature"),
      ]);

      // 🔽🔽🔽 THIS IS THE PART TO CHANGE 🔽🔽🔽

      return {
        ...company,
        // Only provide the URL if the image file actually exists
        logo_url: logoInfo.exists ? "/api/admin/company/logo" : null,
        signature_url: signatureInfo.exists
          ? "/api/admin/company/signature"
          : null,
        logo_info: {
          ...logoInfo,
          // Also update the info object's URL conditionally
          url: logoInfo.exists ? "/api/admin/company/logo" : null,
        },
        signature_info: {
          ...signatureInfo,
          // Do the same for the signature
          url: signatureInfo.exists ? "/api/admin/company/signature" : null,
        },
      };

      // 🔼🔼🔼 END OF CHANGES 🔼🔼🔼
    } catch (error) {
      console.error("Error fetching company details with images:", error);
      throw error;
    }
  }

  // Initialize default company data
  static async initializeDefault() {
    const existing = await this.getDetails();

    if (!existing) {
      const defaultData = {
        company_name: "M/S Ochhavlal Chhotalal Shah",
        gst_number: "24AAAFO2654G1ZK",
        email: "ocsfiori@gmail.com",
        phone: "+91-9913737777",
        phone2: "+91-9898020677",
        address:
          "E-706, Radhe infinity, Raksha Shakti Circle Kudasan, Gandhinagar, Gujarat - 382426",
        logo_url: "/uploads/company/logo.png",
        signature_url: "/uploads/company/signature.png",
      };

      return await this.createOrUpdate(defaultData);
    }

    return { success: true, message: "Company details already exist" };
  }

  // Validate company data
  static validateCompanyData(data) {
    const errors = [];

    if (!data.company_name || data.company_name.trim().length < 2) {
      errors.push("Company name is required");
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push("Valid email address is required");
    }

    if (!data.phone || data.phone.trim().length < 10) {
      errors.push("Primary phone number is required");
    }

    // Validate primary phone format
    if (data.phone) {
      const phoneRegex = /^[\+]?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(data.phone.replace(/\s|-/g, ""))) {
        errors.push("Primary phone number format is invalid");
      }
    }

    // Validate secondary phone format (optional)
    if (data.phone2 && data.phone2.trim().length > 0) {
      const phoneRegex = /^[\+]?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(data.phone2.replace(/\s|-/g, ""))) {
        errors.push("Secondary phone number format is invalid");
      }
    }

    if (!data.address || data.address.trim().length < 10) {
      errors.push("Complete address is required");
    }

    if (
      data.gst_number &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        data.gst_number
      )
    ) {
      errors.push("Invalid GST number format");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = Company;
