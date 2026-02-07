const { executeQuery } = require("../config/database");

class TermsConditions {
  // Get all terms and conditions
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          id,
          title,
          description,
          is_default,
          display_order,
          created_at,
          updated_at
        FROM terms_conditions
      `;

      const conditions = [];
      const params = [];

      // Apply filters

      if (filters.is_default !== undefined) {
        conditions.push("is_default = ?");
        const isDefault = filters.is_default === 'true' || filters.is_default === true || filters.is_default === 1 || filters.is_default === '1';
        params.push(isDefault ? 1 : 0);
      }

      if (filters.search) {
        conditions.push("(title LIKE ? OR description LIKE ?)");
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      // Order by display_order, then by title
      query += " ORDER BY display_order ASC, title ASC";

      const termsConditions = await executeQuery(query, params);
      return termsConditions;
    } catch (error) {
      console.error("Error getting all terms and conditions:", error);
      throw error;
    }
  }

  // Get terms and conditions by ID
  static async getById(id) {
    try {
      const query = `
        SELECT 
          id,
          title,
          description,
          is_default,
          display_order,
          created_at,
          updated_at
        FROM terms_conditions 
        WHERE id = ? 
        LIMIT 1
      `;

      const result = await executeQuery(query, [id]);
      return result[0] || null;
    } catch (error) {
      console.error("Error getting terms and conditions by ID:", error);
      throw error;
    }
  }

  // Get default terms and conditions
  static async getDefault() {
    try {
      return await this.getAll({ is_default: true });
    } catch (error) {
      console.error("Error getting default terms and conditions:", error);
      throw error;
    }
  }





  // Create new terms and conditions
  static async create(tcData) {
    try {
      const { title, description, is_default, display_order } =
        tcData;

      // Validate data
      const validation = this.validateTCData(tcData, false);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      let finalDisplayOrder = display_order;

      // Auto-assign GLOBAL display order if not provided
      if (!finalDisplayOrder) {
        const maxOrderResult = await executeQuery(
          "SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM terms_conditions"
        );
        finalDisplayOrder = maxOrderResult[0].next_order;
      }

      const query = `
      INSERT INTO terms_conditions (
        title,
        description,
        is_default,
        display_order,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())
    `;

      const result = await executeQuery(query, [
        title,
        description,
        is_default ? 1 : 0,
        finalDisplayOrder,
      ]);

      return {
        success: true,
        id: result.insertId,
        message: "Terms and conditions created successfully",
      };
    } catch (error) {
      console.error("Error creating terms and conditions:", error);
      throw error;
    }
  }

  // Update terms and conditions
  static async update(id, tcData) {
    try {
      const { title, description, is_default, display_order } =
        tcData;

      // Validate data
      const validation = this.validateTCData(tcData, true);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      // Check if T&C exists
      const existingTC = await this.getById(id);
      if (!existingTC) {
        return {
          success: false,
          message: "Terms and conditions not found",
        };
      }

      const query = `
        UPDATE terms_conditions 
        SET 
          title = ?,
          description = ?,
          is_default = ?,
          display_order = ?,
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(query, [
        title || existingTC.title,
        description || existingTC.description,
        is_default !== undefined ? (is_default ? 1 : 0) : existingTC.is_default,
        display_order !== undefined ? display_order : existingTC.display_order,
        id,
      ]);

