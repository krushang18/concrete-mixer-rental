const Quotation = require("../models/Quotation");
const Customer = require("../models/Customer");
const QuotationMachine = require("../models/QuotationMachine");
const TermsConditions = require("../models/TermsConditions");
const PDFService = require("../services/pdfService");
const { validationResult } = require("express-validator");

class QuotationController {
  // Get all quotations
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const offset = (page - 1) * limit;

      const filters = {
        status: req.query.status,
        search: req.query.search,
        customer_name: req.query.customer_name,
        machine_id: req.query.machine_id,
        // Map date to start/end for single day filtering
        start_date: req.query.date || req.query.start_date, 
        end_date: req.query.date || req.query.end_date,
        sort_by: req.query.sort_by,
        sort_order: req.query.sort_order,
        limit,
        offset,
      };

      Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

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
      });
    } catch (error) {
      console.error("Error in QuotationController.getAll:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve quotations" });
    }
  }

  // Get quotation by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const quotation = await Quotation.getById(parseInt(id));
      if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });

      res.json({ success: true, data: quotation });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve quotation" });
    }
  }

  // Helper to format terms array into text
  static formatTerms(termsArray) {
    if (!termsArray || !Array.isArray(termsArray) || termsArray.length === 0) {
      return "";
    }
    return termsArray
      .map((term, index) => `${index + 1}. ${term.title}: ${term.description}`)
      .join("\n");
  }

  // Create new quotation
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      // Auto-fill terms if empty
      let termsText = req.body.terms_text;
      if (!termsText || termsText.trim() === "") {
           const defaultTerms = await TermsConditions.getDefault();
           termsText = QuotationController.formatTerms(defaultTerms);
      }

      const quotationData = {
        customer_name: req.body.customer_name?.trim(),
        customer_contact: req.body.customer_contact?.replace(/\D/g, ""),
        company_name: req.body.company_name?.trim(),
        customer_gst_number: req.body.customer_gst_number?.trim().toUpperCase(),
        customer_id: req.body.customer_id ? parseInt(req.body.customer_id) : null,
        items: req.body.items || [],
        terms_text: termsText,
        additional_notes: req.body.additional_notes?.trim(),
      };

      // Validate Machine Items
      for (const item of quotationData.items) {
          if (item.item_type === 'machine') {
              const machineId = item.quotation_machine_id || item.machine_id;
               if (!machineId) {
                   return res.status(400).json({ success: false, message: "Machine ID is required for machine items" });
               }
               // Check existence
               const machine = await QuotationMachine.getById(machineId);
               if (!machine) { // Removed is_active check as requested previously
                   return res.status(400).json({ success: false, message: `Quotation Machine ID ${machineId} is invalid` });
               }
          }
      }

      // Create Customer if needed
      if (!quotationData.customer_id && quotationData.customer_name && quotationData.customer_contact) {
         const customerResult = await Customer.getOrCreate({
             company_name: quotationData.company_name || quotationData.customer_name,
             phone: quotationData.customer_contact,
             contact_person: quotationData.customer_name,
             gst_number: quotationData.customer_gst_number
         });
         if (customerResult.success) quotationData.customer_id = customerResult.customer.id;
      }

      const result = await Quotation.create(quotationData, req.user.userId);
      if (result.success) {
          const newQuotation = await Quotation.getById(result.id);
          res.status(201).json({ success: true, message: result.message, data: { quotation: newQuotation } });
      } else {
          res.status(400).json({ success: false, message: result.message, errors: result.errors });
      }
    } catch (error) {
       console.error("Error creating quotation:", error);
       res.status(500).json({ success: false, message: "Failed to create quotation" });
    }
  }

  // Update quotation
  static async update(req, res) {
    try {
      const { id } = req.params;
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const updateData = {};
      const fields = ["customer_name", "customer_contact", "company_name", "customer_gst_number", "customer_id", "additional_notes", "quotation_status", "terms_text"];
      
      fields.forEach(f => {
          if (req.body[f] !== undefined) updateData[f] = req.body[f];
      });

      if (req.body.items) {
          updateData.items = req.body.items;
      }

      const result = await Quotation.update(parseInt(id), updateData, req.user.userId);
       if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Error in update:", error);
      res.status(500).json({ success: false, message: "Failed to update" });
    }
  }

  // Update Status
  static async updateStatus(req, res) {
     try {
         const { id } = req.params;
         const { status } = req.body;
         const result = await Quotation.updateStatus(parseInt(id), status);
         if (result.success) res.json({ success: true, message: result.message });
         else res.status(400).json({ success: false, message: result.message });
     } catch (error) {
         console.error("Error updating status:", error);
         res.status(500).json({ success: false, message: "Failed to update status" });
     }
  }

  // Generate PDF
  static async generatePDF(req, res) {
    try {
        const { id } = req.params;
        const quotation = await Quotation.getById(parseInt(id));
        if (!quotation) return res.status(404).json({ success: false, message: "Quotation not found" });
        
        if (!quotation.terms_text) {
             const defaultTerms = await TermsConditions.getDefault();
             quotation.terms_text = QuotationController.formatTerms(defaultTerms);
        }

        const pdfResult = await PDFService.generateQuotationPDF(quotation);
        
        if (pdfResult.success) {
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${pdfResult.filename}"`);
            res.send(pdfResult.buffer);
            if (pdfResult.cleanup) await pdfResult.cleanup();
        } else {
            res.status(500).json({ success: false, message: pdfResult.message });
        }
    } catch (error) {
        console.error("Error generating PDF:", error);
        res.status(500).json({ success: false, message: "Failed to generate PDF" });
    }
  }
  
  // Delete
  static async delete(req, res) {
      try {
          const result = await Quotation.delete(parseInt(req.params.id));
          if (result.success) res.json({ success: true, message: result.message });
          else res.status(400).json({ success: false, message: result.message });
      } catch(e) {
          res.status(500).json({ success: false, message: "Error deleting" });
      }
  }

  // --- Newly Added Methods ---

  // Get next quotation number
  static async getNextNumber(req, res) {
    try {
      const nextNumber = await Quotation.getNextQuotationNumber();
      res.json({ success: true, data: nextNumber });
    } catch (error) {
      console.error("Error getting next number:", error);
      res.status(500).json({ success: false, message: "Failed to get next number" });
    }
  }

  // Get customer history
  static async getCustomerHistory(req, res) {
      try {
          const { customerId } = req.params;
          const history = await Quotation.getCustomerHistory(customerId);
          res.json({ success: true, data: history });
      } catch (error) {
          console.error("Error getting customer history:", error);
          res.status(500).json({ success: false, message: "Failed to fetch history" });
      }
  }

  // Get pricing history
  static async getPricingHistory(req, res) {
      try {
          const { name, contact } = req.params;
          const history = await Quotation.getPricingHistory(name, contact);
          res.json({ success: true, data: history });
      } catch (error) {
          console.error("Error getting pricing history:", error);
          res.status(500).json({ success: false, message: "Failed to fetch pricing history" });
      }
  }

  // Export quotations
  static async exportQuotations(req, res) {
      try {
          const filters = req.query;
          const quotations = await Quotation.getAll(filters);
          res.json({ success: true, message: "Export feature returned JSON", data: quotations });
      } catch (error) {
          console.error("Error exporting:", error);
          res.status(500).json({ success: false, message: "Failed to export" });
      }
  }

  // Helpers


}

module.exports = QuotationController;
