const { prisma } = require("../config/database");

class Quotation {
  static async getAllWithPagination(filters = {}) {
    try {
      const where = {};
      if (filters.status) where.quotationStatus = filters.status;
      if (filters.delivery_status) where.deliveryStatus = filters.delivery_status;
      if (filters.start_date) where.createdAt = { ...where.createdAt, gte: new Date(filters.start_date) };
      if (filters.end_date) { const end = new Date(filters.end_date); end.setHours(23, 59, 59, 999); where.createdAt = { ...where.createdAt, lte: end }; }
      if (filters.machine_id) where.items = { some: { quotationMachineId: parseInt(filters.machine_id) } };

      const searchTerm = filters.search || filters.customer_name;
      if (searchTerm) {
        where.OR = [
          { customerName: { contains: searchTerm, mode: "insensitive" } },
          { companyName: { contains: searchTerm, mode: "insensitive" } },
          { customerContact: { contains: searchTerm, mode: "insensitive" } },
          { quotationNumber: { contains: searchTerm, mode: "insensitive" } },
        ];
      }

      const sortFieldMap = { created_at: "createdAt", updated_at: "updatedAt", customer_name: "customerName", company_name: "companyName", grand_total: "grandTotal", quotation_status: "quotationStatus", delivery_status: "deliveryStatus" };
      const sortBy = sortFieldMap[filters.sort_by] || "createdAt";
      const sortOrder = (filters.sort_order || "DESC").toLowerCase();
      const limit = Math.min(parseInt(filters.limit) || 20, 100);
      const offset = parseInt(filters.offset) || 0;

      const [total, quotations] = await Promise.all([
        prisma.quotation.count({ where }),
        prisma.quotation.findMany({
          where,
          orderBy: { [sortBy]: sortOrder },
          take: limit,
          skip: offset,
          include: {
            createdByUser: { select: { username: true } },
            items: { include: { quotationMachine: { select: { name: true } } } },
          },
        }),
      ]);

      const now = new Date();
      const mapped = quotations.map((q) => {
        const machineItems = q.items.filter((i) => i.itemType === "machine");
        const machineTotal = machineItems.reduce((s, i) => s + parseFloat(i.unitPrice) * parseFloat(i.quantity), 0);
        const daysAgo = Math.floor((now - q.createdAt) / 86400000);
        return {
          id: q.id,
          quotation_number: q.quotationNumber,
          customer_name: q.customerName,
          customer_contact: q.customerContact,
          company_name: q.companyName,
          customer_gst_number: q.customerGstNumber,
          customer_id: q.customerId,
          subtotal: q.subtotal,
          total_gst_amount: q.totalGstAmount,
          grand_total: q.grandTotal,
          quotation_status: q.quotationStatus,
          delivery_status: q.deliveryStatus,
          additional_notes: q.additionalNotes,
          created_at: q.createdAt,
          updated_at: q.updatedAt,
          created_by_user: q.createdByUser?.username,
          days_ago: daysAgo,
          total_items: q.items.length,
          machines: machineItems.map((i) => i.quotationMachine?.name).filter(Boolean).join(", "),
          machine_total: machineTotal,
        };
      });

      return { quotations: mapped, total };
    } catch (error) {
      console.error("❌ Error getting quotations with pagination:", error);
      throw error;
    }
  }

  static async getAll(filters = {}) {
    const result = await this.getAllWithPagination(filters);
    return result.quotations;
  }

  static async getById(id) {
    try {
      const q = await prisma.quotation.findUnique({
        where: { id: parseInt(id) },
        include: {
          createdByUser: { select: { username: true } },
          items: { include: { quotationMachine: { select: { name: true, description: true } } }, orderBy: { sortOrder: "asc" } },
        },
      });
      if (!q) return null;

      return {
        ...q,
        quotation_number: q.quotationNumber,
        customer_name: q.customerName,
        customer_contact: q.customerContact,
        company_name: q.companyName,
        customer_gst_number: q.customerGstNumber,
        customer_id: q.customerId,
        total_gst_amount: q.totalGstAmount,
        grand_total: q.grandTotal,
        terms_text: q.termsText,
        additional_notes: q.additionalNotes,
        quotation_status: q.quotationStatus,
        delivery_status: q.deliveryStatus,
        created_at: q.createdAt,
        updated_at: q.updatedAt,
        created_by_user: q.createdByUser?.username,
        items: q.items.map((i) => ({
          ...i,
          quotation_id: i.quotationId,
          item_type: i.itemType,
          quotation_machine_id: i.quotationMachineId,
          duration_type: i.durationType,
          unit_price: i.unitPrice,
          gst_percentage: i.gstPercentage,
          gst_amount: i.gstAmount,
          total_amount: i.totalAmount,
          sort_order: i.sortOrder,
          created_at: i.createdAt,
          machine_name: i.quotationMachine?.name,
          machine_description: i.quotationMachine?.description,
        })),
      };
    } catch (error) {
      console.error("Error getting quotation by ID:", error);
      throw error;
    }
  }

