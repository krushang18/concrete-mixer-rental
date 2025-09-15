const Service = require("../models/Service");
const { validationResult } = require("express-validator");

class ServiceController {
  // Get all service records
  static async getAll(req, res) {
    try {
      const filters = {
        machine_id: req.query.machine_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        operator: req.query.operator,
        site_location: req.query.site_location,
        limit: req.query.limit,
        offset: req.query.offset,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const serviceRecords = await Service.getAll(filters);

      res.json({
        success: true,
        message: "Service records retrieved successfully",
        data: serviceRecords,
        count: serviceRecords.length,
        filters: filters,
      });
    } catch (error) {
      console.error("Error in ServiceController.getAll:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve service records",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get service record by ID
  static async getById(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid service record ID is required",
        });
      }

      const serviceRecord = await Service.getById(parseInt(id));

      if (!serviceRecord) {
        return res.status(404).json({
          success: false,
          message: "Service record not found",
        });
      }

      res.json({
        success: true,
        message: "Service record retrieved successfully",
        data: serviceRecord,
      });
    } catch (error) {
      console.error("Error in ServiceController.getById:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve service record",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get service records for a machine
  static async getByMachine(req, res) {
    try {
      const { machineId } = req.params;

      if (!machineId || isNaN(machineId)) {
        return res.status(400).json({
          success: false,
          message: "Valid machine ID is required",
        });
      }

      const serviceRecords = await Service.getByMachine(parseInt(machineId));

      res.json({
        success: true,
        message: "Machine service records retrieved successfully",
        data: serviceRecords,
        count: serviceRecords.length,
        machineId: parseInt(machineId),
      });
    } catch (error) {
      console.error("Error in ServiceController.getByMachine:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve machine service records",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create new service record
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

      const serviceData = {
        machine_id: parseInt(req.body.machine_id),
        service_date: req.body.service_date,
        engine_hours: req.body.engine_hours
          ? parseFloat(req.body.engine_hours)
          : null,
        site_location: req.body.site_location?.trim(),
        operator: req.body.operator?.trim(),
        general_notes: req.body.general_notes?.trim(),
        services: req.body.services || [], // Array of service objects
      };

      const result = await Service.create(serviceData, req.user.userId);

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
      console.error("Error in ServiceController.create:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create service record",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update service record
  static async update(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid service record ID is required",
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

      const updateData = {
        machine_id: req.body.machine_id
          ? parseInt(req.body.machine_id)
          : undefined,
        service_date: req.body.service_date,
        engine_hours: req.body.engine_hours
          ? parseFloat(req.body.engine_hours)
          : undefined,
        site_location: req.body.site_location?.trim(),
        operator: req.body.operator?.trim(),
        general_notes: req.body.general_notes?.trim(),
        services: req.body.services || [],
      };

      // Remove undefined values
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key]
      );

      const result = await Service.update(
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
      console.error("Error in ServiceController.update:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update service record",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete service record
  static async delete(req, res) {
    try {
      const { id } = req.params;

      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: "Valid service record ID is required",
        });
      }

      const result = await Service.delete(parseInt(id));

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
      console.error("Error in ServiceController.delete:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete service record",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get service categories with sub-services
  static async getServiceCategories(req, res) {
    try {
      const categories = await Service.getServiceCategories();

      res.json({
        success: true,
        message: "Service categories retrieved successfully",
        data: categories,
        count: categories.length,
      });
    } catch (error) {
      console.error("Error in ServiceController.getServiceCategories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve service categories",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get service statistics
  // Get service statistics - for Express routes only
  static async getStats(req, res, next) {
    try {
      console.log("ServiceController.getStats: Starting...");
      const stats = await Service.getStats();
      console.log("ServiceController.getStats: Got stats from model:", stats);

      const responseData = {
        success: true,
        message: "Service statistics retrieved successfully",
        data: {
          totalServiceRecords: parseInt(stats.total_service_records) || 0,
          todayServices: parseInt(stats.today_services) || 0,
          weekServices: parseInt(stats.week_services) || 0,
          monthServices: parseInt(stats.month_services) || 0,
          machinesServiced: parseInt(stats.machines_serviced) || 0,
          averageEngineHours:
            Math.round(parseFloat(stats.avg_engine_hours)) || 0,
          lastUpdated: new Date().toISOString(),
        },
      };

      console.log("ServiceController.getStats: Sending JSON response");
      res.json(responseData);
    } catch (error) {
      console.error("Error in ServiceController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve service statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Separate method for internal calls (if needed by DashboardController)
  static async getStatsData() {
    try {
      const stats = await Service.getStats();
      return {
        totalServiceRecords: parseInt(stats.total_service_records) || 0,
        todayServices: parseInt(stats.today_services) || 0,
        weekServices: parseInt(stats.week_services) || 0,
        monthServices: parseInt(stats.month_services) || 0,
        machinesServiced: parseInt(stats.machines_serviced) || 0,
        averageEngineHours: Math.round(parseFloat(stats.avg_engine_hours)) || 0,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error getting service stats data:", error);
      return {
        totalServiceRecords: 0,
        todayServices: 0,
        weekServices: 0,
        monthServices: 0,
        machinesServiced: 0,
        averageEngineHours: 0,
        error: "Failed to load service statistics",
      };
    }
  }

  // Get machine service summary
  static async getMachineServiceSummary(req, res) {
    try {
      const { machineId } = req.params;

      if (!machineId || isNaN(machineId)) {
        return res.status(400).json({
          success: false,
          message: "Valid machine ID is required",
        });
      }

      const summary = await Service.getMachineServiceSummary(
        parseInt(machineId)
      );

      res.json({
        success: true,
        message: "Machine service summary retrieved successfully",
        data: summary,
        machineId: parseInt(machineId),
      });
    } catch (error) {
      console.error(
        "Error in ServiceController.getMachineServiceSummary:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to retrieve machine service summary",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create service category
  static async createServiceCategory(req, res) {
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

      const categoryData = {
        name: req.body.name?.trim(),
        description: req.body.description?.trim(),
        has_sub_services: req.body.has_sub_services || false,
        display_order: req.body.display_order,
      };

      const result = await Service.createServiceCategory(categoryData);

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
        });
      }
    } catch (error) {
      console.error("Error in ServiceController.createServiceCategory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create service category",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create sub-service item
  static async createSubServiceItem(req, res) {
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

      const subServiceData = {
        category_id: parseInt(req.body.category_id),
        name: req.body.name?.trim(),
        description: req.body.description?.trim(),
        display_order: req.body.display_order,
      };

      const result = await Service.createSubServiceItem(subServiceData);

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
        });
      }
    } catch (error) {
      console.error("Error in ServiceController.createSubServiceItem:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create sub-service item",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Export service records to CSV
  static async exportToCSV(req, res) {
    try {
      const filters = {
        machine_id: req.query.machine_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        operator: req.query.operator,
        site_location: req.query.site_location,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      const result = await Service.exportToCSV(filters);

      if (result.success) {
        res.json({
          success: true,
          message: "Service records exported successfully",
          data: result.data,
          headers: result.headers,
          count: result.data.length,
          filename: `service_records_export_${
            new Date().toISOString().split("T")[0]
          }.csv`,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to export service records",
        });
      }
    } catch (error) {
      console.error("Error in ServiceController.exportToCSV:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export service records",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = ServiceController;
