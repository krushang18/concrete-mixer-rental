const { prisma } = require("../config/database");

class Company {
  static async getDetails() {
    try {
      return await prisma.ourCompanyDetails.findFirst({ orderBy: { id: "desc" } });
    } catch (error) {
      console.error("Error fetching company details:", error);
      throw new Error("Failed to fetch company details");
    }
  }

  static async createOrUpdate(companyData) {
    try {
      const existing = await prisma.ourCompanyDetails.findFirst();

      if (existing) {
        const newLogo = companyData.logo_url !== undefined ? companyData.logo_url : existing.logoUrl;
        const newSignature = companyData.signature_url !== undefined ? companyData.signature_url : existing.signatureUrl;

        await prisma.ourCompanyDetails.update({
          where: { id: existing.id },
          data: {
            companyName: companyData.company_name,
            gstNumber: companyData.gst_number,
            email: companyData.email,
            phone: companyData.phone,
            phone2: companyData.phone2 || null,
            address: companyData.address,
            logoUrl: newLogo,
            signatureUrl: newSignature,
          },
        });
        return { success: true, id: existing.id, message: "Company details saved successfully" };
      } else {
        const created = await prisma.ourCompanyDetails.create({
          data: {
            companyName: companyData.company_name,
            gstNumber: companyData.gst_number,
            email: companyData.email,
            phone: companyData.phone,
            phone2: companyData.phone2 || null,
            address: companyData.address,
            logoUrl: companyData.logo_url || "/uploads/company/logo.png",
            signatureUrl: companyData.signature_url || "/uploads/company/signature.png",
          },
        });
        return { success: true, id: created.id, message: "Company details saved successfully" };
      }
    } catch (error) {
      console.error("Error saving company details:", error);
      throw new Error("Failed to save company details");
    }
  }

  static async getDetailsWithImages() {
    try {
      const CompanyImageManager = require("../utils/imageManager");
      const company = await this.getDetails();
      if (!company) return null;

      const [logoInfo, signatureInfo] = await Promise.all([
        CompanyImageManager.getImageInfo("logo"),
        CompanyImageManager.getImageInfo("signature"),
      ]);

      return { ...company, logo_info: logoInfo, signature_info: signatureInfo };
    } catch (error) {
      console.error("Error fetching company details with images:", error);
      throw error;
    }
  }

  static async initializeDefault() {
    const existing = await this.getDetails();
    if (!existing) {
      return await this.createOrUpdate({
        company_name: "M/S Ochhavlal Chhotalal Shah",
        gst_number: "24AAAFO2654G1ZK",
        email: "ocsfiori@gmail.com",
        phone: "+91-9913737777",
        phone2: "+91-9898020677",
        address: "E-706, Radhe infinity, Raksha Shakti Circle Kudasan, Gandhinagar, Gujarat - 382426",
        logo_url: "/uploads/company/logo.png",
        signature_url: "/uploads/company/signature.png",
      });
    }
    return { success: true, message: "Company details already exist" };
  }

  static validateCompanyData(data) {
    const errors = [];
    if (!data.company_name || data.company_name.trim().length < 2) errors.push("Company name is required");
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Valid email address is required");
    if (!data.phone || data.phone.trim().length < 10) errors.push("Primary phone number is required");
    if (data.phone && !/^[\+]?[1-9]\d{1,14}$/.test(data.phone.replace(/\s|-/g, ""))) errors.push("Primary phone number format is invalid");
    if (data.phone2?.trim().length > 0 && !/^[\+]?[1-9]\d{1,14}$/.test(data.phone2.replace(/\s|-/g, ""))) errors.push("Secondary phone number format is invalid");
    if (!data.address || data.address.trim().length < 10) errors.push("Complete address is required");
    if (data.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(data.gst_number)) errors.push("Invalid GST number format");
    return { isValid: errors.length === 0, errors };
  }
}

module.exports = Company;
