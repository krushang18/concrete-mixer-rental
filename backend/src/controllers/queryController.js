const Query = require("../models/Query");
const emailService = require("../services/emailService");

class QueryController {
  // Submit new customer query
  static async submitQuery(req, res) {
    try {
      // Validate input data
      const validation = Query.validateQueryData(req.body);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
      }

      // Clean and prepare data
      const queryData = {
        company_name: req.body.company_name.trim(),
        email: req.body.email.trim().toLowerCase(),
        site_location: req.body.site_location.trim(),
        contact_number: req.body.contact_number.replace(/\s+/g, ""),
        duration: req.body.duration.trim(),
        work_description: req.body.work_description.trim(),
      };

      // Save query to database
      const result = await Query.create(queryData);

      if (result.success) {
        // Send email notifications (don't fail if email fails)
        emailService
          .sendNewQueryEmails(queryData)
          .then((emailResult) => {
            if (emailResult.success) {
              console.log(
                "✅ Email notifications sent for query ID:",
                result.id
              );
            } else {
              console.log(
                "⚠️ Email notifications failed for query ID:",
                result.id
              );
            }
          })
          .catch((emailError) => {
            console.error("❌ Email notification error:", emailError);
          });

        // Return success response
        res.status(201).json({
          success: true,
          message:
            "Your inquiry has been submitted successfully. We will contact you within 24 hours.",
          data: {
            id: result.id,
            reference: `QRY-${String(result.id).padStart(4, "0")}`,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to submit query. Please try again.",
          error: "Database error",
        });
      }
    } catch (error) {
      console.error("Error in submitQuery:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error. Please try again later.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get all queries (for admin - Phase 2)
  static async getAllQueries(req, res) {
    try {
      const filters = {
        status: req.query.status,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit ? parseInt(req.query.limit) : 50, // ✅ Fixed: Convert to number
      };

      const queries = await Query.getAll(filters);

      res.json({
        success: true,
        message: "Queries retrieved successfully",
        data: queries,
        count: queries.length,
      });
    } catch (error) {
      console.error("Error in getAllQueries:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve queries",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get query by ID (for admin - Phase 2)
  static async getQueryById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid query ID is required",
        });
      }

      const query = await Query.getById(parseInt(id));

      if (!query) {
        return res.status(404).json({
          success: false,
          message: "Query not found",
        });
      }

      res.json({
        success: true,
        message: "Query retrieved successfully",
        data: query,
      });
    } catch (error) {
      console.error("Error in getQueryById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve query",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update query status (for admin - Phase 2)
  static async updateQueryStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid query ID is required",
        });
      }

      if (!status || !["new", "in_progress", "completed"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status is required (new, in_progress, completed)",
        });
      }

      const result = await Query.updateStatus(parseInt(id), status);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in updateQueryStatus:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update query status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get dashboard stats (for admin - Phase 2)
  static async getDashboardStats(req, res) {
    try {
      const [totalQueries, recentQueries, todayQueries, weekQueries] =
        await Promise.all([
          Query.getRecentCount(365), // All queries this year
          Query.getRecentCount(7), // Last 7 days
          Query.getRecentCount(1), // Today
          Query.getRecentCount(7), // This week
        ]);

      res.json({
        success: true,
        message: "Dashboard stats retrieved successfully",
        data: {
          totalQueries,
          recentQueries,
          todayQueries,
          weekQueries,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error in getDashboardStats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard stats",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Test email configuration (for admin - Phase 2)
  static async testEmail(req, res) {
    try {
      const result = await emailService.testEmailSetup();

      if (result.success) {
        res.json({
          success: true,
          message: "Email test successful. Check your inbox.",
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Email test failed",
          error: result.error,
        });
      }
    } catch (error) {
      console.error("Error in testEmail:", error);
      res.status(500).json({
        success: false,
        message: "Failed to test email configuration",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = QueryController;