      return {
        success: true,
        message: "Terms and conditions updated successfully",
      };
    } catch (error) {
      console.error("Error updating terms and conditions:", error);
      throw error;
    }
  }

  // Delete terms and conditions
  static async delete(id) {
    try {
      // Ensure term exists
      const existingTC = await this.getById(id);
      if (!existingTC) {
        return { success: false, message: "Terms and conditions not found" };
      }

      // Delete the term
      await executeQuery("DELETE FROM terms_conditions WHERE id = ?", [id]);

      // Reorder ALL remaining terms globally
      const remainingTerms = await executeQuery(
        `SELECT id FROM terms_conditions
       ORDER BY display_order ASC, id ASC`
      );

      const reorderData = remainingTerms.map((term, index) => ({
        id: term.id,
        display_order: index + 1,
      }));

      if (reorderData.length > 0) {
        await this.reorder({ items: reorderData });
      }

      return {
        success: true,
        message: "Terms and conditions deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting terms and conditions:", error);
      throw error;
    }
  }

  // Reorder terms and conditions
  // Helper: batch-update using a single UPDATE ... CASE
  static async reorder(reorderData) {
    try {
      const { items } = reorderData;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return { success: false, message: "Items array is required" };
      }

      // Validate
      for (const item of items) {
        if (
          !item.id ||
          item.display_order === undefined ||
          item.display_order === null
        ) {
          return {
            success: false,
            message: "Each item must have id and display_order",
          };
        }
      }

      // Build CASE ... WHEN ? THEN ?  (params: id1, order1, id2, order2, ... , id1, id2, ...)
      const caseParts = items.map(() => "WHEN ? THEN ?").join(" ");
      const idPlaceholders = items.map(() => "?").join(",");
      const params = [];
      // first 2*N params for CASE
      for (const it of items) {
        params.push(it.id, it.display_order);
      }
      // then N params for WHERE IN
      for (const it of items) {
        params.push(it.id);
      }

      const sql = `
      UPDATE terms_conditions
      SET display_order = CASE id ${caseParts} ELSE display_order END,
          updated_at = NOW()
      WHERE id IN (${idPlaceholders})
    `;

      await executeQuery(sql, params);

      return {
        success: true,
        message: "Terms and conditions reordered successfully",
        updatedCount: items.length,
      };
    } catch (error) {
      console.error("Error reordering terms and conditions:", error);
      throw error;
    }
  }

  // Set default terms and conditions
  static async setDefault(ids) {
    try {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return {
          success: false,
          message: "Terms and conditions IDs are required",
        };
      }

      // First, unset all defaults
      await executeQuery("UPDATE terms_conditions SET is_default = 0");

      // Then set the specified ones as default
      const placeholders = ids.map(() => "?").join(",");
      await executeQuery(
        `UPDATE terms_conditions SET is_default = 1 WHERE id IN (${placeholders})`,
        ids
      );

      return {
        success: true,
        message: "Default terms and conditions updated successfully",
      };
    } catch (error) {
      console.error("Error setting default terms and conditions:", error);
      throw error;
    }
  }

  // Duplicate terms and conditions
  static async duplicate(id) {
    try {
      const originalTC = await this.getById(id);
      if (!originalTC) {
        return {
          success: false,
          message: "Terms and conditions not found",
        };
      }

      // Create a copy with modified title
      const duplicateData = {
        title: `${originalTC.title} (Copy)`,
        description: originalTC.description,
        is_default: false, // Copies should not be default
        display_order: null, // Will be auto-assigned
      };

      const result = await this.create(duplicateData);

      if (result.success) {
        return {
          success: true,
          id: result.id,
          message: "Terms and conditions duplicated successfully",
        };
      }

      return result;
    } catch (error) {
      console.error("Error duplicating terms and conditions:", error);
      throw error;
    }
  }

  // Bulk delete terms and conditions
  // Improved bulkDelete (delete then reorder per affected category)
  static async bulkDelete(ids) {
    try {
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return {
          success: false,
          message: "Terms and conditions IDs are required",
        };
      }

      // Perform delete
      const placeholders = ids.map(() => "?").join(",");
      const deleteResult = await executeQuery(
        `DELETE FROM terms_conditions WHERE id IN (${placeholders})`,
        ids
      );

      // Reorder ALL remaining terms globally
      const remainingTerms = await executeQuery(
        `SELECT id FROM terms_conditions
       ORDER BY display_order ASC, id ASC`
      );

      const reorderData = remainingTerms.map((term, index) => ({
        id: term.id,
        display_order: index + 1,
      }));

      if (reorderData.length > 0) {
        await this.reorder({ items: reorderData });
      }

      return {
        success: true,
        message: `${
          deleteResult.affectedRows || 0
        } terms and conditions deleted successfully`,
        deletedCount: deleteResult.affectedRows || 0,
      };
    } catch (error) {
      console.error("Error bulk deleting terms and conditions:", error);
      throw error;
    }
  }

  // Get terms and conditions for quotation (formatted for selection)
  static async getForQuotation() {
    try {
      const allTerms = await this.getAll();

      return allTerms.map((term) => ({
        id: term.id,
        title: term.title,
        description: term.description,
        is_default: term.is_default === 1,
        display_order: term.display_order,
      }));
    } catch (error) {
      console.error("Error getting terms and conditions for quotation:", error);
      throw error;
    }
  }



  // Validate terms and conditions data
  static validateTCData(data, isUpdate = false) {
    const errors = [];
    const { title, description } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!title || title.trim().length === 0) {
        errors.push("Title is required");
      }

      if (!description || description.trim().length === 0) {
        errors.push("Description is required");
      }
    }

    // Validation for provided fields
    if (title !== undefined) {
      if (title.length > 100) {
        errors.push("Title must be less than 100 characters");
      }
    }

    if (description !== undefined) {
      if (description.length > 2000) {
        errors.push("Description must be less than 2000 characters");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Initialize default terms and conditions if none exist
  static async initializeDefaults() {
    try {
      const existingTerms = await executeQuery(
        "SELECT COUNT(*) as count FROM terms_conditions"
      );

      if (existingTerms[0].count > 0) {
        console.log(
          "Terms and conditions already exist, skipping initialization"
        );
        return;
      }

      const defaultTerms = [
        {
          title: "Payment Terms",
          description:
            "Payment should be made within 30 days of invoice date. Late payment may incur additional charges.",
          category: "Payment",
          is_default: true,
          display_order: 1,
        },
        {
          title: "Delivery Terms",
          description:
            "Equipment will be delivered to the specified site location. Customer is responsible for site accessibility.",
          category: "Delivery",
          is_default: true,
          display_order: 2,
        },
        {
          title: "Maintenance Terms",
          description:
            "Regular maintenance and servicing will be provided as per schedule. Emergency repairs available 24/7.",
          category: "Maintenance",
          is_default: true,
          display_order: 3,
        },
        {
          title: "Insurance Terms",
          description:
            "Equipment is covered under comprehensive insurance. Customer liable for damages due to misuse.",
          category: "Insurance",
          is_default: true,
          display_order: 4,
        },
        {
          title: "Operating Terms",
          description:
            "Equipment should be operated by trained personnel only. Operating manual will be provided.",
          category: "Operation",
          is_default: true,
          display_order: 5,
        },
        {
          title: "Liability Clause",
          description:
            "Company is not liable for any indirect or consequential damages arising from equipment use.",
          category: "Legal",
          is_default: false,
          display_order: 6,
        },
        {
          title: "Force Majeure",
          description:
            "Company is not responsible for delays due to circumstances beyond reasonable control.",
          category: "Legal",
          is_default: false,
          display_order: 7,
        },
        {
          title: "Equipment Return",
          description:
            "Equipment must be returned in the same condition as delivered, normal wear and tear excepted.",
          category: "Equipment",
          is_default: false,
          display_order: 8,
        },
      ];

      for (const term of defaultTerms) {
        try {
          await this.create(term);
          console.log(`✅ Created default term: ${term.title}`);
        } catch (error) {
          console.log(`⚠️ Could not create term ${term.title}:`, error.message);
        }
      }

      console.log("✅ Default terms and conditions initialization completed");
    } catch (error) {
      console.error(
        "❌ Error initializing default terms and conditions:",
        error
      );
    }
  }


}

module.exports = TermsConditions;
