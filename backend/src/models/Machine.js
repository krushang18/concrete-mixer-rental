const { executeQuery } = require("../config/database");

class Machine {
  // Get all machines with optional filtering
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT
          id, machine_number, name, description,
          created_at, updated_at
        FROM machines
      `;

      const conditions = [];
      const params = [];


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

      // Proper LIMIT/OFFSET handling
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

      const machines = await executeQuery(query, params);
      return machines;
    } catch (error) {
      console.error("❌ Error in Machine.getAll:", error);
      throw error;
    }
  }


  // Get machine by ID
  static async getById(id) {
    try {
      const query = `
        SELECT
          id, machine_number, name, description,
          created_at, updated_at
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
          created_at,
          updated_at
        ) VALUES (?, ?, ?, NOW(), NOW())
      `;

      const result = await executeQuery(query, [
        machine_number,
        name,
        description || null
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
        description
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
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(query, [
        machine_number !== undefined ? machine_number : existingMachine.machine_number,
        name !== undefined ? name : existingMachine.name,
        description !== undefined ? description : existingMachine.description,
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

      // Hard delete
      await executeQuery("DELETE FROM machines WHERE id = ?", [id]);

      return {
        success: true,
        message: "Machine deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting machine:", error);
      throw error;
    }
  }



  static validateMachineData(data, isUpdate = false) {
    const errors = [];
    const {
      machine_number,
      name
    } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!machine_number || machine_number.trim().length === 0) {
        errors.push("Machine number is required");
      }

      if (!name || name.trim().length === 0) {
        errors.push("Machine name is required");
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

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = Machine;
