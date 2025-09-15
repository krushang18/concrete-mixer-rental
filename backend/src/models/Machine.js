const { executeQuery } = require("../config/database");

class Machine {
  // Get all machines with optional filtering
  // Simple Machine.getAll in Machine.js model
  static async getAll(filters = {}) {
    console.log("Machine.getAll called with filters:", {
      is_active: filters.is_active,
      search: filters.search,
      limit: filters.limit,
      offset: filters.offset,
    });

    try {
      let query = `
      SELECT 
        id, machine_number, name, description,
        priceByDay, priceByWeek, priceByMonth,
        gst_percentage, is_active, created_at, updated_at
      FROM machines
    `;

      const conditions = [];
      const params = [];

      if (filters.is_active !== undefined) {
        conditions.push("is_active = ?");
        params.push(parseInt(filters.is_active));
      }

      if (filters.search) {
        conditions.push(
          "(machine_number LIKE ? OR name LIKE ? OR description LIKE ?)"
        );
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " ORDER BY machine_number ASC";

      console.log("SQL:", query);
      console.log("Params:", params);

      const machines = await executeQuery(query, params);

      // Apply limit in JavaScript
      if (filters.limit) {
        const limit = parseInt(filters.limit);
        return machines.slice(0, limit);
      }

      return machines;
    } catch (error) {
      console.error("Error getting all machines:", error);
      throw error;
    }
  }

  // Get active machines only (for quotations)
  static async getActive() {
    try {
      return await this.getAll({ is_active: 1 });
    } catch (error) {
      console.error("Error getting active machines:", error);
      throw error;
    }
  }

  // Get machine by ID
  static async getById(id) {
    try {
      const query = `
        SELECT 
          id,
          machine_number,
          name,
          description,
          priceByDay,
          priceByWeek,
          priceByMonth,
          gst_percentage,
          is_active,
          created_at,
          updated_at
        FROM machines 
        WHERE id = ? 
        LIMIT 1
      `;

      const result = await executeQuery(query, [id]);
      return result[0] || null;
    } catch (error) {
      console.error("Error getting machine by ID:", error);
      throw error;
    }
  }

  // Get machine by machine number
  static async getByMachineNumber(machineNumber) {
    try {
      const query = `
        SELECT 
          id,
          machine_number,
          name,
          description,
          priceByDay,
          priceByWeek,
          priceByMonth,
          gst_percentage,
          is_active,
          created_at,
          updated_at
        FROM machines 
        WHERE machine_number = ? 
        LIMIT 1
      `;

      const result = await executeQuery(query, [machineNumber]);
      return result[0] || null;
    } catch (error) {
      console.error("Error getting machine by number:", error);
      throw error;
    }
  }

  // Create new machine
  static async create(machineData) {
    try {
      const {
        machine_number,
        name,
        description,
        priceByDay,
        priceByWeek,
        priceByMonth,
        gst_percentage,
      } = machineData;

      // Validate required fields
      const validation = this.validateMachineData(machineData);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      // Check if machine number already exists
      const existingMachine = await this.getByMachineNumber(machine_number);
      if (existingMachine) {
        return {
          success: false,
          message: "Machine number already exists",
        };
      }

      const query = `
        INSERT INTO machines (
          machine_number,
          name,
          description,
          priceByDay,
          priceByWeek,
          priceByMonth,
          gst_percentage,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
      `;

      const result = await executeQuery(query, [
        machine_number,
        name,
        description || null,
        priceByDay,
        priceByWeek,
        priceByMonth,
        gst_percentage || 18.0,
      ]);

      return {
        success: true,
        id: result.insertId,
        message: "Machine created successfully",
      };
    } catch (error) {
      console.error("Error creating machine:", error);
      throw error;
    }
  }

  // Update machine
  static async update(id, machineData) {
    try {
      const {
        machine_number,
        name,
        description,
        priceByDay,
        priceByWeek,
        priceByMonth,
        gst_percentage,
        is_active,
      } = machineData;

      // Validate required fields
      const validation = this.validateMachineData(machineData, true);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      // Check if machine exists
      const existingMachine = await this.getById(id);
      if (!existingMachine) {
        return {
          success: false,
          message: "Machine not found",
        };
      }

      // Check if machine number is being changed and if it conflicts
      if (machine_number && machine_number !== existingMachine.machine_number) {
        const conflictingMachine = await this.getByMachineNumber(
          machine_number
        );
        if (conflictingMachine && conflictingMachine.id !== parseInt(id)) {
          return {
            success: false,
            message: "Machine number already exists",
          };
        }
      }

      const query = `
        UPDATE machines 
        SET 
          machine_number = ?,
          name = ?,
          description = ?,
          priceByDay = ?,
          priceByWeek = ?,
          priceByMonth = ?,
          gst_percentage = ?,
          is_active = ?,
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(query, [
        machine_number || existingMachine.machine_number,
        name || existingMachine.name,
        description !== undefined ? description : existingMachine.description,
        priceByDay !== undefined ? priceByDay : existingMachine.priceByDay,
        priceByWeek !== undefined ? priceByWeek : existingMachine.priceByWeek,
        priceByMonth !== undefined
          ? priceByMonth
          : existingMachine.priceByMonth,
        gst_percentage !== undefined
          ? gst_percentage
          : existingMachine.gst_percentage,
        is_active !== undefined ? is_active : existingMachine.is_active,
        id,
      ]);

      return {
        success: true,
        message: "Machine updated successfully",
      };
    } catch (error) {
      console.error("Error updating machine:", error);
      throw error;
    }
  }

  // Delete machine (soft delete by setting is_active = 0)
  static async delete(id) {
    try {
      // Check if machine exists
      const existingMachine = await this.getById(id);
      if (!existingMachine) {
        return {
          success: false,
          message: "Machine not found",
        };
      }

      // Check if machine is used in any quotations
      const quotationCheck = await executeQuery(
        "SELECT COUNT(*) as count FROM quotations WHERE machine_id = ?",
        [id]
      );

      if (quotationCheck[0].count > 0) {
        // Soft delete - just deactivate
        await executeQuery(
          "UPDATE machines SET is_active = 0, updated_at = NOW() WHERE id = ?",
          [id]
        );

        return {
          success: true,
          message: "Machine deactivated (has existing quotations)",
        };
      } else {
        // Hard delete if no quotations exist
        await executeQuery("DELETE FROM machines WHERE id = ?", [id]);

        return {
          success: true,
          message: "Machine deleted successfully",
        };
      }
    } catch (error) {
      console.error("Error deleting machine:", error);
      throw error;
    }
  }

  // Bulk update machines
  static async bulkUpdate(updateData) {
    try {
      const { machine_ids, updates } = updateData;

      if (
        !machine_ids ||
        !Array.isArray(machine_ids) ||
        machine_ids.length === 0
      ) {
        return {
          success: false,
          message: "Machine IDs are required",
        };
      }

      const allowedUpdates = ["is_active", "gst_percentage"];
      const updateFields = [];
      const params = [];

      // Build update fields
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: "No valid update fields provided",
        };
      }

      // Add updated_at
      updateFields.push("updated_at = NOW()");

      // Add machine IDs for WHERE clause
      const placeholders = machine_ids.map(() => "?").join(",");
      params.push(...machine_ids);

      const query = `
        UPDATE machines 
        SET ${updateFields.join(", ")}
        WHERE id IN (${placeholders})
      `;

      const result = await executeQuery(query, params);

      return {
        success: true,
        message: `${result.affectedRows} machines updated successfully`,
        updatedCount: result.affectedRows,
      };
    } catch (error) {
      console.error("Error bulk updating machines:", error);
      throw error;
    }
  }

  // Get machine statistics
  // Fixed Machine.getStats method - NO RECURSION
  static async getStats() {
    try {
      console.log("Machine.getStats: Executing database query...");

      const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_machines,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_machines,
        SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive_machines,
        AVG(priceByDay) as avg_daily_price,
        MIN(priceByDay) as min_daily_price,
        MAX(priceByDay) as max_daily_price
      FROM machines
    `);

      console.log("Machine.getStats: Database query completed successfully");

      if (!stats || stats.length === 0) {
        console.log("Machine.getStats: No data returned, using defaults");
        return {
          total_machines: 0,
          active_machines: 0,
          inactive_machines: 0,
          avg_daily_price: 0,
          min_daily_price: 0,
          max_daily_price: 0,
        };
      }

      console.log("Machine.getStats: Returning stats:", stats[0]);
      return stats[0];
    } catch (error) {
      console.error("Machine.getStats: Database error:", error);

      // Return default values instead of throwing/recursing
      return {
        total_machines: 0,
        active_machines: 0,
        inactive_machines: 0,
        avg_daily_price: 0,
        min_daily_price: 0,
        max_daily_price: 0,
      };
    }
  }

