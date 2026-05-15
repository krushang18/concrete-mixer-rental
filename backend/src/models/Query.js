const { prisma } = require("../config/database");
const { normalize, normalizeMany } = require("../utils/snakeCase");

class Query {
  static async create(queryData) {
    try {
      const created = await prisma.customerQuery.create({
        data: {
          companyName: queryData.company_name,
          email: queryData.email,
          siteLocation: queryData.site_location,
          contactNumber: queryData.contact_number,
          duration: queryData.duration,
          workDescription: queryData.work_description,
          status: "new",
        },
      });
      return { success: true, id: created.id, message: "Query submitted successfully" };
    } catch (error) {
      console.error("Error creating query:", error);
      throw new Error("Failed to submit query");
    }
  }

  static async getAll(filters = {}) {
    try {
      const page = Math.max(1, parseInt(filters.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 10));
      const offset = (page - 1) * limit;
      const sortBy = filters.sortBy === "created_at" ? "createdAt" : (filters.sortBy || "createdAt");
      const sortOrder = (filters.sortOrder || "DESC").toLowerCase();

      const where = {};
      if (filters.status) where.status = filters.status;
      if (filters.startDate) where.createdAt = { ...where.createdAt, gte: new Date(filters.startDate) };
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = { ...where.createdAt, lte: end };
      }
      if (filters.search) {
        where.OR = [
          { companyName: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { siteLocation: { contains: filters.search, mode: "insensitive" } },
          { workDescription: { contains: filters.search, mode: "insensitive" } },
          { contactNumber: { contains: filters.search, mode: "insensitive" } },
        ];
      }

      const [totalRecords, rows] = await Promise.all([
        prisma.customerQuery.count({ where }),
        prisma.customerQuery.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
        }),
      ]);

      const totalPages = Math.ceil(totalRecords / limit);
      const fromRecord = totalRecords === 0 ? 0 : offset + 1;
      const toRecord = Math.min(offset + limit, totalRecords);

      return {
        data: normalizeMany(rows),
        pagination: {
          current_page: page,
          per_page: limit,
          total: totalRecords,
          total_pages: totalPages,
          has_prev_page: page > 1,
          has_next_page: page < totalPages,
          prev_page: page > 1 ? page - 1 : null,
          next_page: page < totalPages ? page + 1 : null,
          from: fromRecord,
          to: toRecord,
        },
      };
    } catch (error) {
      console.error("Database error in Query.getAll:", error);
      throw new Error("Failed to fetch queries: " + error.message);
    }
  }

  static async getPaginationSummary(filters = {}) {
    try {
      const where = {};
      if (filters.status) where.status = filters.status;
      if (filters.startDate) where.createdAt = { gte: new Date(filters.startDate) };
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt = { ...where.createdAt, lte: end };
      }

      const [total, newCount, contactedCount, closedCount, dateAgg] = await Promise.all([
        prisma.customerQuery.count({ where }),
        prisma.customerQuery.count({ where: { ...where, status: "new" } }),
        prisma.customerQuery.count({ where: { ...where, status: "contacted" } }),
        prisma.customerQuery.count({ where: { ...where, status: "closed" } }),
        prisma.customerQuery.aggregate({ _min: { createdAt: true }, _max: { createdAt: true }, where }),
      ]);

      return {
        total_records: total,
        new_count: newCount,
        contacted_count: contactedCount,
        closed_count: closedCount,
        earliest_date: dateAgg._min.createdAt,
        latest_date: dateAgg._max.createdAt,
      };
    } catch (error) {
      console.error("Error getting pagination summary:", error);
      throw new Error("Failed to get pagination summary");
    }
  }

  static async getFilterOptions() {
    try {
      const [statuses, dateRange] = await Promise.all([
        prisma.customerQuery.groupBy({ by: ["status"], _count: { status: true }, orderBy: { _count: { status: "desc" } } }),
        prisma.customerQuery.aggregate({ _min: { createdAt: true }, _max: { createdAt: true } }),
      ]);

      return {
        statuses: statuses.map((row) => ({
          value: row.status,
          label: row.status.charAt(0).toUpperCase() + row.status.slice(1).replace("_", " "),
          count: row._count.status,
        })),
        date_range: { min: dateRange._min.createdAt, max: dateRange._max.createdAt },
      };
    } catch (error) {
      console.error("Error getting filter options:", error);
      throw new Error("Failed to get filter options");
    }
  }

  static async getById(id) {
    try {
      const row = await prisma.customerQuery.findUnique({ where: { id: parseInt(id) } });
      return row ? normalize(row) : null;
    } catch (error) {
      console.error("Error fetching query by ID:", error);
      throw new Error("Failed to fetch query");
    }
  }


  static async updateStatus(id, status) {
    try {
      const result = await prisma.customerQuery.updateMany({
        where: { id: parseInt(id) },
        data: { status },
      });
      return {
        success: result.count > 0,
        message: result.count > 0 ? "Status updated successfully" : "Query not found",
      };
    } catch (error) {
      console.error("Error updating query status:", error);
      throw new Error("Failed to update query status");
    }
  }

  static async getRecentCount(days = 7) {
    try {
      const since = new Date(Date.now() - days * 86400000);
      return await prisma.customerQuery.count({ where: { createdAt: { gte: since } } });
    } catch (error) {
      console.error("Error getting recent queries count:", error);
      throw new Error("Failed to get queries count");
    }
  }

  static async getTotalCount() {
    try {
      return await prisma.customerQuery.count();
    } catch (error) {
      console.error("Error getting total queries count:", error);
      throw new Error("Failed to get total queries count");
    }
  }

  static validateQueryData(data) {
    const errors = [];
    if (!data.company_name || data.company_name.trim().length < 2) errors.push("Company name is required and must be at least 2 characters");
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push("Valid email address is required");
    if (!data.contact_number || !/^[6-9]\d{9}$/.test(data.contact_number.replace(/\s+/g, ""))) errors.push("Valid 10-digit mobile number is required");
    if (!data.site_location || data.site_location.trim().length < 5) errors.push("Site location is required and must be at least 5 characters");
    if (!data.duration || data.duration.trim().length < 1) errors.push("Duration is required");
    if (!data.work_description || data.work_description.trim().length < 10) errors.push("Work description is required and must be at least 10 characters");
    return { isValid: errors.length === 0, errors };
  }
}

module.exports = Query;
