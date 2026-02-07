const { executeQuery } = require("../config/database");

class QuotationMachine {
  // Get all machines with pagination
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT
          id, name, description,
          priceByDay, priceByWeek, priceByMonth,
          gst_percentage, created_at, updated_at
        FROM quotation_machines
      `;

      const conditions = [];
      const params = [];

      if (filters.search) {
        conditions.push(
          "(name LIKE ? OR description LIKE ?)"
        );
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      // Sorting
      const sortBy = filters.sortBy || "name";
      const sortOrder = filters.sortOrder === "DESC" ? "DESC" : "ASC";
      query += ` ORDER BY ${sortBy} ${sortOrder}`;

      // Pagination
      if (filters.limit) {
        const limit = parseInt(filters.limit);
        const offset = parseInt(filters.offset) || 0;
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }

      return await executeQuery(query, params);
    } catch (error) {
      console.error("Error in QuotationMachine.getAll:", error);
      throw error;
    }
  }

  // Get total count for pagination
  static async count(filters = {}) {
    try {
      let query = `SELECT COUNT(*) as total FROM quotation_machines`;
      const conditions = [];
      const params = [];

      if (filters.search) {
        conditions.push(
          "(name LIKE ? OR description LIKE ?)"
        );
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      const result = await executeQuery(query, params);
      return result[0].total;
    } catch (error) {
       console.error("Error in QuotationMachine.count:", error);
       throw error;
    }
  }

  // Get machine by ID
  static async getById(id) {
    try {
      const query = `
        SELECT * FROM quotation_machines WHERE id = ?
      `;
      const result = await executeQuery(query, [id]);
      return result[0] || null;
    } catch (error) {
      console.error("Error getting quotation machine by ID:", error);
      throw error;
    }
  }

  // Create new machine
  static async create(machineData) {
    try {
      const {
        name,
        description,
        priceByDay,
        priceByWeek,
        priceByMonth,
        gst_percentage,
      } = machineData;

      const query = `
        INSERT INTO quotation_machines (
          name, description,
          priceByDay, priceByWeek, priceByMonth,
          gst_percentage, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const result = await executeQuery(query, [
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
        message: "Pricing catalog item created successfully",
      };
    } catch (error) {
      console.error("Error creating quotation machine:", error);
      throw error;
    }
  }

  // Update machine
  static async update(id, machineData) {
    try {
      const allowedFields = [
        "name", "description",
        "priceByDay", "priceByWeek", "priceByMonth",
        "gst_percentage"
      ];
      
      const updates = [];
      const params = [];

      for (const field of allowedFields) {
        if (machineData[field] !== undefined) {
          updates.push(`${field} = ?`);
          params.push(machineData[field]);
        }
      }

      if (updates.length === 0) {
         return { success: false, message: "No fields to update" };
      }

      updates.push("updated_at = NOW()");
      params.push(id);

      const query = `UPDATE quotation_machines SET ${updates.join(", ")} WHERE id = ?`;
      
      await executeQuery(query, params);

      return {
        success: true,
        message: "Pricing catalog item updated successfully",
      };
    } catch (error) {
      console.error("Error updating quotation machine:", error);
      throw error;
    }
  }

  // Delete
  static async delete(id) {
     try {
         console.log(`Attempting to delete machine with ID: ${id}`);
         // Check usage in sales_invoices or other tables if strictly needed, 
         // but strictly for quotation_items:
         const usageResult = await executeQuery("SELECT COUNT(*) as count FROM quotation_items WHERE quotation_machine_id = ?", [id]);
         const usage = usageResult[0];
         console.log("Usage check result:", usage);

         if (usage && usage.count > 0) {
             console.log("Delete failed: Item is in use.");
             return { success: false, message: "Cannot delete: This machine is used in existing quotations." };
         } else {
             await executeQuery("DELETE FROM quotation_machines WHERE id = ?", [id]);
             console.log("Delete successful.");
             return { success: true, message: "Item deleted successfully" };
         }
     } catch (error) {
         console.error("Error deleting quotation machine:", error);
         throw error;
     }
  }
}

module.exports = QuotationMachine;
