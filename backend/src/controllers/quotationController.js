// Updated QuotationController - /backend/src/controllers/quotationController.js
const Quotation = require("../models/Quotation");
const Customer = require("../models/Customer");
const Machine = require("../models/Machine");
const TermsConditions = require("../models/TermsConditions");
const PDFService = require("../services/pdfService");
const ExcelService = require("../services/excelService");
const { validationResult } = require("express-validator");

class QuotationController {
  // Get all quotations
  static async getAll(req, res) {
    try {
      // Parse pagination parameters
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
      const offset = (page - 1) * limit;

      const filters = {
        status: req.query.status,
        delivery_status: req.query.delivery_status,
        search: req.query.search, // Combined search term
        customer_name: req.query.customer_name,
        machine_id: req.query.machine_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        sort_by: req.query.sort_by || "created_at",
        sort_order: req.query.sort_order || "DESC",
        limit,
        offset,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      // Get quotations with count
      const result = await Quotation.getAllWithPagination(filters);

      const totalPages = Math.ceil(result.total / limit);

      res.json({
        success: true,
        message: "Quotations retrieved successfully",
        data: result.quotations,
        pagination: {
          current_page: page,
          per_page: limit,
          total: result.total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
        filters: filters,
      });
    } catch (error) {
      console.error("Error in QuotationController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve quotations",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get quotation by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid quotation ID is required",
        });
      }

      const quotation = await Quotation.getById(parseInt(id));

      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: "Quotation not found",
        });
      }

      res.json({
        success: true,
        message: "Quotation retrieved successfully",
        data: quotation,
      });
    } catch (error) {
      console.error("Error in QuotationController.getById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve quotation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create new quotation with items
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const quotationData = {
        customer_name: req.body.customer_name?.trim(),
        customer_contact: req.body.customer_contact?.replace(/\D/g, ""),
        company_name: req.body.company_name?.trim(),
        customer_gst_number:
          req.body.customer_gst_number?.trim().toUpperCase() || null, // ADD THIS

        customer_id: req.body.customer_id
          ? parseInt(req.body.customer_id)
          : null,
        items: req.body.items || [],
        terms_conditions: req.body.terms_conditions,
        additional_notes: req.body.additional_notes?.trim(),
      };

      // Validate and process items
      const processedItems = await QuotationController.processQuotationItems(
        quotationData.items
      );
      if (!processedItems.success) {
        return res.status(400).json({
          success: false,
          message: processedItems.message,
          errors: processedItems.errors,
        });
      }

      quotationData.items = processedItems.items;

      // Get or create customer if needed
      if (
        !quotationData.customer_id &&
        quotationData.customer_name &&
        quotationData.customer_contact
      ) {
        const customerResult = await Customer.getOrCreate({
          company_name:
            quotationData.company_name || quotationData.customer_name,
          phone: quotationData.customer_contact,
          contact_person: quotationData.customer_name,
        });

        if (customerResult.success) {
          quotationData.customer_id = customerResult.customer.id;
        }
      }

      const result = await Quotation.create(quotationData, req.user.userId);

      if (result.success) {
        // Get the complete quotation data
        const newQuotation = await Quotation.getById(result.id);

        res.status(201).json({
          success: true,
          message: result.message,
          data: {
            id: result.id,
            quotation_number: result.quotation_number,
            quotation: newQuotation,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          errors: result.errors,
        });
      }
    } catch (error) {
      console.error("Error in QuotationController.create:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create quotation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update quotation
  static async update(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid quotation ID is required",
        });
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const updateData = {};

      // Basic quotation fields
      if (req.body.customer_name !== undefined) {
        updateData.customer_name = req.body.customer_name.trim();
      }
      if (req.body.customer_contact !== undefined) {
        updateData.customer_contact = req.body.customer_contact.replace(
          /\D/g,
          ""
        );
      }
      if (req.body.company_name !== undefined) {
        updateData.company_name = req.body.company_name?.trim();
      }
      if (req.body.customer_gst_number !== undefined) {
        updateData.customer_gst_number =
          req.body.customer_gst_number?.trim().toUpperCase() || null;
      }
      if (req.body.customer_id !== undefined) {
        updateData.customer_id = req.body.customer_id
          ? parseInt(req.body.customer_id)
          : null;
      }
      if (req.body.additional_notes !== undefined) {
        updateData.additional_notes = req.body.additional_notes?.trim();
      }
      if (req.body.quotation_status !== undefined) {
        updateData.quotation_status = req.body.quotation_status;
      }
      if (req.body.delivery_status !== undefined) {
        updateData.delivery_status = req.body.delivery_status;
      }

      // CRITICAL FIX: Include items and terms_conditions
      if (req.body.items !== undefined) {
        updateData.items = req.body.items;
      }
      if (req.body.terms_conditions !== undefined) {
        updateData.terms_conditions = req.body.terms_conditions;
      }

      console.log(
        "Controller updateData:",
        JSON.stringify(updateData, null, 2)
      ); // Debug log

      const result = await Quotation.update(
        parseInt(id),
        updateData,
        req.user.userId
      );

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
      console.error("Error in QuotationController.update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update quotation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete quotation
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid quotation ID is required",
        });
      }

      const result = await Quotation.delete(parseInt(id));

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in QuotationController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete quotation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update quotation status
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid quotation ID is required",
        });
      }

      if (
        !status ||
        !["draft", "sent", "accepted", "rejected", "expired"].includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid status is required (draft, sent, accepted, rejected, expired)",
        });
      }

      const result = await Quotation.updateStatus(parseInt(id), status);

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
      console.error("Error in QuotationController.updateStatus:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update quotation status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update delivery status
  static async updateDeliveryStatus(req, res) {
    try {
      const { id } = req.params;
      const { delivery_status } = req.body;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid quotation ID is required",
        });
      }

      if (
        !delivery_status ||
        !["pending", "delivered", "completed", "cancelled"].includes(
          delivery_status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid delivery status is required (pending, delivered, completed, cancelled)",
        });
      }

      const result = await Quotation.updateDeliveryStatus(
        parseInt(id),
        delivery_status
      );

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
      console.error(
        "Error in QuotationController.updateDeliveryStatus:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to update delivery status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Generate PDF
  static async generatePDF(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid quotation ID is required",
        });
      }

      // Get complete quotation data
      const quotation = await Quotation.getById(parseInt(id));
      if (!quotation) {
        return res.status(404).json({
          success: false,
          message: "Quotation not found",
        });
      }

      // Get default terms if needed
      if (!quotation.terms_conditions) {
        const defaultTerms = await TermsConditions.getDefault();
        quotation.terms_conditions = {
          default_term_ids: [],
          custom_terms: [],
          default_terms: defaultTerms,
        };
      } else {
        // Parse JSON terms_conditions and get default terms by IDs
        const termsConfig =
          typeof quotation.terms_conditions === "string"
            ? JSON.parse(quotation.terms_conditions)
            : quotation.terms_conditions;

        if (
          termsConfig.default_term_ids &&
          termsConfig.default_term_ids.length > 0
        ) {
          const defaultTerms = await TermsConditions.getByIds(
            termsConfig.default_term_ids
          );
          quotation.terms_conditions.default_terms = defaultTerms;
        }
      }

      // Generate PDF
      const pdfResult = await PDFService.generateQuotationPDF(quotation);

      if (pdfResult.success) {
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${pdfResult.filename}"`
        );
        res.send(pdfResult.buffer);

        if (pdfResult.cleanup) {
          await pdfResult.cleanup();
        }
      } else {
        res.status(500).json({
          success: false,
          message: pdfResult.message,
          error: pdfResult.error,
        });
      }
    } catch (error) {
      console.error("Error in QuotationController.generatePDF:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate PDF",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get next quotation number
  static async getNextNumber(req, res) {
    try {
      const nextNumber = await Quotation.getNextQuotationNumber();

      res.json({
        success: true,
        message: "Next quotation number retrieved successfully",
        data: {
          next_number: nextNumber,
          year: new Date().getFullYear(),
        },
      });
    } catch (error) {
      console.error("Error in QuotationController.getNextNumber:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get next quotation number",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get customer quotation history
  static async getCustomerHistory(req, res) {
    try {
      const { customerId } = req.params;

      if (!customerId || isNaN(customerId)) {
        return res.status(400).json({
          success: false,
          message: "Valid customer ID is required",
        });
      }

      const quotations = await Quotation.getAll({
        customer_id: parseInt(customerId),
      });

      res.json({
        success: true,
        message: "Customer quotation history retrieved successfully",
        data: quotations,
        count: quotations.length,
        customer_id: parseInt(customerId),
      });
    } catch (error) {
      console.error("Error in QuotationController.getCustomerHistory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve customer quotation history",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get pricing history
  static async getPricingHistory(req, res) {
    try {
      const { name, contact } = req.params;

      if (!name || !contact) {
        return res.status(400).json({
          success: false,
          message: "Customer name and contact are required",
        });
      }

      const quotations = await Quotation.getAll({
        customer_name: decodeURIComponent(name),
      });

      // Filter by contact as well
      const filteredQuotations = quotations.filter(
        (q) => q.customer_contact === contact
      );

      res.json({
        success: true,
        message: "Pricing history retrieved successfully",
        data: filteredQuotations,
        count: filteredQuotations.length,
        customer_name: decodeURIComponent(name),
        customer_contact: contact,
      });
    } catch (error) {
      console.error("Error in QuotationController.getPricingHistory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve pricing history",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get quotation statistics
  static async getStats(req, res, next) {
    try {
      const stats = await Quotation.getStats();

      res.json({
        success: true,
        message: "Quotation statistics retrieved successfully",
        data: {
          totalQuotations: parseInt(stats.total_quotations) || 0,
          pendingQuotations: parseInt(stats.pending_quotations) || 0,
          acceptedQuotations: parseInt(stats.accepted_quotations) || 0,
          rejectedQuotations: parseInt(stats.rejected_quotations) || 0,
          deliveredOrders: parseInt(stats.delivered_orders) || 0,
          totalRevenue: parseFloat(stats.total_revenue) || 0,
          averageQuotationAmount:
            Math.round(parseFloat(stats.average_quotation_amount)) || 0,
          conversionRate: parseFloat(stats.conversion_rate) || 0,
          recentQuotations: parseInt(stats.recent_quotations) || 0,
          todayQuotations: parseInt(stats.today_quotations) || 0,
          weekQuotations: parseInt(stats.week_quotations) || 0,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error in QuotationController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve quotation statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Export quotations
  static async exportQuotations(req, res) {
    try {
      const format = req.query.format || "excel";
      const filters = {
        status: req.query.status,
        delivery_status: req.query.delivery_status,
        customer_name: req.query.customer_name,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
      };

      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const quotations = await Quotation.getAll(filters);

      // Format data for export
      const exportData = quotations.map((quotation) => ({
        "Quotation Number": quotation.quotation_number,
        "Customer Name": quotation.customer_name,
        "Company Name": quotation.company_name || "",
        "Customer Contact": quotation.customer_contact,
        Machines: quotation.machines || "",
        "Total Items": quotation.total_items || 0,
        Subtotal: quotation.subtotal || 0,
        "GST Amount": quotation.total_gst_amount || 0,
        "Grand Total": quotation.grand_total,
        Status: quotation.quotation_status,
        "Delivery Status": quotation.delivery_status,
        "Created By": quotation.created_by_user || "",
        "Created Date": quotation.created_at,
        "Days Ago": quotation.days_ago || 0,
      }));

      res.json({
        success: true,
        message: `Quotation data exported successfully (${format})`,
        data: exportData,
        count: exportData.length,
        format: format,
        filename: `quotations_export_${
          new Date().toISOString().split("T")[0]
        }.${format === "excel" ? "xlsx" : "csv"}`,
      });
    } catch (error) {
      console.error("Error in QuotationController.exportQuotations:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export quotation data",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Helper method to process and validate quotation items
  static async processQuotationItems(items) {
    const errors = [];
    const processedItems = [];

    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        message: "At least one quotation item is required",
        errors: ["items array is required and cannot be empty"],
      };
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemErrors = [];

      // Validate item type
      if (
        !item.item_type ||
        !["machine", "additional_charge"].includes(item.item_type)
      ) {
        itemErrors.push(
          `Item ${i + 1}: item_type must be 'machine' or 'additional_charge'`
        );
      }

      // Validate machine_id for machine items
      if (item.item_type === "machine") {
        if (!item.machine_id || isNaN(item.machine_id)) {
          itemErrors.push(
            `Item ${i + 1}: machine_id is required for machine items`
          );
        } else {
          // Verify machine exists and is active
          const machine = await Machine.getById(parseInt(item.machine_id));
          if (!machine || !machine.is_active) {
            itemErrors.push(
              `Item ${i + 1}: Invalid or inactive machine selected`
            );
          }
        }
      }

      // Validate required fields
      if (!item.description || item.description.trim().length === 0) {
        itemErrors.push(`Item ${i + 1}: description is required`);
      }

      if (
        !item.quantity ||
        isNaN(item.quantity) ||
        parseFloat(item.quantity) <= 0
      ) {
        itemErrors.push(`Item ${i + 1}: quantity must be a positive number`);
      }

      if (
        !item.unit_price ||
        isNaN(item.unit_price) ||
        parseFloat(item.unit_price) <= 0
      ) {
        itemErrors.push(`Item ${i + 1}: unit_price must be a positive number`);
      }

      if (
        item.gst_percentage !== undefined &&
        (isNaN(item.gst_percentage) || parseFloat(item.gst_percentage) < 0)
      ) {
        itemErrors.push(
          `Item ${i + 1}: gst_percentage must be a non-negative number`
        );
      }

      if (itemErrors.length > 0) {
        errors.push(...itemErrors);
        continue;
      }

      // Calculate GST and totals
      const quantity = parseFloat(item.quantity);
      const unitPrice = parseFloat(item.unit_price);
      const gstPercentage = parseFloat(item.gst_percentage || 18);

      const subtotal = quantity * unitPrice;
      const gstAmount = (subtotal * gstPercentage) / 100;
      const totalAmount = subtotal + gstAmount;

      processedItems.push({
        item_type: item.item_type,
        machine_id: item.machine_id ? parseInt(item.machine_id) : null,
        description: item.description.trim(),
        duration_type: item.duration_type || null,
        quantity: quantity,
        unit_price: unitPrice,
        gst_percentage: gstPercentage,
        gst_amount: parseFloat(gstAmount.toFixed(2)),
        total_amount: parseFloat(totalAmount.toFixed(2)),
      });
    }

    if (errors.length > 0) {
      return {
        success: false,
        message: "Item validation failed",
        errors: errors,
      };
    }

    return {
      success: true,
      items: processedItems,
    };
  }
}

module.exports = QuotationController;
