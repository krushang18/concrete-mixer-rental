const Machine = require("../models/Machine");
const { validationResult } = require("express-validator");

class MachineController {
  // Get all machines
  // Fixed MachineController.getAll method
  static async getAll(req, res) {
    try {
      const filters = {
        is_active: req.query.is_active,
        search: req.query.search,
        limit: req.query.limit,
        offset: req.query.offset,
      };

      console.log("Controller filters - is_active:", filters.is_active);
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

  // Get active machines only
  static async getActive(req, res) {
    try {
      const machines = await Machine.getActive();

      res.json({
        success: true,
        message: "Active machines retrieved successfully",
        data: machines,
        count: machines.length,
      });
    } catch (error) {
      console.error("Error in MachineController.getActive:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve active machines",
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
        priceByDay: parseFloat(req.body.priceByDay),
        priceByWeek: parseFloat(req.body.priceByWeek),
        priceByMonth: parseFloat(req.body.priceByMonth),
        gst_percentage: req.body.gst_percentage
          ? parseFloat(req.body.gst_percentage)
          : 18.0,
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
      if (req.body.priceByDay !== undefined) {
        updateData.priceByDay = parseFloat(req.body.priceByDay);
      }
      if (req.body.priceByWeek !== undefined) {
        updateData.priceByWeek = parseFloat(req.body.priceByWeek);
      }
      if (req.body.priceByMonth !== undefined) {
        updateData.priceByMonth = parseFloat(req.body.priceByMonth);
      }
      if (req.body.gst_percentage !== undefined) {
        updateData.gst_percentage = parseFloat(req.body.gst_percentage);
      }
      if (req.body.is_active !== undefined) {
        updateData.is_active = req.body.is_active ? 1 : 0;
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

  // Bulk update machines
  static async bulkUpdate(req, res) {
    try {
      const { machine_ids, updates } = req.body;

      if (
        !machine_ids ||
        !Array.isArray(machine_ids) ||
        machine_ids.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Machine IDs array is required",
        });
      }

      if (!updates || typeof updates !== "object") {
        return res.status(400).json({
          success: false,
          message: "Updates object is required",
        });
      }

      const result = await Machine.bulkUpdate({ machine_ids, updates });

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
      console.error("Error in MachineController.bulkUpdate:", error);
      res.status(500).json({
        success: false,
        message: "Failed to bulk update machines",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get machine statistics
  static async getStats(req, res, next) {
    try {
      console.log("MachineController.getStats: Starting...");

      const stats = await Machine.getStats();
      console.log("MachineController.getStats: Got stats from model:", stats);

      const responseData = {
        success: true,
        message: "Machine statistics retrieved successfully",
        data: {
          totalMachines: parseInt(stats.total_machines) || 0,
          activeMachines: parseInt(stats.active_machines) || 0,
          inactiveMachines: parseInt(stats.inactive_machines) || 0,
          averageDailyPrice: Math.round(parseFloat(stats.avg_daily_price)) || 0,
          minDailyPrice: parseFloat(stats.min_daily_price) || 0,
          maxDailyPrice: parseFloat(stats.max_daily_price) || 0,
          lastUpdated: new Date().toISOString(),
        },
      };

      console.log("MachineController.getStats: Sending JSON response");
      res.json(responseData);
    } catch (error) {
      console.error("Error in MachineController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve machine statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Separate method for internal calls (if needed by DashboardController)
  static async getStatsData() {
    try {
      const stats = await Machine.getStats();
      return {
        totalMachines: parseInt(stats.total_machines) || 0,
        activeMachines: parseInt(stats.active_machines) || 0,
        inactiveMachines: parseInt(stats.inactive_machines) || 0,
        averageDailyPrice: Math.round(parseFloat(stats.avg_daily_price)) || 0,
        minDailyPrice: parseFloat(stats.min_daily_price) || 0,
        maxDailyPrice: parseFloat(stats.max_daily_price) || 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting machine stats data:", error);
      return {
        totalMachines: 0,
        activeMachines: 0,
        inactiveMachines: 0,
        averageDailyPrice: 0,
        minDailyPrice: 0,
        maxDailyPrice: 0,
        error: "Failed to load machine statistics",
      };
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
        is_active: 1, // Only search active machines
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

  // Toggle machine active status
  static async toggleStatus(req, res) {
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

      const newStatus = machine.is_active ? 0 : 1;
      const result = await Machine.update(parseInt(id), {
        is_active: newStatus,
      });

      if (result.success) {
        res.json({
          success: true,
          message: `Machine ${
            newStatus ? "activated" : "deactivated"
          } successfully`,
          data: { is_active: newStatus },
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error("Error in MachineController.toggleStatus:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle machine status",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get machine pricing for quotation
  static async getPricing(req, res) {
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

      if (!machine.is_active) {
        return res.status(400).json({
          success: false,
          message: "Machine is not available for quotation",
        });
      }

      res.json({
        success: true,
        message: "Machine pricing retrieved successfully",
        data: {
          id: machine.id,
          machine_number: machine.machine_number,
          name: machine.name,
          pricing: {
            daily: machine.priceByDay,
            weekly: machine.priceByWeek,
            monthly: machine.priceByMonth,
            gst_percentage: machine.gst_percentage,
          },
        },
      });
    } catch (error) {
      console.error("Error in MachineController.getPricing:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve machine pricing",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = MachineController;
