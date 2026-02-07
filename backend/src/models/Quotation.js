// Updated Quotation Model - Refactored for QuotationMachines and Simple Terms
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
          q.additional_notes,
          q.created_at,
          q.updated_at,
          u.username as created_by_user,
          DATEDIFF(CURDATE(), DATE(q.created_at)) as days_ago,
          COUNT(qi.id) as total_items,
          GROUP_CONCAT(DISTINCT CASE WHEN qi.item_type = 'machine' THEN qm.name END SEPARATOR ', ') as machines,
          COALESCE(SUM(CASE WHEN qi.item_type = 'machine' THEN qi.unit_price * qi.quantity ELSE 0 END), 0) as machine_total
        FROM quotations q
        LEFT JOIN users u ON q.created_by = u.id
        LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
        LEFT JOIN quotation_machines qm ON qi.quotation_machine_id = qm.id
      `;

      let countQuery = `
        SELECT COUNT(DISTINCT q.id) as total
        FROM quotations q
        LEFT JOIN quotation_items qi ON q.id = qi.quotation_id
        LEFT JOIN quotation_machines qm ON qi.quotation_machine_id = qm.id
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

      // Combined search functionality
      if (filters.search) {
        conditions.push(`(
          q.customer_name LIKE ? OR 
          q.company_name LIKE ? OR 
          q.customer_contact LIKE ? OR 
          q.quotation_number LIKE ? OR
          qm.name LIKE ?
        )`);
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Backward compatibility filters
      if (filters.customer_name && !filters.search) {
        conditions.push("(q.customer_name LIKE ? OR q.company_name LIKE ?)");
        params.push(`%${filters.customer_name}%`, `%${filters.customer_name}%`);
      }

      if (filters.machine_id) {
        // This machine_id now refers to quotation_machine_id
        conditions.push("qi.quotation_machine_id = ?");
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

      // Execute both queries
      const [quotations, countResult] = await Promise.all([
        executeQuery(baseQuery, params),
        executeQuery(countQuery, params),
      ]);

      const total = countResult[0]?.total || 0;

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
  
  // Get quotation by ID with complete details (Replaced SP with Direct SQL)
  static async getById(id) {
    try {
      const headerQuery = `
        SELECT q.*, 
               u.username as created_by_user 
        FROM quotations q
        LEFT JOIN users u ON q.created_by = u.id
        WHERE q.id = ?
        LIMIT 1
      `;
      
      const itemsQuery = `
         SELECT 
             qi.*,
             qm.name as machine_name,
             qm.description as machine_description
         FROM quotation_items qi
         LEFT JOIN quotation_machines qm ON qi.quotation_machine_id = qm.id
         WHERE qi.quotation_id = ?
         ORDER BY qi.sort_order ASC
      `;

      const [quotations] = await executeQuery(headerQuery, [id]);
      
      if (!quotations) {
        return null;
      }
      
      const quotation = quotations; // executeQuery returns array of rows if just Select? verify util.
      // executeQuery wrapper returns [rows] or rows?
      // In database.js: return rows;
      // So if 1 row, it is array[0].
      
      if (!quotation) return null;

      const items = await executeQuery(itemsQuery, [id]);

      return {
        ...quotation,
        items: items || [],
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
      const db = require("../config/database");
      connection = await db.getConnection();
      await connection.beginTransaction();

      const {
        customer_name,
        customer_contact,
        company_name,
        customer_gst_number,
        customer_id,
        items,
        terms_text, // Simplified terms
        additional_notes,
      } = quotationData;

      // Validation
      const validation = this.validateQuotationData(quotationData);
      if (!validation.isValid) {
        await connection.rollback();
        connection.release();
        return { success: false, message: "Validation failed", errors: validation.errors };
      }

      const quotationNumber = await this.getNextQuotationNumber();
      const totals = this.calculateTotals(items);

      const quotationQuery = `
        INSERT INTO quotations (
          quotation_number, customer_name, customer_contact, company_name,
          customer_gst_number, customer_id, subtotal, total_gst_amount,
          grand_total, terms_text, additional_notes, quotation_status,
          delivery_status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'pending', ?)
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
        terms_text || null,
        additional_notes || null,
        userId,
      ]);

      const quotationId = quotationResult.insertId;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Use quotation_machine_id
        const machineId = item.quotation_machine_id || item.machine_id; // Support both for now if needed

        // Calculate totals (Backend validation/calculation)
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const gstPercent = parseFloat(item.gst_percentage) || 0;
        
        const itemSubtotal = qty * price;
        const gstAmount = (itemSubtotal * gstPercent) / 100;
        const totalAmount = itemSubtotal + gstAmount;

        const itemQuery = `
          INSERT INTO quotation_items (
            quotation_id, item_type, quotation_machine_id, description,
            duration_type, quantity, unit_price, gst_percentage,
            gst_amount, total_amount, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        await connection.execute(itemQuery, [
          quotationId,
          item.item_type || 'machine', // Default to machine if undefined? Or validation catches it?
          item.item_type === 'machine' ? (machineId || null) : null,
          item.description || '',
          item.duration_type || null,
          qty,
          price,
          gstPercent,
          gstAmount,
          totalAmount,
          i + 1,
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
      const existingQuotation = await this.getById(id);
      if (!existingQuotation) {
        return { success: false, message: "Quotation not found" };
      }

      const allowedFields = [
        "customer_name", "customer_contact", "company_name",
        "customer_gst_number", "customer_id", "additional_notes",
        "quotation_status", "delivery_status", "terms_text"
      ];

      const updateFields = [];
      const params = [];

      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updateFields.length > 0) {
        params.push(id);
        const quotationQuery = `UPDATE quotations SET ${updateFields.join(", ")} WHERE id = ?`;
        await executeQuery(quotationQuery, params);
      }

      if (updateData.items && Array.isArray(updateData.items)) {
        await this.updateQuotationItems(id, updateData.items);
      }

      return { success: true, message: "Quotation updated successfully" };
    } catch (error) {
      console.error("Error updating quotation:", error);
      throw error;
    }
  }

  static async updateQuotationItems(quotationId, newItems) {
    try {
      const deleteQuery = "DELETE FROM quotation_items WHERE quotation_id = ?";
      await executeQuery(deleteQuery, [quotationId]);

      let subtotal = 0;
      let totalGstAmount = 0;

      const insertQuery = `
        INSERT INTO quotation_items (
          quotation_id, item_type, quotation_machine_id, description, 
          duration_type, quantity, unit_price, gst_percentage,
          gst_amount, total_amount, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        
        // Resolve machine id
        const machineId = item.quotation_machine_id || item.machine_id;

        const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
        const gstAmount = (itemSubtotal * parseFloat(item.gst_percentage)) / 100;
        const totalAmount = itemSubtotal + gstAmount;

        subtotal += itemSubtotal;
        totalGstAmount += gstAmount;

        await executeQuery(insertQuery, [
          quotationId,
          item.item_type,
          item.item_type === 'machine' ? (machineId || null) : null,
          item.description,
          item.duration_type || null,
          parseFloat(item.quantity),
          parseFloat(item.unit_price),
          parseFloat(item.gst_percentage),
          gstAmount,
          totalAmount,
          i + 1,
        ]);
      }

      const grandTotal = subtotal + totalGstAmount;
      const updateTotalsQuery = `UPDATE quotations SET subtotal = ?, total_gst_amount = ?, grand_total = ? WHERE id = ?`;
      await executeQuery(updateTotalsQuery, [subtotal, totalGstAmount, grandTotal, quotationId]);
    } catch (error) {
      console.error("Error updating quotation items:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = "DELETE FROM quotations WHERE id = ?";
      const result = await executeQuery(query, [id]);
      if (result.affectedRows > 0) return { success: true, message: "Quotation deleted successfully" };
      return { success: false, message: "Quotation not found" };
    } catch (error) {
      console.error("Error deleting quotation:", error);
      throw error;
    }
  }

  // Helper methods
  static async updateStatus(id, status) {
     const query = "UPDATE quotations SET quotation_status = ? WHERE id = ?";
     // ... simple update
     await executeQuery(query, [status, id]);
     return { success: true, message: "Status updated" }; 
     // For brevity, assuming caller checks validity or full impl
  }



  // Consistent with Controller logic, but simplified here. 
  // Controller calls GetNextQuotationNumber usually via stored procedure or manual.
  // We'll reimplement the manual fallback here as primary since SP might be outdated
  static async getNextQuotationNumber() {
    try {
      const currentYear = new Date().getFullYear();
      const yearSuffix = currentYear.toString().slice(-2);

      // 1. Check current state of counter
      const checkQuery = `SELECT * FROM quotation_counter WHERE id = 1`;
      let [row] = await executeQuery(checkQuery);

      // 2. If no row or uninitialized (0), sync with existing quotations
      if (!row || row.current_number === 0) {
          // Find max number from existing quotations to preserve sequence
          const maxQuery = `SELECT MAX(CAST(SUBSTRING(quotation_number, 4, 4) AS UNSIGNED)) as max_num FROM quotations WHERE quotation_number LIKE ?`;
          const [maxResult] = await executeQuery(maxQuery, [`QCM%${yearSuffix}`]); // Filter by current year context if needed, or global? Standard is usually yearly reset or continuous. Assuming yearly based on old logic.
          
          let lastMax = 0;
          if (maxResult && maxResult.max_num) {
              lastMax = parseInt(maxResult.max_num);
          }

          if (!row) {
              await executeQuery(`INSERT INTO quotation_counter (id, current_number, last_updated) VALUES (1, ?, NOW())`, [lastMax]);
          } else {
              await executeQuery(`UPDATE quotation_counter SET current_number = ?, last_updated = NOW() WHERE id = 1`, [lastMax]);
          }
      }

      // 3. Increment
      await executeQuery(`UPDATE quotation_counter SET current_number = current_number + 1, last_updated = NOW() WHERE id = 1`);

      // 4. Fetch new number
      const [updatedRow] = await executeQuery(`SELECT current_number FROM quotation_counter WHERE id = 1`);
      const currentNumber = updatedRow.current_number;

      // 5. Format
      const formattedNumber = String(currentNumber).padStart(4, "0");
      return `QCM${formattedNumber}${yearSuffix}`;
    } catch (e) {
       console.error("Error generating number from counter table", e);
       return `QCM${Date.now()}`;
    }
  }

  static calculateTotals(items) {
    let subtotal = 0;
    let totalGst = 0;
    items.forEach((item) => {
      const itemSubtotal = parseFloat(item.unit_price) * parseFloat(item.quantity);
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

  static validateQuotationData(quotationData, isUpdate = false) {
    const errors = [];
    if (!isUpdate || quotationData.customer_name) {
      if (!quotationData.customer_name || quotationData.customer_name.trim().length < 2) {
        errors.push("Customer name required");
      }
    }
    if (!isUpdate || quotationData.customer_contact) {
      if (!quotationData.customer_contact || !/^\d{10}$/.test(quotationData.customer_contact)) {
        errors.push("Valid 10-digit contact required");
      }
    }
    if (!isUpdate && (!quotationData.items || quotationData.items.length === 0)) {
       errors.push("Items required");
    }
    return { isValid: errors.length === 0, errors };
  }
  static async getCustomerHistory(customerId) {
      const query = `
          SELECT id, quotation_number, grand_total, quotation_status, created_at
          FROM quotations
          WHERE customer_id = ?
          ORDER BY created_at DESC
      `;
      return await executeQuery(query, [customerId]);
  }

  static async getPricingHistory(name, contact) {
      const query = `
          SELECT id, quotation_number, grand_total, quotation_status, created_at,
                 (SELECT GROUP_CONCAT(CONCAT(description, ' (', quantity, ')') SEPARATOR ', ') 
                  FROM quotation_items WHERE quotation_id = quotations.id) as pricing_details
          FROM quotations
          WHERE customer_name = ? OR customer_contact = ?
          ORDER BY created_at DESC
          LIMIT 5
      `;
      return await executeQuery(query, [name, contact]);
  }
}

module.exports = Quotation;
