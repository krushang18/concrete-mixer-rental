const { executeQuery } = require("../config/database");

class Query {
  // Create new customer query
  static async create(queryData) {
    const query = `
      INSERT INTO customer_queries 
      (company_name, email, site_location, contact_number, duration, work_description, status) 
      VALUES (?, ?, ?, ?, ?, ?, 'new')
    `;

    const params = [
      queryData.company_name,
      queryData.email,
      queryData.site_location,
      queryData.contact_number,
      queryData.duration,
      queryData.work_description,
    ];

    try {
      const result = await executeQuery(query, params);
      return {
        success: true,
        id: result.insertId,
        message: "Query submitted successfully",
      };
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
      const sortBy = filters.sortBy || "created_at";
      const sortOrder = filters.sortOrder || "DESC";

      console.log("Pagination params:", {
        page,
        limit,
        offset,
        sortBy,
        sortOrder,
      });

      // Build WHERE conditions
      let conditions = [];
      let params = [];

      if (filters.status) {
        conditions.push("status = ?");
        params.push(filters.status);
      }

      if (filters.startDate) {
        conditions.push("DATE(created_at) >= DATE(?)");
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push("DATE(created_at) <= DATE(?)");
        params.push(filters.endDate);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(`(
        company_name LIKE ? OR 
        email LIKE ? OR 
        site_location LIKE ? OR 
        work_description LIKE ? OR
        contact_number LIKE ?
      )`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause =
        conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM customer_queries ${whereClause}`;
      const countResult = await executeQuery(countQuery, params);
      const totalRecords = parseInt(countResult[0].total);
      const totalPages = Math.ceil(totalRecords / limit);

      // Get paginated data - FIXED: Use direct values instead of parameters
      const dataQuery = `
      SELECT 
        id, company_name, email, site_location, contact_number, 
        duration, work_description, status, created_at, updated_at
      FROM customer_queries 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limit} OFFSET ${offset}
    `;

      console.log("Data Query:", dataQuery);
      console.log("Data Params:", params);

      const rows = await executeQuery(dataQuery, params);

      const fromRecord = totalRecords === 0 ? 0 : offset + 1;
      const toRecord = Math.min(offset + limit, totalRecords);

      return {
        data: rows,
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

  // Additional utility method for getting pagination summary
  static async getPaginationSummary(filters = {}) {
    try {
      let conditions = [];
      let params = [];

      if (filters.status) {
        conditions.push("status = ?");
        params.push(filters.status);
      }

      if (filters.startDate) {
        conditions.push("DATE(created_at) >= DATE(?)");
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push("DATE(created_at) <= DATE(?)");
        params.push(filters.endDate);
      }

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(`(
        company_name LIKE ? OR 
        email LIKE ? OR 
        site_location LIKE ? OR 
        work_description LIKE ?
      )`);
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      const whereClause =
        conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

      const summaryQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        MIN(created_at) as earliest_date,
        MAX(created_at) as latest_date
      FROM customer_queries 
      ${whereClause}
    `;

      const result = await executeQuery(summaryQuery, params);
      return result[0];
    } catch (error) {
      console.error("Error getting pagination summary:", error);
      throw new Error("Failed to get pagination summary");
    }
  }

  // Method to get available filter options
  static async getFilterOptions() {
    try {
      const optionsQuery = `
      SELECT 
        DISTINCT status,
        COUNT(*) as count
      FROM customer_queries 
      WHERE status IS NOT NULL
      GROUP BY status
      ORDER BY count DESC
    `;

      const statusOptions = await executeQuery(optionsQuery, []);

      const dateRangeQuery = `
      SELECT 
        MIN(DATE(created_at)) as min_date,
        MAX(DATE(created_at)) as max_date
      FROM customer_queries
    `;

      const dateRange = await executeQuery(dateRangeQuery, []);

      return {
        statuses: statusOptions.map((row) => ({
          value: row.status,
          label:
            row.status.charAt(0).toUpperCase() +
            row.status.slice(1).replace("_", " "),
          count: row.count,
        })),
        date_range: {
          min: dateRange[0].min_date,
          max: dateRange[0].max_date,
        },
      };
    } catch (error) {
      console.error("Error getting filter options:", error);
      throw new Error("Failed to get filter options");
    }
  }

  // Get query by ID
  static async getById(id) {
    const query = `
      SELECT id, company_name, email, site_location, contact_number, 
             duration, work_description, status, created_at, updated_at
      FROM customer_queries 
      WHERE id = ?
    `;

    try {
      const rows = await executeQuery(query, [id]);
      return rows[0] || null;
    } catch (error) {
      console.error("Error fetching query by ID:", error);
      throw new Error("Failed to fetch query");
    }
  }

  // Update query status (for admin - Phase 2)
  static async updateStatus(id, status) {
    const query = `
      UPDATE customer_queries 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    try {
      const result = await executeQuery(query, [status, id]);
      return {
        success: result.affectedRows > 0,
        message:
          result.affectedRows > 0
            ? "Status updated successfully"
            : "Query not found",
      };
    } catch (error) {
      console.error("Error updating query status:", error);
      throw new Error("Failed to update query status");
    }
  }

  // Get recent queries count
  static async getRecentCount(days = 7) {
    const query = `
      SELECT COUNT(*) as count 
      FROM customer_queries 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `;

    try {
      const rows = await executeQuery(query, [days]);
      return rows[0].count;
    } catch (error) {
      console.error("Error getting recent queries count:", error);
      throw new Error("Failed to get queries count");
    }
  }

  // Get total count of all queries (add this to your Query model)
static async getTotalCount() {
  const query = `
    SELECT COUNT(*) as count 
    FROM customer_queries
  `;

  try {
    const rows = await executeQuery(query, []);
    return rows[0].count;
  } catch (error) {
    console.error("Error getting total queries count:", error);
    throw new Error("Failed to get total queries count");
  }
}

  // Validate query data
  static validateQueryData(data) {
    const errors = [];

    if (!data.company_name || data.company_name.trim().length < 2) {
      errors.push("Company name is required and must be at least 2 characters");
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push("Valid email address is required");
    }

    if (
      !data.contact_number ||
      !/^[6-9]\d{9}$/.test(data.contact_number.replace(/\s+/g, ""))
    ) {
      errors.push("Valid 10-digit mobile number is required");
    }

    if (!data.site_location || data.site_location.trim().length < 5) {
      errors.push(
        "Site location is required and must be at least 5 characters"
      );
    }

    if (!data.duration || data.duration.trim().length < 1) {
      errors.push("Duration is required");
    }

    if (!data.work_description || data.work_description.trim().length < 10) {
      errors.push(
        "Work description is required and must be at least 10 characters"
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

module.exports = Query;
