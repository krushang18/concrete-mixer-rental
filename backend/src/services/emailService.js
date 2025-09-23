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

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, username) {
    try {
      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5000"
      }/reset-password/${resetToken}`;

      const subject = "Password Reset Request - Concrete Mixer Rental Admin";

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #0081C9; margin-bottom: 10px;">Password Reset Request</h1>
            <p style="color: #666; font-size: 16px;">Concrete Mixer Rental Admin System</p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0 0 15px 0;">Hello <strong>${username}</strong>,</p>
            
            <p style="margin: 0 0 15px 0;">
              We received a request to reset your password for the Concrete Mixer Rental Admin System.
            </p>
            
            <p style="margin: 0 0 20px 0;">
              Click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #0081C9; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; font-weight: bold; 
                        display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="margin: 20px 0 0 0; font-size: 14px; color: #666;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="margin: 5px 0 0 0; font-size: 14px; word-break: break-all;">
              <a href="${resetUrl}" style="color: #0081C9;">${resetUrl}</a>
            </p>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; 
                      border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #856404;">
              <strong>Security Notice:</strong> This password reset link will expire in 1 hour. 
              If you didn't request this reset, please ignore this email.
            </p>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; 
                      text-align: center; color: #666; font-size: 12px;">
            <p style="margin: 0;">
              This email was sent from the Concrete Mixer Rental Management System.<br>
              If you have any questions, please contact your system administrator.
            </p>
            <p style="margin: 10px 0 0 0;">
              <strong>Timestamp:</strong> ${new Date().toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      `;

      const mailOptions = {
        from: {
          name: "Concrete Mixer Rental Admin",
          address: this.companyEmail,
        },
        to: email,
        subject: subject,
        html: htmlContent,
        priority: "high",
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("✅ Password reset email sent:", info.messageId);

      return {
        success: true,
        messageId: info.messageId,
        message: "Password reset email sent successfully",
      };
    } catch (error) {
      console.error("❌ Error sending password reset email:", error);
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
