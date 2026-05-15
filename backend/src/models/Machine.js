const { prisma } = require("../config/database");

class Machine {
  static async getAll(filters = {}) {
    try {
      const where = {};
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { description: { contains: filters.search, mode: "insensitive" } },
          { machineNumber: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const limit = filters.limit ? parseInt(filters.limit) : undefined;
      const offset = filters.offset ? parseInt(filters.offset) : undefined;

      return await prisma.machine.findMany({
        where,
        orderBy: { machineNumber: "asc" },
        take: limit && !isNaN(limit) && limit > 0 ? limit : undefined,
        skip: offset && !isNaN(offset) && offset >= 0 ? offset : undefined,
      });
    } catch (error) {
      console.error("❌ Error in Machine.getAll:", error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      return await prisma.machine.findUnique({ where: { id: parseInt(id) } });
    } catch (error) {
      console.error("Error getting machine by ID:", error);
      throw error;
    }
  }

  static async getByMachineNumber(machineNumber) {
    try {
      return await prisma.machine.findUnique({ where: { machineNumber } });
    } catch (error) {
      console.error("Error getting machine by number:", error);
      throw error;
    }
  }

  static async create(machineData) {
    try {
      const { machine_number, name, description } = machineData;

      const validation = this.validateMachineData(machineData);
      if (!validation.isValid) {
        return { success: false, message: "Validation failed", errors: validation.errors };
      }

      const machine = await prisma.machine.create({
        data: { machineNumber: machine_number, name, description: description || null },
      });
      return { success: true, id: machine.id, message: "Machine created successfully" };
    } catch (error) {
      if (error.code === "P2002") {
        return { success: false, message: "Machine number already exists" };
      }
      console.error("Error creating machine:", error);
      throw error;
    }
  }

  static async update(id, machineData) {
    try {
      const { machine_number, name, description } = machineData;

      const validation = this.validateMachineData(machineData, true);
      if (!validation.isValid) {
        return { success: false, message: "Validation failed", errors: validation.errors };
      }

      const existingMachine = await this.getById(id);
      if (!existingMachine) return { success: false, message: "Machine not found" };

      await prisma.machine.update({
        where: { id: parseInt(id) },
        data: {
          machineNumber: machine_number !== undefined ? machine_number : existingMachine.machineNumber,
          name: name !== undefined ? name : existingMachine.name,
          description: description !== undefined ? description : existingMachine.description,
        },
      });
      return { success: true, message: "Machine updated successfully" };
    } catch (error) {
      if (error.code === "P2002") {
        return { success: false, message: "Machine number already exists" };
      }
      console.error("Error updating machine:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const existingMachine = await this.getById(id);
      if (!existingMachine) return { success: false, message: "Machine not found" };

      await prisma.machine.delete({ where: { id: parseInt(id) } });
      return { success: true, message: "Machine deleted successfully" };
    } catch (error) {
      if (error.code === "P2003") {
        return { success: false, message: "Cannot delete machine with existing records" };
      }
      console.error("Error deleting machine:", error);
      throw error;
    }
  }

  static validateMachineData(data, isUpdate = false) {
    const errors = [];
    const { machine_number, name } = data;

    if (!isUpdate) {
      if (!machine_number || machine_number.trim().length === 0) errors.push("Machine number is required");
      if (!name || name.trim().length === 0) errors.push("Machine name is required");
    }

    if (machine_number !== undefined) {
      if (machine_number.length > 50) errors.push("Machine number must be less than 50 characters");
      if (!/^[A-Z0-9-]+$/i.test(machine_number)) errors.push("Machine number can only contain letters, numbers, and hyphens");
    }

    if (name !== undefined && name.length > 100) {
      errors.push("Machine name must be less than 100 characters");
    }

    return { isValid: errors.length === 0, errors };
  }
}

module.exports = Machine;
