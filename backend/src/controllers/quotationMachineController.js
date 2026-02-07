const QuotationMachine = require("../models/QuotationMachine");
const { validationResult } = require("express-validator");

class QuotationMachineController {
  // Get all machines
  // Get all machines with pagination
  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search,
        limit,
        offset,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder
      };

      const [machines, total] = await Promise.all([
        QuotationMachine.getAll(filters),
        QuotationMachine.count(filters)
      ]);

      const totalPages = Math.ceil(total / limit);
      
      res.json({
        success: true,
        message: "Pricing catalog retrieved successfully",
        data: machines,
        pagination: {
          total,
          per_page: limit,
          current_page: page,
          total_pages: totalPages,
          has_next_page: page < totalPages,
          has_prev_page: page > 1,
          from: offset + 1,
          to: Math.min(offset + limit, total)
        }
      });
    } catch (error) {
      console.error("Error in QuotationMachineController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve pricing catalog",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get machine by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;
      if (!id || isNaN(id)) {
        return res.status(400).json({ success: false, message: "Valid ID required" });
      }

      const machine = await QuotationMachine.getById(parseInt(id));
      if (!machine) {
        return res.status(404).json({ success: false, message: "Item not found" });
      }

      res.json({ success: true, data: machine });
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ success: false, message: "Failed to retrieve item" });
    }
  }

  // Create
  static async create(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const result = await QuotationMachine.create(req.body);
      if (result.success) {
        res.status(201).json({ success: true, message: result.message, data: { id: result.id } });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
       console.error("Error:", error);
       res.status(500).json({ success: false, message: "Failed to create item" });
    }
  }

  // Update
  static async update(req, res) {
    try {
      const { id } = req.params;
      const result = await QuotationMachine.update(parseInt(id), req.body);
      
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ success: false, message: "Failed to update item" });
    }
  }

  // Delete
  static async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await QuotationMachine.delete(parseInt(id));
      
       if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, message: result.message });
      }
    } catch (error) {
       console.error("Error:", error);
       res.status(500).json({ success: false, message: "Failed to delete item" });
    }
  }
}

module.exports = QuotationMachineController;
