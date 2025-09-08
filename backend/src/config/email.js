const nodemailer = require("nodemailer");
require("dotenv").config();

// Create SMTP transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Test email configuration
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log("✅ Email configuration verified");
    return true;
  } catch (error) {
    console.error("❌ Email configuration error:", error.message);
    return false;
  }
};

// Email templates
const emailTemplates = {
  customerQueryConfirmation: (customerData) => ({
    subject: "Thank you for your inquiry - OCS Fiori Service",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #0081C9; color: white; padding: 20px; text-align: center;">
          <h1>Thank You for Your Inquiry!</h1>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa;">
          <p>Dear ${customerData.company_name},</p>
          <p>Thank you for your interest in our concrete mixer rental services. We have received your inquiry and our team will contact you within 24 hours.</p>
          
          <div style="background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #0081C9;">
            <h3>Your Inquiry Details:</h3>
            <p><strong>Company:</strong> ${customerData.company_name}</p>
            <p><strong>Contact:</strong> ${customerData.contact_number}</p>
            <p><strong>Site Location:</strong> ${customerData.site_location}</p>
            <p><strong>Duration:</strong> ${customerData.duration}</p>
            <p><strong>Work Description:</strong> ${customerData.work_description}</p>
          </div>
          
          <p>We look forward to serving your concrete mixer rental needs.</p>
          <p>Best regards,<br>OCS Fiori Service Team</p>
        </div>
        <div style="background-color: #333333; color: white; padding: 10px; text-align: center; font-size: 12px;">
          <p>&copy; 2025 OCS Fiori Service All rights reserved.</p>
        </div>
      </div>
    `,
  }),

  adminNotification: (customerData) => ({
    subject: `New Customer Inquiry - ${customerData.company_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #FFC93C; color: #333; padding: 20px; text-align: center;">
          <h1>🚨 New Customer Inquiry</h1>
        </div>
        <div style="padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2>Customer Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; font-weight: bold;">Company:</td>
                <td style="padding: 8px;">${customerData.company_name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; font-weight: bold;">Email:</td>
                <td style="padding: 8px;">${customerData.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; font-weight: bold;">Contact:</td>
                <td style="padding: 8px;">${customerData.contact_number}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; font-weight: bold;">Location:</td>
                <td style="padding: 8px;">${customerData.site_location}</td>
              </tr>
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px; font-weight: bold;">Duration:</td>
                <td style="padding: 8px;">${customerData.duration}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold; vertical-align: top;">Description:</td>
                <td style="padding: 8px;">${customerData.work_description}</td>
              </tr>
            </table>
          </div>
          <div style="margin-top: 20px; padding: 15px; background-color: #0081C9; color: white; border-radius: 5px;">
            <p style="margin: 0;"><strong>Action Required:</strong> Please follow up with this customer within 24 hours.</p>
          </div>
        </div>
      </div>
    `,
  }),
};

module.exports = {
  createTransporter,
  testEmailConnection,
  emailTemplates,
};
