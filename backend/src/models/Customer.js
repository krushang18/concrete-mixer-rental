const { prisma } = require("../config/database");

class Customer {
  static async getAll(filters = {}) {
    try {
      const where = {};
      if (filters.search) {
        where.OR = [
          { companyName: { contains: filters.search, mode: "insensitive" } },
          { contactPerson: { contains: filters.search, mode: "insensitive" } },
          { phone: { contains: filters.search, mode: "insensitive" } },
          { email: { contains: filters.search, mode: "insensitive" } },
          { siteLocation: { contains: filters.search, mode: "insensitive" } },
          { address: { contains: filters.search, mode: "insensitive" } },
        ];
      }
      if (filters.city) where.address = { contains: filters.city, mode: "insensitive" };
      if (filters.has_gst === "true" || filters.has_gst === true) {
        where.gstNumber = { not: null };
      } else if (filters.has_gst === "false" || filters.has_gst === false) {
        where.gstNumber = null;
      }

      const limit = Math.min(Math.max(parseInt(filters.limit) || 10, 1), 100);
      const offset = Math.max(parseInt(filters.offset) || 0, 0);
      const sortBy = ["companyName", "contactPerson", "createdAt", "updatedAt"].includes(filters.sortBy) ? filters.sortBy : "createdAt";
      const sortOrder = filters.sortOrder?.toUpperCase() === "ASC" ? "asc" : "desc";

      const [total, customers] = await Promise.all([
        prisma.customer.count({ where }),
        prisma.customer.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
          include: { _count: { select: { quotations: true } } },
        }),
      ]);

      // Attach quotation stats
      const enriched = customers.map((c) => ({
        ...c,
        total_quotations: c._count.quotations,
        company_name: c.companyName,
        contact_person: c.contactPerson,
        site_location: c.siteLocation,
        gst_number: c.gstNumber,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      }));

