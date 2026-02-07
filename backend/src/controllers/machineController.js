const Machine = require("../models/Machine");
const { validationResult } = require("express-validator");

class MachineController {
  // Get all machines
  // Fixed MachineController.getAll method
  static async getAll(req, res) {
    try {
      const filters = {
        search: req.query.search,
        limit: req.query.limit,
        offset: req.query.offset,
      };


      console.log("Controller filters - search:", filters.search);
      console.log("Controller filters - limit:", filters.limit);
      console.log("Controller filters - offset:", filters.offset);

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      console.log("Cleaned filters:", filters);

      const machines = await Machine.getAll(filters); // ✅ Pass filters object, not req

      res.json({
        success: true,
        message: "Machines retrieved successfully",
        data: machines,
        count: machines.length,
        filters: filters,
      });
    } catch (error) {
      console.error("Error in MachineController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve machines",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }



  // Get machine by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid machine ID is required",
        });
      }

      const machine = await Machine.getById(parseInt(id));

      if (!machine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      res.json({
        success: true,
        message: "Machine retrieved successfully",
        data: machine,
      });
    } catch (error) {
      console.error("Error in MachineController.getById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve machine",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create new machine
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

      const machineData = {
        machine_number: req.body.machine_number?.trim(),
        name: req.body.name?.trim(),
        description: req.body.description?.trim(),
      };

      const result = await Machine.create(machineData);

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
      console.error("Error in MachineController.create:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create machine",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update machine
  static async update(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid machine ID is required",
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
      if (req.body.machine_number !== undefined) {
        updateData.machine_number = req.body.machine_number.trim();
      }
      if (req.body.name !== undefined) {
        updateData.name = req.body.name.trim();
      }
      if (req.body.description !== undefined) {
        updateData.description = req.body.description.trim();
      }



      const result = await Machine.update(parseInt(id), updateData);

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
      console.error("Error in MachineController.update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update machine",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete machine
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid machine ID is required",
        });
      }

      const result = await Machine.delete(parseInt(id));

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
      console.error("Error in MachineController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete machine",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }



  // Search machines
  static async search(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      const machines = await Machine.getAll({
        search: query.trim(),
      });

      res.json({
        success: true,
        message: "Search completed successfully",
        data: machines,
        count: machines.length,
        searchQuery: query,
      });
    } catch (error) {
      console.error("Error in MachineController.search:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search machines",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }




}

module.exports = MachineController;
