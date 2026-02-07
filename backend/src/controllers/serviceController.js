const Service = require("../models/Service");
const { executeQuery } = require("../config/database");

class ServiceController {
  // Get all service records
  static async getAll(req, res) {
    try {
      // Clean up filter values - remove empty strings and undefined
      const filters = {};

      if (req.query.machine_id && req.query.machine_id.trim() !== "") {
        filters.machine_id = req.query.machine_id;
      }

      if (req.query.start_date && req.query.start_date.trim() !== "") {
        filters.start_date = req.query.start_date;
      }

      if (req.query.end_date && req.query.end_date.trim() !== "") {
        filters.end_date = req.query.end_date;
      }

      if (req.query.operator && req.query.operator.trim() !== "") {
        filters.operator = req.query.operator;
      }

      if (req.query.site_location && req.query.site_location.trim() !== "") {
        filters.site_location = req.query.site_location;
      }

      // Always include limit and offset with defaults
      filters.limit = req.query.limit ? parseInt(req.query.limit) : 20;
      filters.offset = req.query.offset ? parseInt(req.query.offset) : 0;

      console.log("Processed filters:", filters);

      const serviceRecords = await Service.getAll(filters);

      res.json({
        success: true,
        message: "Service records retrieved successfully",
        data: serviceRecords,
        count: serviceRecords.length,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: serviceRecords.length === filters.limit,
        },
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
      const services = await Service.getByMachine(machineId);

      res.json({
        success: true,
        message: "Machine services retrieved successfully",
        data: services,
      });
    } catch (error) {
      console.error("Error in ServiceController.getByMachine:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve machine services",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async create(req, res) {
    try {
      const serviceId = await Service.create(req.body);

      res.json({
        success: true,
        message: "Service record created successfully",
        data: { id: serviceId },
      });
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
      await Service.update(id, req.body);

      res.json({
        success: true,
        message: "Service record updated successfully",
      });
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
      await Service.delete(id);

      res.json({
        success: true,
        message: "Service record deleted successfully",
      });
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

  static async getServiceCategories(req, res) {
    try {
      const categoriesWithSubServices = await Service.getServiceCategories();
      res.json({
        success: true,
        message: "Service categories retrieved successfully",
        data: categoriesWithSubServices,
      });
    } catch (error) {
      console.error("Error in ServiceController.getServiceCategories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve service categories",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  static async getSubServices(req, res) {
    try {
      const { categoryId } = req.params;
      const subServices = await Service.getSubServices(categoryId);

      res.json({
        success: true,
        message: "Sub-services retrieved successfully",
        data: subServices,
      });
    } catch (error) {
      console.error("Error in ServiceController.getSubServices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve sub-services",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update service category
  static async updateServiceCategory(req, res) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const result = await Service.updateServiceCategory(id, name, description);
      res.json(result);
    } catch (error) {
      console.error("Error in ServiceController.updateServiceCategory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update service category",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete service category
  static async deleteServiceCategory(req, res) {
    try {
      const { id } = req.params;
      const result = await Service.deleteServiceCategory(id);
      
      if (result.success) {
         res.json(result);
      } else {
         res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in ServiceController.deleteServiceCategory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete service category",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Update sub-service item
  static async updateSubServiceItem(req, res) {
    try {
      const { id } = req.params;
      const { category_id, name, description } = req.body;
      const result = await Service.updateSubServiceItem(id, category_id, name, description);
      res.json(result);
    } catch (error) {
      console.error("Error in ServiceController.updateSubServiceItem:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update sub-service",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Delete sub-service item
  static async deleteSubServiceItem(req, res) {
    try {
      const { id } = req.params;
      const result = await Service.deleteSubServiceItem(id);
      res.json(result);
    } catch (error) {
      console.error("Error in ServiceController.deleteSubServiceItem:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete sub-service",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
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
      const result = await Service.createServiceCategory(req.body);
      res.json({
        success: true,
        message: result.message,
        data: { id: result.id },
      });
    } catch (error) {
      console.error("Error in ServiceController.createServiceCategory:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create service category",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Create sub-service item
  static async createSubServiceItem(req, res) {
    try {
      const result = await Service.createSubServiceItem(req.body);
      res.json({
        success: true,
        message: result.message,
        data: { id: result.id },
      });
    } catch (error) {
      console.error("Error in ServiceController.createSubServiceItem:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create sub-service item",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Export service records to CSV
  // Updated ServiceController.exportToCSV method
  static async exportToCSV(req, res) {
    try {
      // Get filters from query parameters (same as getAll method)
      const filters = {
        machine_id: req.query.machine_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        operator: req.query.operator,
        site_location: req.query.site_location,
        // Don't apply pagination limits for export - get all matching records
        limit: null,
        offset: null,
      };

      // Remove undefined values
      Object.keys(filters).forEach(
        (key) => filters[key] === undefined && delete filters[key]
      );

      console.log("Exporting with filters:", filters);

      // Get the export data from the model
      const exportResult = await Service.exportToCSV(filters);

      if (!exportResult.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to generate export data",
        });
      }

      const { data: csvData, headers } = exportResult;

      // Convert data to CSV format
      const csvRows = [];

      // Add headers
      csvRows.push(headers.join(","));

      // Add data rows
      csvData.forEach((record) => {
        const row = [
          `"${record.machine_number || ""}"`,
          `"${record.machine_name || ""}"`,
          `"${record.service_date || ""}"`,
          `"${record.engine_hours || ""}"`,
          `"${record.site_location || ""}"`,
          `"${record.operator || ""}"`,
          `"${record.services_performed || ""}"`,
          `"${record.general_notes || ""}"`,
          `"${record.created_by || ""}"`,
          `"${record.created_at || ""}"`,
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0];
      const filename = `service-records-export-${currentDate}.csv`;

      // Set response headers for file download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader("Content-Length", Buffer.byteLength(csvContent, "utf8"));

      // Send CSV content
      res.status(200).send(csvContent);
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
