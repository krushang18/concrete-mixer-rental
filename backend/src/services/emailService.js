const { createTransporter, emailTemplates } = require("../config/email");
require("dotenv").config();

class EmailService {
  constructor() {
    this.transporter = createTransporter();
    this.adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    this.companyEmail = process.env.COMPANY_EMAIL;
  }

  // Send customer query confirmation
  async sendCustomerConfirmation(customerData) {
    try {
      const template = emailTemplates.customerQueryConfirmation(customerData);

      const mailOptions = {
        from: {
          name: "OCS Fiori Service",
          address: this.companyEmail,
        },
        to: customerData.email,
        subject: template.subject,
        html: template.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Customer confirmation email sent:", info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        message: "Confirmation email sent successfully",
      };
    } catch (error) {
      console.error("❌ Error sending customer confirmation:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send admin notification
  async sendAdminNotification(customerData) {
    try {
      const template = emailTemplates.adminNotification(customerData);

      const mailOptions = {
        from: {
          name: "Concrete Mixer Rental System",
          address: this.companyEmail,
        },
        to: this.adminEmails,
        subject: template.subject,
        html: template.html,
        priority: "high",
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Admin notification email sent:", info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        message: "Admin notification sent successfully",
      };
    } catch (error) {
      console.error("❌ Error sending admin notification:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send both emails for new query
  async sendNewQueryEmails(customerData) {
    const results = {
      customer: { success: false },
      admin: { success: false },
    };

    try {
      // Send customer confirmation
      results.customer = await this.sendCustomerConfirmation(customerData);

      // Send admin notification
      results.admin = await this.sendAdminNotification(customerData);

      return {
        success: results.customer.success || results.admin.success,
        results,
        message: "Email notifications processed",
      };
    } catch (error) {
      console.error("❌ Error sending query emails:", error);
      return {
        success: false,
        error: error.message,
        results,
      };
    }
  }

  // Test email configuration
  async testEmailSetup() {
    try {
      await this.transporter.verify();

      // Send test email to company email
      const testMailOptions = {
        from: this.companyEmail,
        to: this.companyEmail,
        subject: "Email Configuration Test - Concrete Mixer Rental",
        html: `
          <h2>Email Configuration Test</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>From:</strong> ${this.companyEmail}</p>
          <p><strong>Admin Emails:</strong> ${this.adminEmails.join(", ")}</p>
          <p>If you receive this email, your configuration is working properly!</p>
        `,
      };

      const info = await this.transporter.sendMail(testMailOptions);

      return {
        success: true,
        messageId: info.messageId,
        message: "Test email sent successfully",
      };
    } catch (error) {
      console.error("❌ Email test failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Send custom email (for future use)
  async sendCustomEmail(to, subject, htmlContent, options = {}) {
    try {
      const mailOptions = {
        from: {
          name: options.fromName || "Concrete Mixer Rental",
          address: this.companyEmail,
        },
        to: Array.isArray(to) ? to : [to],
        subject,
        html: htmlContent,
        priority: options.priority || "normal",
      };

      if (options.attachments) {
        mailOptions.attachments = options.attachments;
      }

      const info = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
        message: "Email sent successfully",
      };
    } catch (error) {
      console.error("❌ Error sending custom email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new EmailService();
