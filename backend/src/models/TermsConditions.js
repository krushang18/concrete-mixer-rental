const { prisma } = require("../config/database");
const { normalize, normalizeMany } = require("../utils/snakeCase");

class TermsConditions {
  static async getAll(filters = {}) {
    try {
      const where = {};
      if (filters.is_default !== undefined) {
        where.isDefault = filters.is_default === "true" || filters.is_default === true || filters.is_default === 1 || filters.is_default === "1";
      }
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }
      const rows = await prisma.termsCondition.findMany({ where, orderBy: [{ displayOrder: "asc" }, { title: "asc" }] });
      return normalizeMany(rows);
    } catch (error) {
      console.error("Error getting all terms and conditions:", error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const row = await prisma.termsCondition.findUnique({ where: { id: parseInt(id) } });
      return row ? normalize(row) : null;
    } catch (error) {
      console.error("Error getting terms and conditions by ID:", error);
      throw error;
    }
  }

  static async getDefault() {
    return this.getAll({ is_default: true });
  }

  static async create(tcData) {
    try {
      const { title, description, is_default, display_order } = tcData;

      const validation = this.validateTCData(tcData, false);
      if (!validation.isValid) return { success: false, message: "Validation failed", errors: validation.errors };

      let finalDisplayOrder = display_order;
      if (!finalDisplayOrder) {
        const agg = await prisma.termsCondition.aggregate({ _max: { displayOrder: true } });
        finalDisplayOrder = (agg._max.displayOrder || 0) + 1;
      }

      const created = await prisma.termsCondition.create({
        data: { title, description, isDefault: !!is_default, displayOrder: finalDisplayOrder },
      });
      return { success: true, id: created.id, message: "Terms and conditions created successfully" };
    } catch (error) {
      console.error("Error creating terms and conditions:", error);
      throw error;
    }
  }

