const { prisma } = require("../config/database");

class Service {
  static async getAll(filters = {}) {
    try {
      const where = {};
      if (filters.machine_id) where.machineId = parseInt(filters.machine_id);
      if (filters.start_date) where.serviceDate = { ...where.serviceDate, gte: new Date(filters.start_date) };
      if (filters.end_date) where.serviceDate = { ...where.serviceDate, lte: new Date(filters.end_date) };
      if (filters.operator) where.operator = { contains: filters.operator, mode: "insensitive" };
      if (filters.site_location) where.siteLocation = { contains: filters.site_location, mode: "insensitive" };

      const limit = parseInt(filters.limit) || 50;
      const offset = parseInt(filters.offset) || 0;

      const records = await prisma.serviceRecord.findMany({
        where,
        orderBy: [{ serviceDate: "desc" }, { createdAt: "desc" }],
        take: limit,
        skip: offset,
        include: { machine: { select: { machineNumber: true, name: true } } },
      });

      return records.map((r) => ({
        id: r.id,
        machine_id: r.machineId,
        service_date: r.serviceDate,
        engine_hours: r.engineHours,
        site_location: r.siteLocation,
        operator: r.operator,
        general_notes: r.generalNotes,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        machine_number: r.machine?.machineNumber,
        machine_name: r.machine?.name,
        services: [],
      }));
    } catch (error) {
      console.error("Error getting all service records:", error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      const r = await prisma.serviceRecord.findUnique({
        where: { id: parseInt(id) },
        include: {
          machine: { select: { machineNumber: true, name: true } },
          services: {
            include: {
              serviceCategory: { select: { name: true, description: true, displayOrder: true } },
              subServices: { include: { subService: { select: { name: true, description: true, displayOrder: true } } } },
            },
          },
        },
      });
      if (!r) return null;

      // Fetch created_by username separately (no Prisma relation defined for createdBy on ServiceRecord)
      let createdByUser = null;
      if (r.createdBy) {
        const user = await prisma.user.findUnique({ where: { id: r.createdBy }, select: { username: true } });
        createdByUser = user?.username || null;
      }

      const services = r.services.map((srs) => ({
        record_service_id: srs.id,
        category_id: srs.serviceCategoryId,
        service_name: srs.serviceCategory.name,
        service_description: srs.serviceCategory.description,
        was_performed: srs.wasPerformed,
        service_notes: srs.serviceNotes,
        sub_services: srs.subServices.map((srss) => ({
          record_sub_service_id: srss.id,
          id: srss.subServiceId,
          sub_service_name: srss.subService.name,
          sub_service_description: srss.subService.description,
          was_performed: srss.wasPerformed,
          sub_service_notes: srss.subServiceNotes,
        })),
      }));

      return {
        id: r.id,
        machine_id: r.machineId,
        service_date: r.serviceDate,
        engine_hours: r.engineHours,
        site_location: r.siteLocation,
        operator: r.operator,
        general_notes: r.generalNotes,
        created_at: r.createdAt,
        updated_at: r.updatedAt,
        machine_number: r.machine?.machineNumber,
        machine_name: r.machine?.name,
        created_by_user: createdByUser,
        services,
      };
    } catch (error) {
      console.error("Error getting service record by ID:", error);
      throw error;
    }
  }

  static async getByMachine(machineId) {
    try {
      const records = await prisma.serviceRecord.findMany({
        where: { machineId: parseInt(machineId) },
        include: { machine: { select: { machineNumber: true, name: true } } },
        orderBy: { serviceDate: "desc" },
      });
      return records.map((r) => ({ ...r, machine_number: r.machine?.machineNumber, machine_name: r.machine?.name }));
    } catch (error) {
      console.error("Error getting services by machine:", error);
      throw error;
    }
  }

  static async create(serviceData) {
    try {
      const { machine_id, service_date, engine_hours, site_location, operator, general_notes, services, created_by } = serviceData;

      const record = await prisma.serviceRecord.create({
        data: {
          machineId: parseInt(machine_id),
          serviceDate: new Date(service_date),
          engineHours: engine_hours ? parseFloat(engine_hours) : null,
          siteLocation: site_location || null,
          operator,
          generalNotes: general_notes || null,
          createdBy: created_by || null,
        },
      });

      if (services && services.length > 0) {
        for (const service of services) {
          const srs = await prisma.serviceRecordService.create({
            data: { serviceRecordId: record.id, serviceCategoryId: service.category_id, wasPerformed: !!service.was_performed, serviceNotes: service.service_notes || null },
          });

          if (service.sub_services && service.sub_services.length > 0) {
            await prisma.serviceRecordSubService.createMany({
              data: service.sub_services.map((sub) => ({
                serviceRecordServiceId: srs.id,
                subServiceId: sub.id,
                wasPerformed: !!sub.was_performed,
                subServiceNotes: sub.sub_service_notes || null,
              })),
            });
          }
        }
      }

      return record.id;
    } catch (error) {
      console.error("Error creating service record:", error);
      throw error;
    }
  }

  static async update(id, serviceData, userId) {
    try {
      const { machine_id, service_date, engine_hours, site_location, operator, general_notes, services } = serviceData;

      const existingRecord = await this.getById(id);
      if (!existingRecord) return { success: false, message: "Service record not found" };

      await prisma.serviceRecord.update({
        where: { id: parseInt(id) },
        data: {
          machineId: machine_id ? parseInt(machine_id) : existingRecord.machine_id,
          serviceDate: service_date ? new Date(service_date) : existingRecord.service_date,
          engineHours: engine_hours !== undefined ? (engine_hours ? parseFloat(engine_hours) : null) : existingRecord.engine_hours,
          siteLocation: site_location !== undefined ? site_location : existingRecord.site_location,
          operator: operator !== undefined ? operator : existingRecord.operator,
          generalNotes: general_notes !== undefined ? general_notes : existingRecord.general_notes,
        },
      });

      // Delete and recreate services
      const existingServices = await prisma.serviceRecordService.findMany({ where: { serviceRecordId: parseInt(id) } });
      for (const srs of existingServices) {
        await prisma.serviceRecordSubService.deleteMany({ where: { serviceRecordServiceId: srs.id } });
      }
      await prisma.serviceRecordService.deleteMany({ where: { serviceRecordId: parseInt(id) } });

      if (services && services.length > 0) {
        for (const service of services) {
          const srs = await prisma.serviceRecordService.create({
            data: { serviceRecordId: parseInt(id), serviceCategoryId: service.category_id, wasPerformed: !!service.was_performed, serviceNotes: service.service_notes || null },
          });
          if (service.sub_services && service.sub_services.length > 0) {
            await prisma.serviceRecordSubService.createMany({
              data: service.sub_services.map((sub) => ({ serviceRecordServiceId: srs.id, subServiceId: sub.id, wasPerformed: !!sub.was_performed, subServiceNotes: sub.sub_service_notes || null })),
            });
          }
        }
      }

      return { success: true, message: "Service record updated successfully" };
    } catch (error) {
      console.error("Error updating service record:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const existingRecord = await this.getById(id);
      if (!existingRecord) return { success: false, message: "Service record not found" };

      // Cascades via FK handle sub_services → services → record
      await prisma.serviceRecord.delete({ where: { id: parseInt(id) } });
      return { success: true, message: "Service record deleted successfully" };
    } catch (error) {
      console.error("Error deleting service record:", error);
      throw error;
    }
  }

  static async getServiceCategories() {
    try {
      const categories = await prisma.serviceCategory.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { subItems: { where: { isActive: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] } },
      });

      return categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        has_sub_services: cat.hasSubServices,
        is_active: cat.isActive,
        display_order: cat.displayOrder,
        sub_services: cat.subItems.map((s) => ({ id: s.id, name: s.name, description: s.description, display_order: s.displayOrder })),
      }));
    } catch (error) {
      console.error("Error getting service categories:", error);
      throw error;
    }
  }

  static async getMachineServiceSummary(machineId) {
    try {
      const [agg, commonServices] = await Promise.all([
        prisma.serviceRecord.aggregate({
          where: { machineId: parseInt(machineId) },
          _count: { id: true },
          _max: { serviceDate: true, engineHours: true },
          _min: { serviceDate: true },
          _avg: { engineHours: true },
        }),
        prisma.$queryRaw`
          SELECT sc.name as service_name, COUNT(*) as frequency
          FROM service_record_services srs
          JOIN service_categories sc ON srs.service_category_id = sc.id
          JOIN service_records sr ON srs.service_record_id = sr.id
          WHERE sr.machine_id = ${parseInt(machineId)} AND srs.was_performed = true
          GROUP BY sc.id, sc.name
          ORDER BY frequency DESC
          LIMIT 5
        `,
      ]);

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      const recentServices = await prisma.serviceRecord.count({ where: { machineId: parseInt(machineId), serviceDate: { gte: thirtyDaysAgo } } });

      return {
        total_services: agg._count.id,
        last_service_date: agg._max.serviceDate,
        first_service_date: agg._min.serviceDate,
        avg_engine_hours: agg._avg.engineHours,
        max_engine_hours: agg._max.engineHours,
        recent_services: recentServices,
        common_services: commonServices,
      };
    } catch (error) {
      console.error("Error getting machine service summary:", error);
      throw error;
    }
  }

  static async createServiceCategory(categoryData) {
    try {
      const { name, description, has_sub_services, display_order } = categoryData;
      if (!name || name.trim().length === 0) return { success: false, message: "Category name is required" };

      let finalDisplayOrder = display_order;
      if (!finalDisplayOrder) {
        const agg = await prisma.serviceCategory.aggregate({ _max: { displayOrder: true } });
        finalDisplayOrder = (agg._max.displayOrder || 0) + 1;
      }

      const created = await prisma.serviceCategory.create({
        data: { name, description: description || null, hasSubServices: !!has_sub_services, isActive: true, displayOrder: finalDisplayOrder },
      });
      return { success: true, id: created.id, message: "Service category created successfully" };
    } catch (error) {
      console.error("Error creating service category:", error);
      throw error;
    }
  }

  static async createSubServiceItem(subServiceData) {
    try {
      const { category_id, name, description, display_order } = subServiceData;
      if (!category_id || isNaN(category_id)) return { success: false, message: "Valid category ID is required" };
      if (!name || name.trim().length === 0) return { success: false, message: "Sub-service name is required" };

      let finalDisplayOrder = display_order;
      if (!finalDisplayOrder) {
        const agg = await prisma.serviceSubItem.aggregate({ where: { categoryId: parseInt(category_id) }, _max: { displayOrder: true } });
        finalDisplayOrder = (agg._max.displayOrder || 0) + 1;
      }

      const created = await prisma.serviceSubItem.create({
        data: { categoryId: parseInt(category_id), name, description: description || null, isActive: true, displayOrder: finalDisplayOrder },
      });
      return { success: true, id: created.id, message: "Sub-service item created successfully" };
    } catch (error) {
      console.error("Error creating sub-service item:", error);
      throw error;
    }
  }

  static async getSubServices(categoryId) {
    try {
      const items = await prisma.serviceSubItem.findMany({
        where: { categoryId: parseInt(categoryId), isActive: true },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      });
      return items.map((s) => ({ id: s.id, name: s.name, description: s.description, is_active: s.isActive }));
    } catch (error) {
      console.error("Error getting sub-services:", error);
      throw error;
    }
  }

  static async updateServiceCategory(id, name, description) {
    try {
      await prisma.serviceCategory.update({ where: { id: parseInt(id) }, data: { name, description } });
      return { success: true, message: "Service category updated successfully" };
    } catch (error) {
      console.error("Error updating service category:", error);
      throw error;
    }
  }

  static async deleteServiceCategory(id) {
    try {
      // Cascade via FK handles sub_items
      await prisma.serviceCategory.delete({ where: { id: parseInt(id) } });
      return { success: true, message: "Service category and related items deleted successfully" };
    } catch (error) {
      console.error("Error deleting service category:", error);
      throw error;
    }
  }

  static async updateSubServiceItem(id, category_id, name, description) {
    try {
      await prisma.serviceSubItem.update({ where: { id: parseInt(id) }, data: { categoryId: parseInt(category_id), name, description } });
      return { success: true, message: "Sub-service updated successfully" };
    } catch (error) {
      console.error("Error updating sub-service:", error);
      throw error;
    }
  }

  static async deleteSubServiceItem(id) {
    try {
      await prisma.serviceSubItem.delete({ where: { id: parseInt(id) } });
      return { success: true, message: "Sub-service deleted successfully" };
    } catch (error) {
      console.error("Error deleting sub-service:", error);
      throw error;
    }
  }

  static async exportToCSV(filters = {}) {
    try {
      const records = await this.getAll(filters);
      const csvData = records.map((record) => {
        let servicesPerformed = "";
        if (record.services && record.services.length > 0) {
          servicesPerformed = record.services.map((s) => `${s.service_name}: ${(s.sub_services || []).map((sub) => sub.sub_service_name).join(", ")}`).join(" | ");
        }
        return {
          machine_number: record.machine_number || "",
          machine_name: record.machine_name || "",
          service_date: record.service_date ? new Date(record.service_date).toLocaleDateString("en-GB") : "",
          engine_hours: record.engine_hours || "",
          site_location: record.site_location || "",
          operator: record.operator || "",
          services_performed: servicesPerformed,
          general_notes: record.general_notes || "",
          created_by: record.created_by_user || "",
          created_at: record.created_at ? new Date(record.created_at).toLocaleDateString("en-GB") : "",
        };
      });
      return { success: true, data: csvData, headers: ["Machine Number", "Machine Name", "Service Date", "Engine Hours", "Site Location", "Operator", "Services Performed", "General Notes", "Created By", "Created At"] };
    } catch (error) {
      console.error("Error exporting service records to CSV:", error);
      throw error;
    }
  }
}

module.exports = Service;
