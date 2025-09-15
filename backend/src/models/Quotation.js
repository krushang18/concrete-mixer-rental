// Updated Quotation Model - /backend/src/models/Quotation.js
const { executeQuery } = require("../config/database");

class Quotation {
  // Get all quotations with filtering
  static async getAll(filters = {}) {
    try {
      let query = `
        SELECT 
          q.id,
          q.quotation_number,
          q.customer_name,
          q.customer_contact,
          q.company_name,
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

      if (filters.customer_name) {
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

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      // Group by quotation
      query += " GROUP BY q.id";

      // Add ordering
      query += " ORDER BY q.created_at DESC";

      // ✅ SOLUTION: Build LIMIT directly into SQL string
      if (filters.limit) {
        const limitValue = parseInt(filters.limit);
        if (!isNaN(limitValue) && limitValue > 0 && limitValue <= 1000) {
          query += ` LIMIT ${limitValue}`;

          if (filters.offset) {
            const offsetValue = parseInt(filters.offset);
            if (!isNaN(offsetValue) && offsetValue >= 0) {
              query += ` OFFSET ${offsetValue}`;
            }
          }
        } else {
          query += ` LIMIT 50`;
        }
      } else {
        query += ` LIMIT 50`;
      }

      console.log("📝 Final Quotation SQL:", query);
      console.log("📝 Parameters:", params);

      const quotations = await executeQuery(query, params);
      console.log(
        "✅ Quotation query successful, rows returned:",
        quotations.length
      );

      return quotations;
    } catch (error) {
      console.error("❌ Error getting all quotations:", error);
      throw error;
    }
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

  // Update quotation
  static async update(id, updateData, userId) {
    try {
      // Check if quotation exists
      const existingQuotation = await this.getById(id);
      if (!existingQuotation) {
        return {
          success: false,
          message: "Quotation not found",
        };
      }

      const allowedFields = [
        "customer_name",
        "customer_contact",
        "company_name",
        "customer_id",
        "additional_notes",
        "quotation_status",
        "delivery_status",
      ];

      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: "No valid fields to update",
        };
      }

      params.push(id);

      const query = `
        UPDATE quotations 
        SET ${updateFields.join(", ")}
        WHERE id = ?
      `;

      const result = await executeQuery(query, params);

      if (result.affectedRows > 0) {
        return {
          success: true,
          message: "Quotation updated successfully",
        };
      } else {
        return {
          success: false,
          message: "Quotation not found or no changes made",
        };
      }
    } catch (error) {
      console.error("Error updating quotation:", error);
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
      const result = await executeQuery("CALL GetNextQuotationNumber()");
      return result[0][0].quotation_number;
    } catch (error) {
      console.error("Error getting next quotation number:", error);
      throw error;
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
          COUNT(CASE WHEN quotation_status = 'pending' THEN 1 END) as pending_quotations,
          COUNT(CASE WHEN quotation_status = 'accepted' THEN 1 END) as accepted_quotations,
          COUNT(CASE WHEN quotation_status = 'rejected' THEN 1 END) as rejected_quotations,
          COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered_orders,
          SUM(grand_total) as total_revenue,
          AVG(grand_total) as average_quotation_amount,
          (COUNT(CASE WHEN quotation_status = 'accepted' THEN 1 END) * 100.0 / COUNT(*)) as conversion_rate
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