  static async create(quotationData, userId) {
    try {
      const { customer_name, customer_contact, company_name, customer_gst_number, customer_id, items, terms_text, additional_notes } = quotationData;

      const validation = this.validateQuotationData(quotationData);
      if (!validation.isValid) return { success: false, message: "Validation failed", errors: validation.errors };

      const quotationNumber = await this.getNextQuotationNumber();
      const totals = this.calculateTotals(items);

      const quotation = await prisma.$transaction(async (tx) => {
        const q = await tx.quotation.create({
          data: {
            quotationNumber,
            customerName: customer_name,
            customerContact: customer_contact,
            companyName: company_name || null,
            customerGstNumber: customer_gst_number || null,
            customerId: customer_id || null,
            subtotal: totals.subtotal,
            totalGstAmount: totals.totalGst,
            grandTotal: totals.grandTotal,
            termsText: terms_text || null,
            additionalNotes: additional_notes || null,
            quotationStatus: "draft",
            deliveryStatus: "pending",
            createdBy: userId,
          },
        });

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const machineId = item.quotation_machine_id || item.machine_id;
          const qty = parseFloat(item.quantity) || 0;
          const price = parseFloat(item.unit_price) || 0;
          const gstPercent = parseFloat(item.gst_percentage) || 0;
          const itemSubtotal = qty * price;
          const gstAmount = (itemSubtotal * gstPercent) / 100;

          await tx.quotationItem.create({
            data: {
              quotationId: q.id,
              itemType: item.item_type || "machine",
              quotationMachineId: item.item_type === "machine" ? (machineId ? parseInt(machineId) : null) : null,
              description: item.description || "",
              durationType: item.duration_type || null,
              quantity: qty,
              unitPrice: price,
              gstPercentage: gstPercent,
              gstAmount,
              totalAmount: itemSubtotal + gstAmount,
              sortOrder: i + 1,
            },
          });
        }

        return q;
      });

      return { success: true, id: quotation.id, quotation_number: quotationNumber, message: "Quotation created successfully" };
    } catch (error) {
      console.error("Error creating quotation:", error);
      throw error;
    }
  }

  static async update(id, updateData, userId) {
    try {
      const existingQuotation = await this.getById(id);
      if (!existingQuotation) return { success: false, message: "Quotation not found" };

      const fieldMap = { customer_name: "customerName", customer_contact: "customerContact", company_name: "companyName", customer_gst_number: "customerGstNumber", customer_id: "customerId", additional_notes: "additionalNotes", quotation_status: "quotationStatus", delivery_status: "deliveryStatus", terms_text: "termsText" };
      const data = {};
      for (const [src, dst] of Object.entries(fieldMap)) {
        if (updateData[src] !== undefined) data[dst] = updateData[src];
      }

      if (Object.keys(data).length > 0) {
        await prisma.quotation.update({ where: { id: parseInt(id) }, data });
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
      await prisma.quotationItem.deleteMany({ where: { quotationId: parseInt(quotationId) } });

      let subtotal = 0;
      let totalGstAmount = 0;

      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i];
        const machineId = item.quotation_machine_id || item.machine_id;
        const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unit_price);
        const gstAmount = (itemSubtotal * parseFloat(item.gst_percentage)) / 100;
        subtotal += itemSubtotal;
        totalGstAmount += gstAmount;

        await prisma.quotationItem.create({
          data: {
            quotationId: parseInt(quotationId),
            itemType: item.item_type,
            quotationMachineId: item.item_type === "machine" ? (machineId ? parseInt(machineId) : null) : null,
            description: item.description,
            durationType: item.duration_type || null,
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unit_price),
            gstPercentage: parseFloat(item.gst_percentage),
            gstAmount,
            totalAmount: itemSubtotal + gstAmount,
            sortOrder: i + 1,
          },
        });
      }

      await prisma.quotation.update({
        where: { id: parseInt(quotationId) },
        data: { subtotal, totalGstAmount, grandTotal: subtotal + totalGstAmount },
      });
    } catch (error) {
      console.error("Error updating quotation items:", error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const result = await prisma.quotation.deleteMany({ where: { id: parseInt(id) } });
      if (result.count > 0) return { success: true, message: "Quotation deleted successfully" };
      return { success: false, message: "Quotation not found" };
    } catch (error) {
      console.error("Error deleting quotation:", error);
      throw error;
    }
  }

  static async updateStatus(id, status) {
    await prisma.quotation.update({ where: { id: parseInt(id) }, data: { quotationStatus: status } });
    return { success: true, message: "Status updated" };
  }

  static async getNextQuotationNumber() {
    try {
      const currentYear = new Date().getFullYear();
      const yearSuffix = currentYear.toString().slice(-2);

      return await prisma.$transaction(async (tx) => {
        // Lock row and get current counter
        const rows = await tx.$queryRaw`SELECT current_number FROM quotation_counter WHERE id = 1 FOR UPDATE`;
        let row = rows[0];

        if (!row || row.current_number === 0) {
          // Sync with existing quotations
          const maxRows = await tx.$queryRaw`SELECT MAX(CAST(SUBSTRING(quotation_number, 4, 4) AS INTEGER)) as max_num FROM quotations WHERE quotation_number LIKE ${"QCM%" + yearSuffix}`;
          const lastMax = parseInt(maxRows[0]?.max_num) || 0;

          if (!row) {
            await tx.quotationCounter.create({ data: { id: 1, currentNumber: lastMax } });
          } else {
            await tx.quotationCounter.update({ where: { id: 1 }, data: { currentNumber: lastMax } });
          }
        }

        const updated = await tx.quotationCounter.update({ where: { id: 1 }, data: { currentNumber: { increment: 1 } } });
        const formattedNumber = String(updated.currentNumber).padStart(4, "0");
        return `QCM${formattedNumber}${yearSuffix}`;
      });
    } catch (e) {
      console.error("Error generating quotation number:", e);
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
    return { subtotal: parseFloat(subtotal.toFixed(2)), totalGst: parseFloat(totalGst.toFixed(2)), grandTotal: parseFloat((subtotal + totalGst).toFixed(2)) };
  }

  static validateQuotationData(quotationData, isUpdate = false) {
    const errors = [];
    if (!isUpdate || quotationData.customer_name) {
      if (!quotationData.customer_name || quotationData.customer_name.trim().length < 2) errors.push("Customer name required");
    }
    if (!isUpdate || quotationData.customer_contact) {
      if (!quotationData.customer_contact || !/^\d{10}$/.test(quotationData.customer_contact)) errors.push("Valid 10-digit contact required");
    }
    if (!isUpdate && (!quotationData.items || quotationData.items.length === 0)) errors.push("Items required");
    return { isValid: errors.length === 0, errors };
  }

  static async getCustomerHistory(customerId) {
    const quotations = await prisma.quotation.findMany({
      where: { customerId: parseInt(customerId) },
      select: { id: true, quotationNumber: true, grandTotal: true, quotationStatus: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return quotations.map((q) => ({ id: q.id, quotation_number: q.quotationNumber, grand_total: q.grandTotal, quotation_status: q.quotationStatus, created_at: q.createdAt }));
  }

  static async getPricingHistory(name, contact) {
    const quotations = await prisma.quotation.findMany({
      where: { OR: [{ customerName: name }, { customerContact: contact }] },
      include: { items: { select: { description: true, quantity: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    return quotations.map((q) => ({
      id: q.id,
      quotation_number: q.quotationNumber,
      grand_total: q.grandTotal,
      quotation_status: q.quotationStatus,
      created_at: q.createdAt,
      pricing_details: q.items.map((i) => `${i.description} (${i.quantity})`).join(", "),
    }));
  }
}

module.exports = Quotation;
