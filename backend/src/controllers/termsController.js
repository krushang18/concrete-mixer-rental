const TermsConditions = require("../models/TermsConditions");


class TermsController {
  // Get all terms and conditions
  static async getAll(req, res) {
    try {
      const filters = {
        is_default: req.query.is_default,
        search: req.query.search,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const termsConditions = await TermsConditions.getAll(filters);

      res.json({
        success: true,
        message: "Terms and conditions retrieved successfully",
        data: termsConditions,
        count: termsConditions.length,
        filters: filters,
      });
    } catch (error) {
      console.error("Error in TermsController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get terms and conditions by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid terms and conditions ID is required",
        });
      }

      const termsConditions = await TermsConditions.getById(parseInt(id));

      if (!termsConditions) {
        return res.status(404).json({
          success: false,
          message: "Terms and conditions not found",
        });
      }

      res.json({
        success: true,
        message: "Terms and conditions retrieved successfully",
        data: termsConditions,
      });
    } catch (error) {
      console.error("Error in TermsController.getById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get default terms and conditions
  static async getDefault(req, res) {
    try {
      const defaultTerms = await TermsConditions.getDefault();

      res.json({
        success: true,
        message: "Default terms and conditions retrieved successfully",
        data: defaultTerms,
        count: defaultTerms.length,
      });
    } catch (error) {
      console.error("Error in TermsController.getDefault:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve default terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }



  // Create new terms and conditions
  static async create(req, res) {
    try {
      const tcData = {
        title: req.body.title?.trim(),
        description: req.body.description?.trim(),
        is_default: req.body.is_default || false,
        display_order: req.body.display_order,
      };

      const result = await TermsConditions.create(tcData);

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
        });
      }
    } catch (error) {
      console.error("Error in TermsController.create:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update terms and conditions
  static async update(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid terms and conditions ID is required",
        });
      }

      const updateData = {
        title: req.body.title?.trim(),
        description: req.body.description?.trim(),
        is_default: req.body.is_default,
        display_order: req.body.display_order,
      };

      // Remove undefined values
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const result = await TermsConditions.update(parseInt(id), updateData);

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
      console.error("Error in TermsController.update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete terms and conditions
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid terms and conditions ID is required",
        });
      }

      const result = await TermsConditions.delete(parseInt(id));

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
      console.error("Error in TermsController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Reorder terms and conditions
  static async reorder(req, res) {
    try {
      const { items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Items array is required for reordering",
        });
      }

      const result = await TermsConditions.reorder({ items });

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
      console.error("Error in TermsController.reorder:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reorder terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Set default terms and conditions
  static async setDefault(req, res) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Terms and conditions IDs array is required",
        });
      }

      const result = await TermsConditions.setDefault(ids);

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
      console.error("Error in TermsController.setDefault:", error);
      res.status(500).json({
        success: false,
        message: "Failed to set default terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Duplicate terms and conditions
  static async duplicate(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid terms and conditions ID is required",
        });
      }

      const result = await TermsConditions.duplicate(parseInt(id));

      if (result.success) {
        res.status(201).json({
          success: true,
          message: result.message,
          data: { id: result.id },
        });
      } else {
        res.status(404).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in TermsController.duplicate:", error);
      res.status(500).json({
        success: false,
        message: "Failed to duplicate terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Bulk delete terms and conditions
  static async bulkDelete(req, res) {
    try {

      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Terms and conditions IDs array is required",
        });
      }

      const result = await TermsConditions.bulkDelete(ids);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          deletedCount: result.deletedCount,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in TermsController.bulkDelete:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk delete terms and conditions",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get terms and conditions for quotation (formatted for selection)
  static async getForQuotation(req, res) {
    try {
      const result = await TermsConditions.getForQuotation();

      res.json({
        success: true,
        message: "Terms and conditions for quotation retrieved successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error in TermsController.getForQuotation:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve terms and conditions for quotation",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = TermsController;
