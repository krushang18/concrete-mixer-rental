const { executeQuery } = require("../config/database");

class Customer {
  // Get all customers with filtering
  static async getAll(filters = {}) {
    try {
      let query = `
      SELECT 
        c.id,
        c.company_name,
        c.contact_person,
        c.email,
        c.phone,
        c.address,
        c.site_location,
        c.gst_number,
        c.created_at,
        c.updated_at,
        COUNT(q.id) as total_quotations,
        MAX(q.created_at) as last_quotation_date,
        SUM(CASE WHEN q.quotation_status = 'accepted' THEN 1 ELSE 0 END) as accepted_quotations,
        AVG(q.grand_total) as avg_quotation_amount
      FROM customers c
      LEFT JOIN quotations q ON c.id = q.customer_id
    `;

      const conditions = [];
      const params = [];

      // Apply filters
      if (filters.search) {
        conditions.push(
          "(c.company_name LIKE ? OR c.contact_person LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)"
        );
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filters.city) {
        conditions.push("c.address LIKE ?");
        params.push(`%${filters.city}%`);
      }

      if (filters.has_gst !== undefined) {
        if (filters.has_gst) {
          conditions.push('c.gst_number IS NOT NULL AND c.gst_number != ""');
        } else {
          conditions.push('(c.gst_number IS NULL OR c.gst_number = "")');
        }
      }

      if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
      }

      query += " GROUP BY c.id ORDER BY c.created_at DESC";

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

      console.log("📝 Final Customer SQL:", query);
      console.log("📝 Parameters:", params);

      const customers = await executeQuery(query, params);
      console.log(
        "✅ Customer query successful, rows returned:",
        customers.length
      );

      return customers;
    } catch (error) {
      console.error("❌ Error getting all customers:", error);
      throw error;
    }
  }

  static async getAllWithPagination(filters = {}) {
    try {
      // Build the base query for counting and selecting
      const baseQuery = `
      FROM customers c
      LEFT JOIN quotations q ON c.id = q.customer_id
    `;

      const conditions = [];
      const params = [];

      // Apply filters (same logic as before)
      if (filters.search) {
        conditions.push(
          "(c.company_name LIKE ? OR c.contact_person LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)"
        );
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (filters.city) {
        conditions.push("c.address LIKE ?");
        params.push(`%${filters.city}%`);
      }

      if (filters.has_gst !== undefined) {
        if (filters.has_gst === "true" || filters.has_gst === true) {
          conditions.push('c.gst_number IS NOT NULL AND c.gst_number != ""');
        } else if (filters.has_gst === "false" || filters.has_gst === false) {
          conditions.push('(c.gst_number IS NULL OR c.gst_number = "")');
        }
      }

      const whereClause =
        conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";

      // First, get the total count
      const countQuery = `
      SELECT COUNT(DISTINCT c.id) as total
      ${baseQuery}
      ${whereClause}
    `;

      console.log("📝 Count Query:", countQuery);
      console.log("📝 Count Params:", params);

      const [countResult] = await executeQuery(countQuery, params);
      const total = countResult.total || 0;

      // If no records found, return early
      if (total === 0) {
        return {
          customers: [],
          total: 0,
        };
      }

      // Build the main query with sorting and pagination
      let mainQuery = `
      SELECT 
        c.id,
        c.company_name,
        c.contact_person,
        c.email,
        c.phone,
        c.address,
        c.site_location,
        c.gst_number,
        c.created_at,
        c.updated_at,
        COUNT(q.id) as total_quotations,
        MAX(q.created_at) as last_quotation_date,
        SUM(CASE WHEN q.quotation_status = 'accepted' THEN 1 ELSE 0 END) as accepted_quotations,
        AVG(q.grand_total) as avg_quotation_amount
      ${baseQuery}
      ${whereClause}
      GROUP BY c.id
    `;

      // Add sorting
      const validSortFields = [
        "company_name",
        "contact_person",
        "created_at",
        "updated_at",
        "total_quotations",
        "last_quotation_date",
        "accepted_quotations",
      ];
      const sortBy = validSortFields.includes(filters.sortBy)
        ? filters.sortBy
        : "created_at";
      const sortOrder =
        filters.sortOrder && filters.sortOrder.toUpperCase() === "ASC"
          ? "ASC"
          : "DESC";

      mainQuery += ` ORDER BY c.${sortBy} ${sortOrder}`;

      // Add pagination
      const limit = Math.min(Math.max(parseInt(filters.limit) || 10, 1), 100);
      const offset = Math.max(parseInt(filters.offset) || 0, 0);

      mainQuery += ` LIMIT ${limit} OFFSET ${offset}`;

      console.log("📝 Main Customer SQL:", mainQuery);
      console.log("📝 Parameters:", params);

      const customers = await executeQuery(mainQuery, params);

      console.log(
        `✅ Customer query successful - Total: ${total}, Returned: ${customers.length}`
      );

      return {
        customers,
        total,
      };
    } catch (error) {
      console.error("❌ Error getting customers with pagination:", error);
      throw error;
    }
  }

  // Keep the old method for backward compatibility (if needed)
  static async getAll(filters = {}) {
    console.warn(
      "⚠️ Customer.getAll() is deprecated. Use getAllWithPagination() instead."
    );

    // Convert to new method
    const result = await this.getAllWithPagination(filters);
    return result.customers;
  }

  // Get customer by ID
  static async getById(id) {
    try {
      if (!id) {
        return null;
      }

      const query = `
        SELECT id, company_name, contact_person, email, phone, 
               address, site_location, gst_number, created_at, updated_at
        FROM customers 
        WHERE id = ?
      `;

      const result = await executeQuery(query, [id]);
      return result[0] || null;
    } catch (error) {
      console.error("❌ Error getting customer by ID:", error);
      throw error;
    }
  }

  // Find customer by contact details
  static async findByContact(contact) {
    try {
      // FIX: Ensure contact is not undefined
      if (!contact) {
        console.log("⚠️ Contact is missing or undefined");
        return null;
      }

      const query = `
        SELECT id, company_name, contact_person, email, phone, 
               address, site_location, gst_number, created_at, updated_at
        FROM customers 
        WHERE phone = ?
      `;

      // FIX: Convert undefined to null
      const cleanContact = contact || null;
      console.log("🔧 Finding customer by contact:", cleanContact);

      const result = await executeQuery(query, [cleanContact]);
      return result[0] || null;
    } catch (error) {
      console.error("❌ Error finding customer by contact:", error);
      throw error;
    }
  }

  // Create new customer
  static async create(customerData) {
    try {
      console.log("🔧 Customer.create called with:", customerData);

      // FIX: Convert all undefined values to null
      const cleanData = {
        company_name: customerData.company_name || null,
        contact_person: customerData.contact_person || null,
        email: customerData.email || null,
        phone: customerData.phone || null,
        address: customerData.address || null,
        site_location: customerData.site_location || null,
        gst_number: customerData.gst_number || null,
      };

      // Validate required fields
      if (!cleanData.phone) {
        return {
          success: false,
          message: "Phone number is required",
        };
      }

      if (!cleanData.contact_person && !cleanData.company_name) {
        return {
          success: false,
          message: "Either contact person or company name is required",
        };
      }

      const query = `
        INSERT INTO customers (
          company_name, contact_person, email, phone, 
          address, site_location, gst_number
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      const params = [
        cleanData.company_name,
        cleanData.contact_person,
        cleanData.email,
        cleanData.phone,
        cleanData.address,
        cleanData.site_location,
        cleanData.gst_number,
      ];

      console.log("🔧 Customer create SQL params:", params);

      const result = await executeQuery(query, params);

      return {
        success: true,
        id: result.insertId,
        message: "Customer created successfully",
      };
    } catch (error) {
      console.error("❌ Error creating customer:", error);

      // Handle duplicate entry error
      if (error.code === "ER_DUP_ENTRY") {
        return {
          success: false,
          message: "Customer with this phone number already exists",
        };
      }

      throw error;
    }
  }

  // Update customer
  static async update(id, customerData) {
    try {
      const {
        company_name,
        contact_person,
        email,
        phone,
        address,
        site_location,
        gst_number,
      } = customerData;

      // Validate data
      const validation = this.validateCustomerData(customerData, true);
      if (!validation.isValid) {
        return {
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        };
      }

      // Check if customer exists
      const existingCustomer = await this.getById(id);
      if (!existingCustomer) {
        return {
          success: false,
          message: "Customer not found",
        };
      }

      // Check for conflicts with other customers
      if (phone || email) {
        const conflictingCustomer = await this.findByContact(
          phone || existingCustomer.phone,
          email || existingCustomer.email
        );

        if (conflictingCustomer && conflictingCustomer.id !== parseInt(id)) {
          return {
            success: false,
            message: "Another customer with this phone or email already exists",
          };
        }
      }

      const query = `
        UPDATE customers 
        SET 
          company_name = ?,
          contact_person = ?,
          email = ?,
          phone = ?,
          address = ?,
          site_location = ?,
          gst_number = ?,
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(query, [
        company_name || existingCustomer.company_name,
        contact_person !== undefined
          ? contact_person
          : existingCustomer.contact_person,
        email !== undefined ? email : existingCustomer.email,
        phone || existingCustomer.phone,
        address !== undefined ? address : existingCustomer.address,
        site_location !== undefined
          ? site_location
          : existingCustomer.site_location,
        gst_number !== undefined ? gst_number : existingCustomer.gst_number,
        id,
      ]);

      return {
        success: true,
        message: "Customer updated successfully",
      };
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  }

  // Delete customer (check for quotations first)
  static async delete(id) {
    try {
      // Check if customer exists
      const existingCustomer = await this.getById(id);
      if (!existingCustomer) {
        return {
          success: false,
          message: "Customer not found",
        };
      }

      // Check if customer has quotations
      if (existingCustomer.total_quotations > 0) {
        return {
          success: false,
          message: "Cannot delete customer with existing quotations",
          quotationCount: existingCustomer.total_quotations,
        };
      }

      // Delete customer
      await executeQuery("DELETE FROM customers WHERE id = ?", [id]);

      return {
        success: true,
        message: "Customer deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }
  }

  // Get customer quotation history
  static async getQuotationHistory(id) {
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

      const quotations = await executeQuery(query, [id]);
      return quotations;
    } catch (error) {
      console.error("Error getting customer quotation history:", error);
      throw error;
    }
  }

  // Get customer statistics
  static async getStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total_customers,
          COUNT(CASE WHEN gst_number IS NOT NULL AND gst_number != '' THEN 1 END) as customers_with_gst,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_this_week,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as new_this_month
        FROM customers
      `);

      return stats[0];
    } catch (error) {
      console.error("Error getting customer stats:", error);
      throw error;
    }
  }

  // Search customers for quotation
  static async searchForQuotation(searchTerm) {
    try {
      const query = `
        SELECT 
          id,
          company_name,
          contact_person,
          phone,
          email,
          gst_number
        FROM customers
        WHERE 
          company_name LIKE ? OR 
          contact_person LIKE ? OR 
          phone LIKE ? OR 
          email LIKE ?
        ORDER BY company_name ASC
        LIMIT 10
      `;

      const term = `%${searchTerm}%`;
      const customers = await executeQuery(query, [term, term, term, term]);
      return customers;
    } catch (error) {
      console.error("Error searching customers for quotation:", error);
      throw error;
    }
  }

  // Get or create customer (for quotations)
  static async getOrCreate(customerData) {
    try {
      console.log("🔧 Customer.getOrCreate called with:", customerData);

      // FIX: Clean and validate input data
      const cleanData = {
        company_name:
          customerData.company_name || customerData.customer_name || null,
        contact_person:
          customerData.contact_person || customerData.customer_name || null,
        email: customerData.email || null,
        phone: customerData.phone || customerData.customer_contact || null,
        address: customerData.address || null,
        site_location: customerData.site_location || null,
        gst_number: customerData.gst_number || null,
      };

      console.log("🔧 Cleaned customer data:", cleanData);

      // Validate required fields
      if (!cleanData.phone) {
        throw new Error("Customer phone number is required");
      }

      if (!cleanData.contact_person && !cleanData.company_name) {
        throw new Error("Either contact person or company name is required");
      }

      // Try to find existing customer by phone
      let existingCustomer = await this.findByContact(cleanData.phone);

      if (existingCustomer) {
        console.log("✅ Found existing customer:", existingCustomer.id);
        return {
          success: true,
          customer: existingCustomer,
          created: false,
        };
      }

      // Create new customer
      console.log("🔧 Creating new customer...");
      const createResult = await this.create(cleanData);

      if (createResult.success) {
        const newCustomer = await this.getById(createResult.id);
        console.log("✅ Created new customer:", createResult.id);
        return {
          success: true,
          customer: newCustomer,
          created: true,
        };
      } else {
        throw new Error(createResult.message || "Failed to create customer");
      }
    } catch (error) {
      console.error("❌ Error in getOrCreate customer:", error);
      throw error;
    }
  }

  // Validate customer data
  static validateCustomerData(data, isUpdate = false) {
    const errors = [];
    const { company_name, phone, email, gst_number } = data;

    // Required fields for creation
    if (!isUpdate) {
      if (!company_name || company_name.trim().length === 0) {
        errors.push("Company name is required");
      }

      if (!phone || phone.trim().length === 0) {
        errors.push("Phone number is required");
      }
    }

    // Validation for provided fields
    if (company_name !== undefined) {
      if (company_name.length > 100) {
        errors.push("Company name must be less than 100 characters");
      }
    }

    if (phone !== undefined) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10 || !cleanPhone.match(/^[6-9]/)) {
        errors.push("Phone must be a valid 10-digit Indian mobile number");
      }
    }

    if (email !== undefined && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push("Valid email address is required");
      }
    }

    if (
      gst_number !== undefined &&
      gst_number &&
      gst_number.trim().length > 0
    ) {
      const gstRegex =
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(gst_number.toUpperCase())) {
        errors.push("GST number format is invalid");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Bulk operations
  static async bulkUpdate(updateData) {
    try {
      const { customer_ids, updates } = updateData;

      if (
        !customer_ids ||
        !Array.isArray(customer_ids) ||
        customer_ids.length === 0
      ) {
        return {
          success: false,
          message: "Customer IDs are required",
        };
      }

      const allowedUpdates = ["gst_number", "address"];
      const updateFields = [];
      const params = [];

      // Build update fields
      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          updateFields.push(`${key} = ?`);
          params.push(value);
        }
      }

      if (updateFields.length === 0) {
        return {
          success: false,
          message: "No valid update fields provided",
        };
      }

      // Add updated_at
      updateFields.push("updated_at = NOW()");

      // Add customer IDs for WHERE clause
      const placeholders = customer_ids.map(() => "?").join(",");
      params.push(...customer_ids);

      const query = `
        UPDATE customers 
        SET ${updateFields.join(", ")}
        WHERE id IN (${placeholders})
      `;

      const result = await executeQuery(query, params);

      return {
        success: true,
        message: `${result.affectedRows} customers updated successfully`,
        updatedCount: result.affectedRows,
      };
    } catch (error) {
      console.error("Error bulk updating customers:", error);
      throw error;
    }
  }
}

module.exports = Customer;