  static async update(id, tcData) {
    try {
      const { title, description, is_default, display_order } = tcData;

      const validation = this.validateTCData(tcData, true);
      if (!validation.isValid) return { success: false, message: "Validation failed", errors: validation.errors };

      const existingTC = await this.getById(id);
      if (!existingTC) return { success: false, message: "Terms and conditions not found" };

      await prisma.termsCondition.update({
        where: { id: parseInt(id) },
        data: {
          title: title || existingTC.title,
          description: description || existingTC.description,
          isDefault: is_default !== undefined ? !!is_default : existingTC.isDefault,
          displayOrder: display_order !== undefined ? display_order : existingTC.displayOrder,
        },
      });
      return { success: true, message: "Terms and conditions updated successfully" };
    } catch (error) {
      console.error("Error updating terms and conditions:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const existingTC = await this.getById(id);
      if (!existingTC) return { success: false, message: "Terms and conditions not found" };

      await prisma.termsCondition.delete({ where: { id: parseInt(id) } });

      // Reorder remaining
      const remaining = await prisma.termsCondition.findMany({ orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
      await this.reorder({ items: remaining.map((t, i) => ({ id: t.id, display_order: i + 1 })) });

      return { success: true, message: "Terms and conditions deleted successfully" };
    } catch (error) {
      console.error("Error deleting terms and conditions:", error);
      throw error;
    }
  }

  static async reorder(reorderData) {
    try {
      const { items } = reorderData;
      if (!items || !Array.isArray(items) || items.length === 0) return { success: false, message: "Items array is required" };
      for (const item of items) {
        if (!item.id || item.display_order === undefined || item.display_order === null) {
          return { success: false, message: "Each item must have id and display_order" };
        }
      }

      await prisma.$transaction(
        items.map((item) =>
          prisma.termsCondition.update({ where: { id: item.id }, data: { displayOrder: item.display_order } })
        )
      );
      return { success: true, message: "Terms and conditions reordered successfully", updatedCount: items.length };
    } catch (error) {
      console.error("Error reordering terms and conditions:", error);
      throw error;
    }
  }

  static async setDefault(ids) {
    try {
      if (!ids || !Array.isArray(ids) || ids.length === 0) return { success: false, message: "Terms and conditions IDs are required" };

      await prisma.$transaction([
        prisma.termsCondition.updateMany({ data: { isDefault: false } }),
        prisma.termsCondition.updateMany({ where: { id: { in: ids.map(Number) } }, data: { isDefault: true } }),
      ]);
      return { success: true, message: "Default terms and conditions updated successfully" };
    } catch (error) {
      console.error("Error setting default terms and conditions:", error);
      throw error;
    }
  }

  static async duplicate(id) {
    try {
      const originalTC = await this.getById(id);
      if (!originalTC) return { success: false, message: "Terms and conditions not found" };

      const result = await this.create({
        title: `${originalTC.title} (Copy)`,
        description: originalTC.description,
        is_default: false,
        display_order: null,
      });
      if (result.success) return { success: true, id: result.id, message: "Terms and conditions duplicated successfully" };
      return result;
    } catch (error) {
      console.error("Error duplicating terms and conditions:", error);
      throw error;
    }
  }

  static async bulkDelete(ids) {
    try {
      if (!ids || !Array.isArray(ids) || ids.length === 0) return { success: false, message: "Terms and conditions IDs are required" };

      const result = await prisma.termsCondition.deleteMany({ where: { id: { in: ids.map(Number) } } });

      const remaining = await prisma.termsCondition.findMany({ orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
      if (remaining.length > 0) {
        await this.reorder({ items: remaining.map((t, i) => ({ id: t.id, display_order: i + 1 })) });
      }
      return { success: true, message: `${result.count} terms and conditions deleted successfully`, deletedCount: result.count };
    } catch (error) {
      console.error("Error bulk deleting terms and conditions:", error);
      throw error;
    }
  }

  static async getForQuotation() {
    try {
      const allTerms = await this.getAll();
      return allTerms.map((term) => ({
        id: term.id,
        title: term.title,
        description: term.description,
        is_default: term.isDefault,
        display_order: term.displayOrder,
      }));
    } catch (error) {
      console.error("Error getting terms and conditions for quotation:", error);
      throw error;
    }
  }

  static validateTCData(data, isUpdate = false) {
    const errors = [];
    const { title, description } = data;
    if (!isUpdate) {
      if (!title || title.trim().length === 0) errors.push("Title is required");
      if (!description || description.trim().length === 0) errors.push("Description is required");
    }
    if (title !== undefined && title.length > 100) errors.push("Title must be less than 100 characters");
    if (description !== undefined && description.length > 2000) errors.push("Description must be less than 2000 characters");
    return { isValid: errors.length === 0, errors };
  }

  static async initializeDefaults() {
    try {
      const count = await prisma.termsCondition.count();
      if (count > 0) {
        console.log("Terms and conditions already exist, skipping initialization");
        return;
      }

      const defaultTerms = [
        { title: "Payment Terms", description: "Payment should be made within 30 days of invoice date. Late payment may incur additional charges.", is_default: true, display_order: 1 },
        { title: "Delivery Terms", description: "Equipment will be delivered to the specified site location. Customer is responsible for site accessibility.", is_default: true, display_order: 2 },
        { title: "Maintenance Terms", description: "Regular maintenance and servicing will be provided as per schedule. Emergency repairs available 24/7.", is_default: true, display_order: 3 },
        { title: "Insurance Terms", description: "Equipment is covered under comprehensive insurance. Customer liable for damages due to misuse.", is_default: true, display_order: 4 },
        { title: "Operating Terms", description: "Equipment should be operated by trained personnel only. Operating manual will be provided.", is_default: true, display_order: 5 },
        { title: "Liability Clause", description: "Company is not liable for any indirect or consequential damages arising from equipment use.", is_default: false, display_order: 6 },
        { title: "Force Majeure", description: "Company is not responsible for delays due to circumstances beyond reasonable control.", is_default: false, display_order: 7 },
        { title: "Equipment Return", description: "Equipment must be returned in the same condition as delivered, normal wear and tear excepted.", is_default: false, display_order: 8 },
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
      console.error("❌ Error initializing default terms and conditions:", error);
    }
  }
}

module.exports = TermsConditions;
