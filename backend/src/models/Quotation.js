// Updated Quotation Model - /backend/src/models/Quotation.js
const { executeQuery } = require("../config/database");

class Quotation {
  static async getAllWithPagination(filters = {}) {
    try {
      let baseQuery = `
        SELECT 
          q.id,
          q.quotation_number,
          q.customer_name,
          q.customer_contact,
          q.company_name,
          q.customer_gst_number,
          q.customer_id,
          q.subtotal,
          q.total_gst_amount,
          q.grand_total,
          q.quotation_status,
          q.delivery_status,
          q.additional_notes,
          q.created_at,
          q.updated_at,
          u.username as created_by_user,
          DATEDIFF(CURDATE(), DATE(q.created_at)) as days_ago,
          COUNT(qi.id) as total_items,
          GROUP_CONCAT(DISTINCT CASE WHEN qi.item_type = 'machine' THEN m.name END SEPARATOR ', ') as machines
        FROM quotations q
        LEFT JOIN users u ON q.created_by = u.id
        LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
        LEFT JOIN machines m ON qi.machine_id = m.id
      `;

      let countQuery = `
        SELECT COUNT(DISTINCT q.id) as total
        FROM quotations q
        LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
        LEFT JOIN machines m ON qi.machine_id = m.id
      `;

      const conditions = [];
      const params = [];

      // Apply filters
      if (filters.status) {
        conditions.push("q.quotation_status = ?");
        params.push(filters.status);
      }

      if (filters.delivery_status) {
        conditions.push("q.delivery_status = ?");
        params.push(filters.delivery_status);
      }

      // Combined search functionality (like query management)
      if (filters.search) {
        conditions.push(`(
          q.customer_name LIKE ? OR 
          q.company_name LIKE ? OR 
          q.customer_contact LIKE ? OR 
          q.quotation_number LIKE ? OR
          m.name LIKE ?
        )`);
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Specific customer name filter (for backward compatibility)
      if (filters.customer_name && !filters.search) {
        conditions.push("(q.customer_name LIKE ? OR q.company_name LIKE ?)");
        params.push(`%${filters.customer_name}%`, `%${filters.customer_name}%`);
      }

      if (filters.machine_id) {
        conditions.push("qi.machine_id = ?");
        params.push(filters.machine_id);
      }

      if (filters.start_date) {
        conditions.push("DATE(q.created_at) >= ?");
        params.push(filters.start_date);
      }

      if (filters.end_date) {
        conditions.push("DATE(q.created_at) <= ?");
        params.push(filters.end_date);
      }

      // Add WHERE clause if conditions exist
      if (conditions.length > 0) {
        const whereClause = " WHERE " + conditions.join(" AND ");
        baseQuery += whereClause;
        countQuery += whereClause;
      }

      // Group by for main query
      baseQuery += " GROUP BY q.id";

      // Add ordering
      const sortBy = filters.sort_by || "created_at";
      const sortOrder = filters.sort_order || "DESC";
      const allowedSortFields = [
        "created_at",
        "updated_at",
        "customer_name",
        "company_name",
        "grand_total",
        "quotation_status",
        "delivery_status",
      ];

      if (allowedSortFields.includes(sortBy)) {
        baseQuery += ` ORDER BY q.${sortBy} ${sortOrder}`;
      } else {
        baseQuery += " ORDER BY q.created_at DESC";
      }

      // Add pagination
      const limit = Math.min(parseInt(filters.limit) || 20, 100);
      const offset = parseInt(filters.offset) || 0;

      baseQuery += ` LIMIT ${limit} OFFSET ${offset}`;

      console.log("📝 Quotation Query:", baseQuery);
      console.log("📝 Count Query:", countQuery);
      console.log("📝 Parameters:", params);

      // Execute both queries
      const [quotations, countResult] = await Promise.all([
        executeQuery(baseQuery, params),
        executeQuery(countQuery, params),
      ]);

      const total = countResult[0]?.total || 0;

      console.log(`✅ Found ${quotations.length} quotations, ${total} total`);

      return {
        quotations,
        total: parseInt(total),
      };
    } catch (error) {
      console.error("❌ Error getting quotations with pagination:", error);
      throw error;
    }
  }

  // Get all quotations with filtering
  static async getAll(filters = {}) {
    const result = await this.getAllWithPagination(filters);
    return result.quotations;
  }
  // Get quotation by ID with complete details
  static async getById(id) {
    try {
      // Use stored procedure for complete quotation data
      const headerQuery = `CALL GetQuotationForPDF(?)`;
      const results = await executeQuery(headerQuery, [id]);

      if (!results || !results[0] || results[0].length === 0) {
        return null;
      }

      const quotationHeader = results[0][0];
      const quotationItems = results[1] || [];

      return {
        ...quotationHeader,
        items: quotationItems,
      };
    } catch (error) {
      console.error("Error getting quotation by ID:", error);
      throw error;
    }
  }

  // Create new quotation with items
  static async create(quotationData, userId) {
    let connection = null;

    try {
      // Get connection and start transaction manually
      const db = require("../config/database");
      connection = await db.getConnection();
      await connection.beginTransaction();

      const {
        customer_name,
        customer_contact,
        company_name,
        customer_id,
        items, // Array of quotation items
        terms_conditions,
        additional_notes,
      } = quotationData;

      // Validate required fields
      const validation = this.validateQuotationData(quotationData);
      if (!validation.isValid) {
        await connection.rollback();
        connection.release();
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      // Get next quotation number
      const quotationNumber = await this.getNextQuotationNumber();

      // Calculate totals from items
      const totals = this.calculateTotals(items);

      // Insert quotation header
      const quotationQuery = `
        INSERT INTO quotations (
          quotation_number,
          customer_name,
          customer_contact,
          company_name,
          customer_gst_number,  
          customer_id,
          subtotal,
          total_gst_amount,
          grand_total,
          terms_conditions,
          additional_notes,
          quotation_status,
          delivery_status,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'pending', ?)
      `;

      const [quotationResult] = await connection.execute(quotationQuery, [
        quotationNumber,
        customer_name,
        customer_contact,
        company_name || null,
        customer_gst_number || null,
        customer_id || null,
        totals.subtotal,
        totals.totalGst,
        totals.grandTotal,
        terms_conditions ? JSON.stringify(terms_conditions) : null,
        additional_notes || null,
        userId,
      ]);

      const quotationId = quotationResult.insertId;

      // Insert quotation items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemQuery = `
          INSERT INTO quotation_items (
            quotation_id,
            item_type,
            machine_id,
            description,
            duration_type,
            quantity,
            unit_price,
            gst_percentage,
            gst_amount,
            total_amount,
            sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.execute(itemQuery, [
          quotationId,
          item.item_type,
          item.machine_id || null,
          item.description,
          item.duration_type || null,
          item.quantity,
          item.unit_price,
          item.gst_percentage,
          item.gst_amount,
          item.total_amount,
          i + 1, // sort_order
        ]);
      }

      await connection.commit();
      connection.release();

      return {
        success: true,
        id: quotationId,
        quotation_number: quotationNumber,
        message: "Quotation created successfully",
      };
    } catch (error) {
      if (connection) {
        await connection.rollback();
        connection.release();
      }
      console.error("Error creating quotation:", error);
      throw error;
    }
  }

  static async update(id, updateData, userId) {
    try {
      console.log(
        "------------------------------------------------------------------------"
      );
      console.log("updateData: " + JSON.stringify(updateData));
      console.log(
        "------------------------------------------------------------------------"
      );

      // Check if quotation exists
      const existingQuotation = await this.getById(id);
      if (!existingQuotation) {
        return {
          success: false,
          message: "Quotation not found",
        };
      }

      // Handle main quotation fields update
      const allowedFields = [
        "customer_name",
        "customer_contact",
        "company_name",
        "customer_gst_number",
        "customer_id",
        "additional_notes",
        "quotation_status",
        "delivery_status",
        "terms_conditions",
      ];

      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === "terms_conditions") {
            updateFields.push(`${key} = ?`);
            params.push(
              typeof value === "string" ? value : JSON.stringify(value)
            );
          } else {
            updateFields.push(`${key} = ?`);
            params.push(value);
          }
        }
      }

      // Update main quotation fields if any exist
      if (updateFields.length > 0) {
        params.push(id);
        const quotationQuery = `
        UPDATE quotations 
        SET ${updateFields.join(", ")}
        WHERE id = ?
      `;
        await executeQuery(quotationQuery, params);
      }

      // Handle quotation items if provided
      if (updateData.items && Array.isArray(updateData.items)) {
        await this.updateQuotationItems(id, updateData.items);
      }

      return {
        success: true,
        message: "Quotation updated successfully",
      };
    } catch (error) {
      console.error("Error updating quotation:", error);
      throw error;
    }
  }

  // Helper method to handle quotation items update/insert/delete
  static async updateQuotationItems(quotationId, newItems) {
    try {
      // Get current items from database
      const getCurrentItemsQuery = `
      SELECT id, item_type, machine_id, description, duration_type, 
             quantity, unit_price, gst_percentage, sort_order
      FROM quotation_items 
      WHERE quotation_id = ? 
      ORDER BY sort_order ASC
    `;
      const currentItems = await executeQuery(getCurrentItemsQuery, [
        quotationId,
      ]);

      // Strategy: Delete all and re-insert (simpler and more reliable)
      // This approach ensures data consistency and handles all cases

      // Step 1: Delete all existing items
      const deleteQuery = "DELETE FROM quotation_items WHERE quotation_id = ?";
      await executeQuery(deleteQuery, [quotationId]);

      // Step 2: Calculate totals and insert new items
      let subtotal = 0;
      let totalGstAmount = 0;

      const insertQuery = `
      INSERT INTO quotation_items (
        quotation_id, item_type, machine_id, description, 
        duration_type, quantity, unit_price, gst_percentage,
        gst_amount, total_amount, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];

        // Calculate amounts
        const itemSubtotal =
          parseFloat(item.quantity) * parseFloat(item.unit_price);
        const gstAmount =
          (itemSubtotal * parseFloat(item.gst_percentage)) / 100;
        const totalAmount = itemSubtotal + gstAmount;

        // Add to quotation totals
        subtotal += itemSubtotal;
        totalGstAmount += gstAmount;

        // Insert item
        await executeQuery(insertQuery, [
          quotationId,
          item.item_type,
          item.machine_id || null,
          item.description,
          item.duration_type || null,
          parseFloat(item.quantity),
          parseFloat(item.unit_price),
          parseFloat(item.gst_percentage),
          gstAmount,
          totalAmount,
          i + 1, // sort_order
        ]);
      }

      // Step 3: Update quotation totals
      const grandTotal = subtotal + totalGstAmount;
      const updateTotalsQuery = `
      UPDATE quotations 
      SET subtotal = ?, total_gst_amount = ?, grand_total = ?
      WHERE id = ?
    `;

      await executeQuery(updateTotalsQuery, [
        subtotal,
        totalGstAmount,
        grandTotal,
        quotationId,
      ]);

      console.log(
        `Updated quotation ${quotationId} with ${newItems.length} items. Total: ₹${grandTotal}`
      );
    } catch (error) {
      console.error("Error updating quotation items:", error);
      throw error;
    }
  }

  // Delete quotation (cascades to items)
  static async delete(id) {
    try {
      const query = "DELETE FROM quotations WHERE id = ?";
      const result = await executeQuery(query, [id]);

      if (result.affectedRows > 0) {
        return {
          success: true,
          message: "Quotation deleted successfully",
        };
      } else {
        return {
          success: false,
          message: "Quotation not found",
        };
      }
    } catch (error) {
      console.error("Error deleting quotation:", error);
      throw error;
    }
  }

  // Update quotation status
  static async updateStatus(id, status) {
    try {
      const validStatuses = [
        "draft",
        "sent",
        "accepted",
        "rejected",
        "expired",
      ];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: "Invalid quotation status",
        };
      }

      const query = "UPDATE quotations SET quotation_status = ? WHERE id = ?";
      const result = await executeQuery(query, [status, id]);

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: "Quotation not found",
        };
      }

      return {
        success: true,
        message: "Quotation status updated successfully",
      };
    } catch (error) {
      console.error("Error updating quotation status:", error);
      throw error;
    }
  }

  // Update delivery status
  static async updateDeliveryStatus(id, status) {
    try {
      const validStatuses = ["pending", "delivered", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        return {
          success: false,
          message: "Invalid delivery status",
        };
      }

      const query = "UPDATE quotations SET delivery_status = ? WHERE id = ?";
      const result = await executeQuery(query, [status, id]);

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: "Quotation not found",
        };
      }

      return {
        success: true,
        message: "Delivery status updated successfully",
      };
    } catch (error) {
      console.error("Error updating delivery status:", error);
      throw error;
    }
  }

  // Get next quotation number
  static async getNextQuotationNumber() {
    try {
      // FIX: First check if the stored procedure exists and works
      console.log("🔧 Attempting to get next quotation number...");

      // Method 1: Try stored procedure first
      try {
        const result = await executeQuery("CALL GetNextQuotationNumber()");
        console.log("🔧 Stored procedure result:", result);

        // FIX: Handle different result structures
        if (result && result.length > 0) {
          if (result[0] && result[0].length > 0 && result[0][0]) {
            const quotationNumber = result[0][0].quotation_number;
            if (quotationNumber) {
              console.log(
                "✅ Got quotation number from stored procedure:",
                quotationNumber
              );
              return quotationNumber;
            }
          }
        }

        console.log(
          "⚠️ Stored procedure returned empty result, falling back to manual method"
        );
      } catch (procedureError) {
        console.log(
          "⚠️ Stored procedure failed, falling back to manual method:",
          procedureError.message
        );
      }

      // Method 2: Manual implementation as fallback
      console.log("🔧 Using manual quotation number generation...");

      // Get current year
      const currentYear = new Date().getFullYear();
      const yearSuffix = currentYear.toString().slice(-2); // Get last 2 digits of year

      // Try to get the current counter
      let currentNumber = 1;

      try {
        // First, try to get the max quotation number for current year
        const maxQuery = `
        SELECT MAX(CAST(SUBSTRING(quotation_number, 4, LENGTH(quotation_number) - 5) AS UNSIGNED)) as max_num
        FROM quotations 
        WHERE quotation_number LIKE ?
      `;

        const maxResult = await executeQuery(maxQuery, [`QCM%${yearSuffix}`]);
        console.log("🔧 Max quotation query result:", maxResult);

        if (maxResult && maxResult[0] && maxResult[0].max_num) {
          currentNumber = parseInt(maxResult[0].max_num) + 1;
          console.log(
            "🔧 Found existing quotations, next number will be:",
            currentNumber
          );
        } else {
          console.log("🔧 No existing quotations found, starting with 1");
          currentNumber = 1;
        }
      } catch (maxQueryError) {
        console.log(
          "⚠️ Could not get max quotation number, starting with 1:",
          maxQueryError.message
        );
        currentNumber = 1;
      }

      // Format: QCM + 4-digit number + 2-digit year (e.g., QCM000125)
      const formattedNumber = String(currentNumber).padStart(4, "0");
      const quotationNumber = `QCM${formattedNumber}${yearSuffix}`;

      console.log("✅ Generated quotation number:", quotationNumber);
      return quotationNumber;
    } catch (error) {
      console.error("❌ Error getting next quotation number:", error);

      // Final fallback: Generate with timestamp
      const timestamp = Date.now().toString().slice(-6);
      const yearSuffix = new Date().getFullYear().toString().slice(-2);
      const fallbackNumber = `QCM${timestamp}${yearSuffix}`;

      console.log("🚨 Using timestamp fallback:", fallbackNumber);
      return fallbackNumber;
    }
  }

  // Calculate totals from items array
  static calculateTotals(items) {
    let subtotal = 0;
    let totalGst = 0;

    items.forEach((item) => {
      const itemSubtotal =
        parseFloat(item.unit_price) * parseFloat(item.quantity);
      const itemGst = (itemSubtotal * parseFloat(item.gst_percentage)) / 100;

      subtotal += itemSubtotal;
      totalGst += itemGst;
    });

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      totalGst: parseFloat(totalGst.toFixed(2)),
      grandTotal: parseFloat((subtotal + totalGst).toFixed(2)),
    };
  }

  // Validation helper
  static validateQuotationData(quotationData, isUpdate = false) {
    const errors = [];

    if (!isUpdate || quotationData.customer_name !== undefined) {
      if (
        !quotationData.customer_name ||
        quotationData.customer_name.trim().length < 2
      ) {
        errors.push("Customer name must be at least 2 characters");
      }
    }

    if (!isUpdate || quotationData.customer_contact !== undefined) {
      if (
        !quotationData.customer_contact ||
        !/^\d{10}$/.test(quotationData.customer_contact)
      ) {
        errors.push("Customer contact must be a valid 10-digit phone number");
      }
    }

    if (
      !isUpdate &&
      (!quotationData.items ||
        !Array.isArray(quotationData.items) ||
        quotationData.items.length === 0)
    ) {
      errors.push("At least one quotation item is required");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Get quotation statistics
  static async getStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_quotations,
          COUNT(CASE WHEN quotation_status = 'draft' THEN 1 END) as pending_quotations,
          COUNT(CASE WHEN quotation_status = 'accepted' THEN 1 END) as accepted_quotations,
          COUNT(CASE WHEN quotation_status = 'rejected' THEN 1 END) as rejected_quotations,
          COUNT(CASE WHEN delivery_status = 'delivered' OR delivery_status = 'completed' THEN 1 END) as delivered_orders,
          SUM(grand_total) as total_revenue,
          AVG(grand_total) as average_quotation_amount,
          (COUNT(CASE WHEN quotation_status = 'accepted' THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as conversion_rate,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as recent_quotations,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today_quotations,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as week_quotations
        FROM quotations
      `);

      return stats[0];
    } catch (error) {
      console.error("Error getting quotation stats:", error);
      throw error;
    }
  }

  // Get customer quotation history
  static async getCustomerHistory(customerId) {
    try {
      const query = `
      SELECT 
        q.id,
        q.quotation_number,
        q.created_at,
        q.subtotal,
        q.total_gst_amount,
        q.grand_total,
        q.quotation_status,
        q.delivery_status,
        q.additional_notes,
        COUNT(qi.id) as total_items,
        GROUP_CONCAT(
          DISTINCT CASE 
            WHEN qi.item_type = 'machine' THEN CONCAT(m.name, ' (', qi.duration_type, ')')
            ELSE NULL 
          END 
          SEPARATOR ', '
        ) as machines,
        GROUP_CONCAT(
          DISTINCT CASE 
            WHEN qi.item_type = 'additional_charge' THEN qi.description
            ELSE NULL 
          END 
          SEPARATOR ', '
        ) as additional_charges
      FROM quotations q
      LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
      LEFT JOIN machines m ON qi.machine_id = m.id AND qi.item_type = 'machine'
      WHERE q.customer_id = ?
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `;

      const quotations = await executeQuery(query, [customerId]);
      return quotations;
    } catch (error) {
      console.error("Error getting customer quotation history:", error);
      throw error;
    }
  }

  // Get pricing history by customer name and contact
  static async getPricingHistory(customerName, customerContact) {
    try {
      const query = `
      SELECT 
        q.id,
        q.quotation_number,
        q.created_at,
        q.subtotal,
        q.total_gst_amount,
        q.grand_total,
        q.quotation_status,
        q.delivery_status,
        COUNT(qi.id) as total_items,
        GROUP_CONCAT(
          DISTINCT CASE 
            WHEN qi.item_type = 'machine' THEN CONCAT(m.name, ' - ₹', qi.unit_price, '/', qi.duration_type)
            ELSE CONCAT(qi.description, ' - ₹', qi.unit_price)
          END 
          SEPARATOR ' | '
        ) as pricing_details,
        GROUP_CONCAT(
          DISTINCT CASE 
            WHEN qi.item_type = 'machine' THEN m.name
            ELSE NULL 
          END 
          SEPARATOR ', '
        ) as machines
      FROM quotations q
      LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
      LEFT JOIN machines m ON qi.machine_id = m.id AND qi.item_type = 'machine'
      WHERE q.customer_name LIKE ? AND q.customer_contact = ?
      GROUP BY q.id
      ORDER BY q.created_at DESC
    `;

      const quotations = await executeQuery(query, [
        `%${customerName}%`,
        customerContact,
      ]);
      return quotations;
    } catch (error) {
      console.error("Error getting pricing history:", error);
      throw error;
    }
  }
}

module.exports = Quotation;
