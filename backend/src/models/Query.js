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

  // Get all queries (for admin - Phase 2)
  static async getAll(filters = {}) {
    let query = `
      SELECT id, company_name, email, site_location, contact_number, 
             duration, work_description, status, created_at, updated_at
      FROM customer_queries
    `;

    const params = [];
    const conditions = [];

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    if (filters.startDate) {
      conditions.push("created_at >= ?");
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push("created_at <= ?");
      params.push(filters.endDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    if (filters.limit) {
      query += " LIMIT ?";
      params.push(parseInt(filters.limit));
    }

    try {
      const rows = await executeQuery(query, params);
      return rows;
    } catch (error) {
      console.error("Error fetching queries:", error);
      throw new Error("Failed to fetch queries");
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