  // Validate machine data
  static validateMachineData(data, isUpdate = false) {
    const errors = [];
    const {
      machine_number,
      name,
      priceByDay,
      priceByWeek,
      priceByMonth,
      gst_percentage,
    } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!machine_number || machine_number.trim().length === 0) {
        errors.push("Machine number is required");
      }

      if (!name || name.trim().length === 0) {
        errors.push("Machine name is required");
      }

      if (priceByDay === undefined || priceByDay === null) {
        errors.push("Daily price is required");
      }

      if (priceByWeek === undefined || priceByWeek === null) {
        errors.push("Weekly price is required");
      }

      if (priceByMonth === undefined || priceByMonth === null) {
        errors.push("Monthly price is required");
      }
    }

    // Validation for provided fields
    if (machine_number !== undefined) {
      if (machine_number.length > 50) {
        errors.push("Machine number must be less than 50 characters");
      }

      if (!/^[A-Z0-9-]+$/i.test(machine_number)) {
        errors.push(
          "Machine number can only contain letters, numbers, and hyphens"
        );
      }
    }

    if (name !== undefined) {
      if (name.length > 100) {
        errors.push("Machine name must be less than 100 characters");
      }
    }

    // Price validations
    if (priceByDay !== undefined && (isNaN(priceByDay) || priceByDay < 0)) {
      errors.push("Daily price must be a valid positive number");
    }

    if (priceByWeek !== undefined && (isNaN(priceByWeek) || priceByWeek < 0)) {
      errors.push("Weekly price must be a valid positive number");
    }

    if (
      priceByMonth !== undefined &&
      (isNaN(priceByMonth) || priceByMonth < 0)
    ) {
      errors.push("Monthly price must be a valid positive number");
    }

    if (
      gst_percentage !== undefined &&
      (isNaN(gst_percentage) || gst_percentage < 0 || gst_percentage > 100)
    ) {
      errors.push("GST percentage must be between 0 and 100");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = Machine;
