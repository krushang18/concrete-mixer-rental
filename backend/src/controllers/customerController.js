const Customer = require("../models/Customer");
const { validationResult } = require("express-validator");

class CustomerController {
  // Get all customers
  static async getAll(req, res) {
    try {
      const filters = {
        search: req.query.search,
        city: req.query.city,
        has_gst: req.query.has_gst,
        limit: req.query.limit,
        offset: req.query.offset,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const customers = await Customer.getAll(filters);

      res.json({
        success: true,
        message: "Customers retrieved successfully",
        data: customers,
        count: customers.length,
        filters: filters,
      });
    } catch (error) {
      console.error("Error in CustomerController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve customers",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get customer by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid customer ID is required",
        });
      }

      const customer = await Customer.getById(parseInt(id));

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "Customer not found",
        });
      }

      res.json({
        success: true,
        message: "Customer retrieved successfully",
        data: customer,
      });
    } catch (error) {
      console.error("Error in CustomerController.getById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve customer",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create new customer
  static async create(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const customerData = {
        company_name: req.body.company_name?.trim(),
        contact_person: req.body.contact_person?.trim(),
        email: req.body.email?.trim(),
        phone: req.body.phone?.replace(/\D/g, ""),
        address: req.body.address?.trim(),
        site_location: req.body.site_location?.trim(),
        gst_number: req.body.gst_number?.trim().toUpperCase(),
      };

      const result = await Customer.create(customerData);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: { id: result.id },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors,
          existingCustomer: result.existingCustomer,
        });
      }
    } catch (error) {
      console.error("Error in CustomerController.create:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create customer",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update customer
  static async update(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid customer ID is required",
        });
      }

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const updateData = {};

      // Only include fields that are provided
      if (req.body.company_name !== undefined) {
        updateData.company_name = req.body.company_name.trim();
      }
      if (req.body.contact_person !== undefined) {
        updateData.contact_person = req.body.contact_person?.trim();
      }
      if (req.body.email !== undefined) {
        updateData.email = req.body.email?.trim();
      }
      if (req.body.phone !== undefined) {
        updateData.phone = req.body.phone.replace(/\D/g, "");
      }
      if (req.body.address !== undefined) {
        updateData.address = req.body.address?.trim();
      }
      if (req.body.site_location !== undefined) {
        updateData.site_location = req.body.site_location?.trim();
      }
      if (req.body.gst_number !== undefined) {
        updateData.gst_number = req.body.gst_number?.trim().toUpperCase();
      }

      const result = await Customer.update(parseInt(id), updateData);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors,
        });
      }
    } catch (error) {
      console.error("Error in CustomerController.update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update customer",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete customer
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid customer ID is required",
        });
      }

      const result = await Customer.delete(parseInt(id));

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          quotationCount: result.quotationCount,
        });
      }
    } catch (error) {
      console.error("Error in CustomerController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete customer",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get customer quotation history
  static async getQuotationHistory(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid customer ID is required",
        });
      }

      const quotations = await Customer.getQuotationHistory(parseInt(id));

      res.json({
        success: true,
        message: "Customer quotation history retrieved successfully",
        data: quotations,
        count: quotations.length,
      });
    } catch (error) {
      console.error("Error in CustomerController.getQuotationHistory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve quotation history",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Search customers for quotation
  static async searchForQuotation(req, res) {
    try {
      const { q } = req.query;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      const customers = await Customer.searchForQuotation(q.trim());

      res.json({
        success: true,
        message: "Customer search completed successfully",
        data: customers,
        count: customers.length,
        searchQuery: q,
      });
    } catch (error) {
      console.error("Error in CustomerController.searchForQuotation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search customers",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get or create customer (for quotations)
  static async getOrCreate(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const customerData = {
        company_name: req.body.company_name?.trim(),
        contact_person: req.body.contact_person?.trim(),
        email: req.body.email?.trim(),
        phone: req.body.phone?.replace(/\D/g, ""),
        address: req.body.address?.trim(),
        site_location: req.body.site_location?.trim(),
        gst_number: req.body.gst_number?.trim().toUpperCase(),
      };

      const result = await Customer.getOrCreate(customerData);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          data: result.customer,
          created: result.created,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors,
        });
      }
    } catch (error) {
      console.error("Error in CustomerController.getOrCreate:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get or create customer",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Bulk update customers
  static async bulkUpdate(req, res) {
    try {
      const { customer_ids, updates } = req.body;

      if (
        !customer_ids ||
        !Array.isArray(customer_ids) ||
        customer_ids.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Customer IDs array is required",
        });
      }

      if (!updates || typeof updates !== "object") {
        return res.status(400).json({
          success: false,
          message: "Updates object is required",
        });
      }

      const result = await Customer.bulkUpdate({ customer_ids, updates });

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          updatedCount: result.updatedCount,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in CustomerController.bulkUpdate:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk update customers",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get customer statistics
  // Replace the current getStats method with:
  static async getStats(req, res, next) {
    try {
      console.log("CustomerController.getStats: Starting...");

      const stats = await Customer.getStats();
      console.log("CustomerController.getStats: Got stats from model:", stats);

      const responseData = {
        success: true,
        message: "Customer statistics retrieved successfully",
        data: {
          totalCustomers: parseInt(stats.total_customers) || 0,
          customersWithGST: parseInt(stats.customers_with_gst) || 0,
          newToday: parseInt(stats.new_today) || 0,
          newThisWeek: parseInt(stats.new_this_week) || 0,
          newThisMonth: parseInt(stats.new_this_month) || 0,
          lastUpdated: new Date().toISOString(),
        },
      };

      console.log("CustomerController.getStats: Sending JSON response");
      res.json(responseData);
    } catch (error) {
      console.error("Error in CustomerController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve customer statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Export customers to Excel/CSV
  static async exportCustomers(req, res) {
    try {
      const format = req.query.format || "excel";
      const filters = {
        search: req.query.search,
        city: req.query.city,
        has_gst: req.query.has_gst,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const customers = await Customer.getAll(filters);

      // Format data for export
      const exportData = customers.map((customer) => ({
        "Company Name": customer.company_name,
        "Contact Person": customer.contact_person || "",
        Email: customer.email || "",
        Phone: customer.phone,
        Address: customer.address || "",
        "Site Location": customer.site_location || "",
        "GST Number": customer.gst_number || "",
        "Total Quotations": customer.total_quotations || 0,
        "Accepted Quotations": customer.accepted_quotations || 0,
        "Average Quotation Amount": customer.avg_quotation_amount || 0,
        "Last Quotation Date": customer.last_quotation_date || "",
        "Created Date": customer.created_at,
      }));

      res.json({
        success: true,
        message: `Customer data exported successfully (${format})`,
        data: exportData,
        count: exportData.length,
        format: format,
        filename: `customers_export_${new Date().toISOString().split("T")[0]}.${
          format === "excel" ? "xlsx" : "csv"
        }`,
      });
    } catch (error) {
      console.error("Error in CustomerController.exportCustomers:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export customer data",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = CustomerController;
