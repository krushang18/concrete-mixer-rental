const { executeQuery } = require("../config/database");

class Company {
  // Get company details
  static async getDetails() {
    const query = `
      SELECT company_name, gst_number, email, phone, address, 
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

  // Create or update company details (for admin - Phase 2)
  static async createOrUpdate(companyData) {
    // First check if company details exist
    const existingQuery = "SELECT id FROM our_company_details LIMIT 1";
    const existing = await executeQuery(existingQuery);

    let query, params;

    if (existing.length > 0) {
      // Update existing
      query = `
        UPDATE our_company_details 
        SET company_name = ?, gst_number = ?, email = ?, phone = ?, 
            address = ?, logo_url = ?, signature_url = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      params = [
        companyData.company_name,
        companyData.gst_number,
        companyData.email,
        companyData.phone,
        companyData.address,
        companyData.logo_url || null,
        companyData.signature_url || null,
        existing[0].id,
      ];
    } else {
      // Create new
      query = `
        INSERT INTO our_company_details 
        (company_name, gst_number, email, phone, address, logo_url, signature_url) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      params = [
        companyData.company_name,
        companyData.gst_number,
        companyData.email,
        companyData.phone,
        companyData.address,
        companyData.logo_url || null,
        companyData.signature_url || null,
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

  // Initialize default company data
  static async initializeDefault() {
    const existing = await this.getDetails();

    if (!existing) {
      const defaultData = {
        company_name: "Concrete Mixer Rental Services",
        gst_number: "GST_NUMBER_HERE",
        email: "info@concretemixerrental.com",
        phone: "+91-XXXXXXXXXX",
        address: "Business Address, Gujarat, India",
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
      errors.push("Valid phone number is required");
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
