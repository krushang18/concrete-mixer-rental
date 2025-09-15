const { executeQuery } = require("../config/database");

class Service {
  // Get all service records with filtering
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          sr.id,
          sr.machine_id,
          m.machine_number,
          m.name as machine_name,
          sr.service_date,
          sr.engine_hours,
          sr.site_location,
          sr.operator,
          sr.general_notes,
          sr.created_at,
          sr.updated_at,
          u.username as created_by_user,
          GROUP_CONCAT(DISTINCT sc.name ORDER BY sc.display_order SEPARATOR ', ') as services_performed,
          COUNT(srs.id) as service_count
        FROM service_records sr
        JOIN machines m ON sr.machine_id = m.id
        LEFT JOIN users u ON sr.created_by = u.id
        LEFT JOIN service_record_services srs ON sr.id = srs.service_record_id
        LEFT JOIN service_categories sc ON srs.service_category_id = sc.id
      `;

      const conditions = [];
      const params = [];

      // Apply filters
      if (filters.machine_id) {
        conditions.push("sr.machine_id = ?");
        params.push(filters.machine_id);
      }

      if (filters.start_date) {
        conditions.push("sr.service_date >= ?");
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        conditions.push("sr.service_date <= ?");
        params.push(filters.end_date);
      }

      if (filters.operator) {
        conditions.push("sr.operator LIKE ?");
        params.push(`%${filters.operator}%`);
      }

      if (filters.site_location) {
        conditions.push("sr.site_location LIKE ?");
        params.push(`%${filters.site_location}%`);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query +=
        " GROUP BY sr.id ORDER BY sr.service_date DESC, sr.created_at DESC";

      // Add pagination
      if (filters.limit) {
        query += " LIMIT ?";
        params.push(parseInt(filters.limit));

        if (filters.offset) {
          query += " OFFSET ?";
          params.push(parseInt(filters.offset));
        }
      }

      const serviceRecords = await executeQuery(query, params);
      return serviceRecords;
    } catch (error) {
      console.error("Error getting all service records:", error);
      throw error;
    }
  }

  // Get service record by ID with full details
  static async getById(id) {
    try {
      // Get main service record
      const mainQuery = `
        SELECT 
          sr.*,
          m.machine_number,
          m.name as machine_name,
          u.username as created_by_user
        FROM service_records sr
        JOIN machines m ON sr.machine_id = m.id
        LEFT JOIN users u ON sr.created_by = u.id
        WHERE sr.id = ?
        LIMIT 1
      `;

      const serviceRecord = await executeQuery(mainQuery, [id]);
      if (serviceRecord.length === 0) {
        return null;
      }

      const record = serviceRecord[0];

      // Get services performed
      const servicesQuery = `
        SELECT 
          srs.id as record_service_id,
          srs.service_category_id,
          sc.name as service_name,
          sc.description as service_description,
          srs.was_performed,
          srs.service_notes
        FROM service_record_services srs
        JOIN service_categories sc ON srs.service_category_id = sc.id
        WHERE srs.service_record_id = ?
        ORDER BY sc.display_order
      `;

      const services = await executeQuery(servicesQuery, [id]);

      // Get sub-services for each service
      for (let service of services) {
        const subServicesQuery = `
          SELECT 
            srss.id as record_sub_service_id,
            srss.sub_service_id,
            ssi.name as sub_service_name,
            ssi.description as sub_service_description,
            srss.was_performed,
            srss.sub_service_notes
          FROM service_record_sub_services srss
          JOIN service_sub_items ssi ON srss.sub_service_id = ssi.id
          WHERE srss.service_record_service_id = ?
          ORDER BY ssi.display_order
        `;

        const subServices = await executeQuery(subServicesQuery, [
          service.record_service_id,
        ]);
        service.sub_services = subServices;
      }

      record.services = services;
      return record;
    } catch (error) {
      console.error("Error getting service record by ID:", error);
      throw error;
    }
  }

  // Get service records for a specific machine
  static async getByMachine(machineId) {
    try {
      return await this.getAll({ machine_id: machineId });
    } catch (error) {
      console.error("Error getting service records by machine:", error);
      throw error;
    }
  }

  // Create new service record
  static async create(serviceData, userId) {
    try {
      const {
        machine_id,
        service_date,
        engine_hours,
        site_location,
        operator,
        general_notes,
        services, // Array of service objects with sub-services
      } = serviceData;

      // Validate required fields
      const validation = this.validateServiceData(serviceData);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      // Create main service record
      const mainQuery = `
        INSERT INTO service_records (
          machine_id,
          service_date,
          engine_hours,
          site_location,
          operator,
          general_notes,
          created_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const mainResult = await executeQuery(mainQuery, [
        machine_id,
        service_date,
        engine_hours || null,
        site_location || null,
        operator || null,
        general_notes || null,
        userId,
      ]);

      const serviceRecordId = mainResult.insertId;

      // Create service entries
      if (services && services.length > 0) {
        for (const service of services) {
          const serviceQuery = `
            INSERT INTO service_record_services (
              service_record_id,
              service_category_id,
              was_performed,
              service_notes,
              created_at
            ) VALUES (?, ?, ?, ?, NOW())
          `;

          const serviceResult = await executeQuery(serviceQuery, [
            serviceRecordId,
            service.category_id,
            service.was_performed ? 1 : 0,
            service.notes || null,
          ]);

          const recordServiceId = serviceResult.insertId;

          // Create sub-service entries
          if (service.sub_services && service.sub_services.length > 0) {
            for (const subService of service.sub_services) {
              const subServiceQuery = `
                INSERT INTO service_record_sub_services (
                  service_record_service_id,
                  sub_service_id,
                  was_performed,
                  sub_service_notes,
                  created_at
                ) VALUES (?, ?, ?, ?, NOW())
              `;

              await executeQuery(subServiceQuery, [
                recordServiceId,
                subService.sub_service_id,
                subService.was_performed ? 1 : 0,
                subService.notes || null,
              ]);
            }
          }
        }
      }

      return {
        success: true,
        id: serviceRecordId,
        message: "Service record created successfully",
      };
    } catch (error) {
      console.error("Error creating service record:", error);
      throw error;
    }
  }

  // Update service record
  static async update(id, serviceData, userId) {
    try {
      const {
        machine_id,
        service_date,
        engine_hours,
        site_location,
        operator,
        general_notes,
        services,
      } = serviceData;

      // Validate data
      const validation = this.validateServiceData(serviceData, true);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      // Check if service record exists
      const existingRecord = await this.getById(id);
      if (!existingRecord) {
        return {
          success: false,
          message: "Service record not found",
        };
      }

      // Update main service record
      const mainQuery = `
        UPDATE service_records 
        SET 
          machine_id = ?,
          service_date = ?,
          engine_hours = ?,
          site_location = ?,
          operator = ?,
          general_notes = ?,
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(mainQuery, [
        machine_id || existingRecord.machine_id,
        service_date || existingRecord.service_date,
        engine_hours !== undefined ? engine_hours : existingRecord.engine_hours,
        site_location !== undefined
          ? site_location
          : existingRecord.site_location,
        operator !== undefined ? operator : existingRecord.operator,
        general_notes !== undefined
          ? general_notes
          : existingRecord.general_notes,
        id,
      ]);

      // If services are provided, update them
      if (services && services.length > 0) {
        // Delete existing services and sub-services
        await executeQuery(
          "DELETE FROM service_record_sub_services WHERE service_record_service_id IN (SELECT id FROM service_record_services WHERE service_record_id = ?)",
          [id]
        );
        await executeQuery(
          "DELETE FROM service_record_services WHERE service_record_id = ?",
          [id]
        );

        // Re-create services (same logic as create)
        for (const service of services) {
          const serviceQuery = `
            INSERT INTO service_record_services (
              service_record_id,
              service_category_id,
              was_performed,
              service_notes,
              created_at
            ) VALUES (?, ?, ?, ?, NOW())
          `;

          const serviceResult = await executeQuery(serviceQuery, [
            id,
            service.category_id,
            service.was_performed ? 1 : 0,
            service.notes || null,
          ]);

          const recordServiceId = serviceResult.insertId;

          // Create sub-service entries
          if (service.sub_services && service.sub_services.length > 0) {
            for (const subService of service.sub_services) {
              const subServiceQuery = `
                INSERT INTO service_record_sub_services (
                  service_record_service_id,
                  sub_service_id,
                  was_performed,
                  sub_service_notes,
                  created_at
                ) VALUES (?, ?, ?, ?, NOW())
              `;

              await executeQuery(subServiceQuery, [
                recordServiceId,
                subService.sub_service_id,
                subService.was_performed ? 1 : 0,
                subService.notes || null,
              ]);
            }
          }
        }
      }

      return {
        success: true,
        message: "Service record updated successfully",
      };
    } catch (error) {
      console.error("Error updating service record:", error);
      throw error;
    }
  }

  // Delete service record
  static async delete(id) {
    try {
      // Check if service record exists
      const existingRecord = await this.getById(id);
      if (!existingRecord) {
        return {
          success: false,
          message: "Service record not found",
        };
      }

      // Delete related records first (cascading should handle this, but being explicit)
      await executeQuery(
        "DELETE FROM service_record_sub_services WHERE service_record_service_id IN (SELECT id FROM service_record_services WHERE service_record_id = ?)",
        [id]
      );
      await executeQuery(
        "DELETE FROM service_record_services WHERE service_record_id = ?",
        [id]
      );
      await executeQuery("DELETE FROM service_records WHERE id = ?", [id]);

      return {
        success: true,
        message: "Service record deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting service record:", error);
      throw error;
    }
  }

  // Get service categories with sub-services
  static async getServiceCategories() {
    try {
      const categoriesQuery = `
        SELECT 
          id,
          name,
          description,
          has_sub_services,
          is_active,
          display_order
        FROM service_categories
        WHERE is_active = 1
        ORDER BY display_order ASC, name ASC
      `;

      const categories = await executeQuery(categoriesQuery);

      // Get sub-services for each category
      for (let category of categories) {
        if (category.has_sub_services) {
          const subServicesQuery = `
            SELECT 
              id,
              name,
              description,
              display_order
            FROM service_sub_items
            WHERE category_id = ? AND is_active = 1
            ORDER BY display_order ASC, name ASC
          `;

          const subServices = await executeQuery(subServicesQuery, [
            category.id,
          ]);
          category.sub_services = subServices;
        } else {
          category.sub_services = [];
        }
      }

      return categories;
    } catch (error) {
      console.error("Error getting service categories:", error);
      throw error;
    }
  }

  // Get service statistics
  static async getStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_service_records,
          COUNT(CASE WHEN DATE(service_date) = CURDATE() THEN 1 END) as today_services,
          COUNT(CASE WHEN DATE(service_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as week_services,
          COUNT(CASE WHEN DATE(service_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as month_services,
          COUNT(DISTINCT machine_id) as machines_serviced,
          AVG(engine_hours) as avg_engine_hours
        FROM service_records
      `);

      return stats[0];
    } catch (error) {
      console.error("Error getting service stats:", error);
      throw error;
    }
  }

  // Get machines due for service (based on last service date)
  //   static async getMachinesDueForService(daysSinceLastService = 30) {
  //     try {
  //       const query = `
  //         SELECT
  //           m.id,
  //           m.machine_number,
  //           m.name as machine_name,
  //           MAX(sr.service_date) as last_service_date,
  //           DATEDIFF(CURDATE(), MAX(sr.service_date)) as days_since_service,
  //           COUNT(sr.id) as total_services
  //         FROM machines m
  //         LEFT JOIN service_records sr ON m.id = sr.machine_id
  //         WHERE m.is_active = 1
  //         GROUP BY m.id
  //         HAVING
  //           last_service_date IS NULL OR
  //           DATEDIFF(CURDATE(), MAX(sr.service_date)) >= ?
  //         ORDER BY days_since_service DESC, machine_number ASC
  //       `;

  //       const machines = await executeQuery(query, [daysSinceLastService]);
  //       return machines;
  //     } catch (error) {
  //       console.error("Error getting machines due for service:", error);
  //       throw error;
  //     }
  //   }

  // Get service history summary for a machine
  static async getMachineServiceSummary(machineId) {
    try {
      const summaryQuery = `
        SELECT 
          COUNT(*) as total_services,
          MAX(service_date) as last_service_date,
          MIN(service_date) as first_service_date,
          AVG(engine_hours) as avg_engine_hours,
          MAX(engine_hours) as max_engine_hours,
          COUNT(CASE WHEN DATE(service_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as recent_services
        FROM service_records
        WHERE machine_id = ?
      `;

      const summary = await executeQuery(summaryQuery, [machineId]);

      // Get most common services
      const commonServicesQuery = `
        SELECT 
          sc.name as service_name,
          COUNT(*) as frequency
        FROM service_record_services srs
        JOIN service_categories sc ON srs.service_category_id = sc.id
        JOIN service_records sr ON srs.service_record_id = sr.id
        WHERE sr.machine_id = ? AND srs.was_performed = 1
        GROUP BY sc.id
        ORDER BY frequency DESC
        LIMIT 5
      `;

      const commonServices = await executeQuery(commonServicesQuery, [
        machineId,
      ]);

      return {
        ...summary[0],
        common_services: commonServices,
      };
    } catch (error) {
      console.error("Error getting machine service summary:", error);
      throw error;
    }
  }

  // Validate service data
  static validateServiceData(data, isUpdate = false) {
    const errors = [];
    const { machine_id, service_date, engine_hours } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!machine_id || isNaN(machine_id)) {
        errors.push("Valid machine ID is required");
      }

      if (!service_date) {
        errors.push("Service date is required");
      }
    }

    // Validation for provided fields
    if (service_date !== undefined) {
      const date = new Date(service_date);
      if (isNaN(date.getTime())) {
        errors.push("Valid service date is required");
      }

      // Check if service date is not in the future
      if (date > new Date()) {
        errors.push("Service date cannot be in the future");
      }
    }

    if (engine_hours !== undefined && engine_hours !== null) {
      if (isNaN(engine_hours) || engine_hours < 0) {
        errors.push("Engine hours must be a positive number");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Create service category
  static async createServiceCategory(categoryData) {
    try {
      const { name, description, has_sub_services, display_order } =
        categoryData;

      if (!name || name.trim().length === 0) {
        return {
          success: false,
          message: "Category name is required",
        };
      }

      // Get next display order if not provided
      let finalDisplayOrder = display_order;
      if (!finalDisplayOrder) {
        const maxOrderResult = await executeQuery(
          "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM service_categories"
        );
        finalDisplayOrder = maxOrderResult[0].next_order;
      }

      const query = `
        INSERT INTO service_categories (
          name,
          description,
          has_sub_services,
          is_active,
          display_order,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 1, ?, NOW(), NOW())
      `;

      const result = await executeQuery(query, [
        name,
        description || null,
        has_sub_services ? 1 : 0,
        finalDisplayOrder,
      ]);

      return {
        success: true,
        id: result.insertId,
        message: "Service category created successfully",
      };
    } catch (error) {
      console.error("Error creating service category:", error);
      throw error;
    }
  }

  // Create sub-service item
  static async createSubServiceItem(subServiceData) {
    try {
      const { category_id, name, description, display_order } = subServiceData;

      if (!category_id || isNaN(category_id)) {
        return {
          success: false,
          message: "Valid category ID is required",
        };
      }

      if (!name || name.trim().length === 0) {
        return {
          success: false,
          message: "Sub-service name is required",
        };
      }

      // Get next display order if not provided
      let finalDisplayOrder = display_order;
      if (!finalDisplayOrder) {
        const maxOrderResult = await executeQuery(
          "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM service_sub_items WHERE category_id = ?",
          [category_id]
        );
        finalDisplayOrder = maxOrderResult[0].next_order;
      }

      const query = `
        INSERT INTO service_sub_items (
          category_id,
          name,
          description,
          is_active,
          display_order,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 1, ?, NOW(), NOW())
      `;

      const result = await executeQuery(query, [
        category_id,
        name,
        description || null,
        finalDisplayOrder,
      ]);

      return {
        success: true,
        id: result.insertId,
        message: "Sub-service item created successfully",
      };
    } catch (error) {
      console.error("Error creating sub-service item:", error);
      throw error;
    }
  }

  // Export service records to CSV format
  static async exportToCSV(filters = {}) {
    try {
      const records = await this.getAll(filters);

      const csvData = records.map((record) => ({
        machine_number: record.machine_number,
        machine_name: record.machine_name,
        service_date: record.service_date,
        engine_hours: record.engine_hours || "",
        site_location: record.site_location || "",
        operator: record.operator || "",
        services_performed: record.services_performed || "",
        general_notes: record.general_notes || "",
        created_by: record.created_by_user || "",
        created_at: record.created_at,
      }));

      return {
        success: true,
        data: csvData,
        headers: [
          "Machine Number",
          "Machine Name",
          "Service Date",
          "Engine Hours",
          "Site Location",
          "Operator",
          "Services Performed",
          "General Notes",
          "Created By",
          "Created At",
        ],
      };
    } catch (error) {
      console.error("Error exporting service records to CSV:", error);
      throw error;
    }
  }
}

module.exports = Service;