      return { customers: enriched, total };
    } catch (error) {
      console.error("❌ Error getting all customers:", error);
      throw error;
    }
  }

  static async getById(id) {
    try {
      if (!id) return null;
      const c = await prisma.customer.findUnique({ where: { id: parseInt(id) } });
      if (!c) return null;
      return { ...c, company_name: c.companyName, contact_person: c.contactPerson, site_location: c.siteLocation, gst_number: c.gstNumber, created_at: c.createdAt, updated_at: c.updatedAt };
    } catch (error) {
      console.error("❌ Error getting customer by ID:", error);
      throw error;
    }
  }

  static async findByContact(contact) {
    try {
      if (!contact) return null;
      const c = await prisma.customer.findFirst({ where: { phone: contact } });
      if (!c) return null;
      return { ...c, company_name: c.companyName, contact_person: c.contactPerson, site_location: c.siteLocation, gst_number: c.gstNumber };
    } catch (error) {
      console.error("❌ Error finding customer by contact:", error);
      throw error;
    }
  }

  static async create(customerData) {
    try {
      const cleanData = {
        company_name: customerData.company_name || null,
        contact_person: customerData.contact_person || null,
        email: customerData.email || null,
        phone: customerData.phone || null,
        address: customerData.address || null,
        site_location: customerData.site_location || null,
        gst_number: customerData.gst_number || null,
      };

      if (!cleanData.phone) return { success: false, message: "Phone number is required" };
      if (!cleanData.company_name) return { success: false, message: "Company name is required" };

      const created = await prisma.customer.create({
        data: {
          companyName: cleanData.company_name,
          contactPerson: cleanData.contact_person,
          email: cleanData.email,
          phone: cleanData.phone,
          address: cleanData.address,
          siteLocation: cleanData.site_location,
          gstNumber: cleanData.gst_number,
        },
      });
      return { success: true, id: created.id, message: "Customer created successfully" };
    } catch (error) {
      console.error("❌ Error creating customer:", error);
      if (error.code === "P2002") return { success: false, message: "Customer with this phone number already exists" };
      throw error;
    }
  }

  static async update(id, customerData) {
    try {
      const validation = this.validateCustomerData(customerData, true);
      if (!validation.isValid) return { success: false, message: "Validation failed", errors: validation.errors };

      const existingCustomer = await this.getById(id);
      if (!existingCustomer) return { success: false, message: "Customer not found" };

      const { company_name, contact_person, email, phone, address, site_location, gst_number } = customerData;

      await prisma.customer.update({
        where: { id: parseInt(id) },
        data: {
          companyName: company_name || existingCustomer.company_name,
          contactPerson: contact_person !== undefined ? contact_person : existingCustomer.contact_person,
          email: email !== undefined ? email : existingCustomer.email,
          phone: phone || existingCustomer.phone,
          address: address !== undefined ? address : existingCustomer.address,
          siteLocation: site_location !== undefined ? site_location : existingCustomer.site_location,
          gstNumber: gst_number !== undefined ? gst_number : existingCustomer.gst_number,
        },
      });
      return { success: true, message: "Customer updated successfully" };
    } catch (error) {
      console.error("Error updating customer:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const existingCustomer = await this.getById(id);
      if (!existingCustomer) return { success: false, message: "Customer not found" };

      const quotationCount = await prisma.quotation.count({ where: { customerId: parseInt(id) } });
      if (quotationCount > 0) return { success: false, message: "Cannot delete customer with existing quotations", quotationCount };

      await prisma.customer.delete({ where: { id: parseInt(id) } });
      return { success: true, message: "Customer deleted successfully" };
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }
  }

  static async getQuotationHistory(id) {
    try {
      const quotations = await prisma.quotation.findMany({
        where: { customerId: parseInt(id) },
        include: { items: { include: { quotationMachine: true } } },
        orderBy: { createdAt: "desc" },
      });

      return quotations.map((q) => {
        const machineItems = q.items.filter((i) => i.itemType === "machine");
        const chargeItems = q.items.filter((i) => i.itemType === "additional_charge");
        return {
          id: q.id,
          quotation_number: q.quotationNumber,
          created_at: q.createdAt,
          subtotal: q.subtotal,
          total_gst_amount: q.totalGstAmount,
          grand_total: q.grandTotal,
          quotation_status: q.quotationStatus,
          delivery_status: q.deliveryStatus,
          additional_notes: q.additionalNotes,
          total_items: q.items.length,
          machines: machineItems.map((i) => `${i.quotationMachine?.name} (${i.durationType}) - ₹${parseFloat(i.unitPrice) * parseFloat(i.quantity)}`).join(", "),
          additional_charges: chargeItems.map((i) => i.description).filter(Boolean).join(", "),
        };
      });
    } catch (error) {
      console.error("Error getting customer quotation history:", error);
      throw error;
    }
  }

  static async searchForQuotation(searchTerm) {
    try {
      const customers = await prisma.customer.findMany({
        where: {
          OR: [
            { companyName: { contains: searchTerm, mode: "insensitive" } },
            { contactPerson: { contains: searchTerm, mode: "insensitive" } },
            { phone: { contains: searchTerm, mode: "insensitive" } },
            { email: { contains: searchTerm, mode: "insensitive" } },
          ],
        },
        orderBy: { companyName: "asc" },
        take: 10,
      });
      return customers.map((c) => ({ id: c.id, company_name: c.companyName, contact_person: c.contactPerson, phone: c.phone, email: c.email, gst_number: c.gstNumber }));
    } catch (error) {
      console.error("Error searching customers for quotation:", error);
      throw error;
    }
  }

  static async getOrCreate(customerData) {
    try {
      const cleanData = {
        company_name: customerData.company_name || customerData.customer_name || null,
        contact_person: customerData.contact_person || customerData.customer_name || null,
        email: customerData.email || null,
        phone: customerData.phone || customerData.customer_contact || null,
        address: customerData.address || null,
        site_location: customerData.site_location || null,
        gst_number: customerData.gst_number || null,
      };

      if (!cleanData.phone) throw new Error("Customer phone number is required");
      if (!cleanData.company_name) throw new Error("Company name is required");

      const existingCustomer = await this.findByContact(cleanData.phone);
      if (existingCustomer) return { success: true, customer: existingCustomer, created: false };

      const createResult = await this.create(cleanData);
      if (createResult.success) {
        const newCustomer = await this.getById(createResult.id);
        return { success: true, customer: newCustomer, created: true };
      }
      throw new Error(createResult.message || "Failed to create customer");
    } catch (error) {
      console.error("❌ Error in getOrCreate customer:", error);
      throw error;
    }
  }

  static validateCustomerData(data, isUpdate = false) {
    const errors = [];
    const { company_name, phone, email, gst_number } = data;
    if (!isUpdate) {
      if (!company_name || company_name.trim().length === 0) errors.push("Company name is required");
      if (!phone || phone.trim().length === 0) errors.push("Phone number is required");
    }
    if (company_name !== undefined && company_name.length > 100) errors.push("Company name must be less than 100 characters");
    if (phone !== undefined) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length !== 10 || !cleanPhone.match(/^[6-9]/)) errors.push("Phone must be a valid 10-digit Indian mobile number");
    }
    if (email !== undefined && email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("Valid email address is required");
    if (gst_number?.trim().length > 0 && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst_number.toUpperCase())) errors.push("GST number format is invalid");
    return { isValid: errors.length === 0, errors };
  }
}

module.exports = Customer;
