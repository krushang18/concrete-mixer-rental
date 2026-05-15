const { prisma } = require("../config/database");

class QuotationMachine {
  static async getAll(filters = {}) {
    try {
      const where = {};
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const sortBy = filters.sortBy || "name";
      const sortOrder = (filters.sortOrder || "ASC").toLowerCase();
      const limit = filters.limit ? parseInt(filters.limit) : undefined;
      const offset = filters.offset ? parseInt(filters.offset) : 0;

      return await prisma.quotationMachine.findMany({
        where,
        orderBy: { [sortBy === "gst_percentage" ? "gstPercentage" : sortBy]: sortOrder },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      console.error("Error in QuotationMachine.getAll:", error);
      throw error;
    }
  }

  static async count(filters = {}) {
    try {
      const where = {};
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
        ];
      }
      return await prisma.quotationMachine.count({ where });
    } catch (error) {
      console.error("Error in QuotationMachine.count:", error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      return await prisma.quotationMachine.findUnique({ where: { id: parseInt(id) } });
    } catch (error) {
      console.error("Error getting quotation machine by ID:", error);
      throw error;
    }
  }

  static async create(machineData) {
    try {
      const { name, description, priceByDay, priceByWeek, priceByMonth, gst_percentage } = machineData;
      const created = await prisma.quotationMachine.create({
        data: { name, description: description || null, priceByDay, priceByWeek, priceByMonth, gstPercentage: gst_percentage || 18.0 },
      });
      return { success: true, id: created.id, message: "Pricing catalog item created successfully" };
    } catch (error) {
      console.error("Error creating quotation machine:", error);
      throw error;
    }
  }

  static async update(id, machineData) {
    try {
      const fieldMap = { name: "name", description: "description", priceByDay: "priceByDay", priceByWeek: "priceByWeek", priceByMonth: "priceByMonth", gst_percentage: "gstPercentage" };
      const data = {};
      for (const [srcField, prismaField] of Object.entries(fieldMap)) {
        if (machineData[srcField] !== undefined) data[prismaField] = machineData[srcField];
      }
      if (Object.keys(data).length === 0) return { success: false, message: "No fields to update" };

      await prisma.quotationMachine.update({ where: { id: parseInt(id) }, data });
      return { success: true, message: "Pricing catalog item updated successfully" };
    } catch (error) {
      console.error("Error updating quotation machine:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const usage = await prisma.quotationItem.count({ where: { quotationMachineId: parseInt(id) } });
      if (usage > 0) return { success: false, message: "Cannot delete: This machine is used in existing quotations." };

      await prisma.quotationMachine.delete({ where: { id: parseInt(id) } });
      return { success: true, message: "Item deleted successfully" };
    } catch (error) {
      console.error("Error deleting quotation machine:", error);
      throw error;
    }
  }
}

module.exports = QuotationMachine;
