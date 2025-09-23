const { executeQuery } = require("../config/database");

class Machine {
  // Get all machines with optional filtering
  // Simple Machine.getAll in Machine.js model
  static async getAll(filters = {}) {
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

      // FIX: Proper boolean conversion for is_active
      if (filters.is_active !== undefined) {
        conditions.push("is_active = ?");

        // Convert string 'true'/'false' to boolean, then to 1/0
        let isActiveValue;
        if (typeof filters.is_active === "string") {
          isActiveValue = filters.is_active.toLowerCase() === "true" ? 1 : 0;
        } else if (typeof filters.is_active === "boolean") {
          isActiveValue = filters.is_active ? 1 : 0;
        } else {
          isActiveValue = filters.is_active ? 1 : 0;
        }

        params.push(isActiveValue);
        console.log(
          `🔧 Fixed is_active filter: ${filters.is_active} -> ${isActiveValue}`
        );
      }

      // Search filter
      if (filters.search) {
        conditions.push(
          "(name LIKE ? OR description LIKE ? OR machine_number LIKE ?)"
        );
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      // Add ordering
      query += " ORDER BY machine_number ASC";

      // FIX: Proper LIMIT/OFFSET handling
      if (filters.limit) {
        const limitValue = parseInt(filters.limit);
        if (!isNaN(limitValue) && limitValue > 0 && limitValue <= 1000) {
          query += ` LIMIT ${limitValue}`;

          if (filters.offset) {
            const offsetValue = parseInt(filters.offset);
            if (!isNaN(offsetValue) && offsetValue >= 0) {
              query += ` OFFSET ${offsetValue}`;
            }
          }
        }
      }

      console.log("🔧 Fixed Machine SQL:", query);
      console.log("🔧 Fixed Machine Params:", params);

      const machines = await executeQuery(query, params);
      console.log(
        `✅ Machine query successful, rows returned: ${machines.length}`
      );

      return machines;
    } catch (error) {
      console.error("❌ Error in Machine.getAll:", error);
      throw error;
    }
  }

  // Get active machines only
  static async getActive() {
    return this.getAll({ is_active: true });
  }

  // Get machine by ID
  static async getById(id) {
    try {
      const query = `
        SELECT
          id, machine_number, name, description,
          priceByDay, priceByWeek, priceByMonth,
          gst_percentage, is_active, created_at, updated_at
        FROM machines
        WHERE id = ?
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
