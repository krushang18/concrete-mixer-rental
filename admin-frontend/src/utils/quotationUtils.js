export const quotationUtils = {
  // Format quotation number for display
  formatQuotationNumber: (number) => {
    return number ? number.toUpperCase() : "";
  },

  // Calculate item totals
  calculateItemTotal: (quantity, unitPrice, gstPercentage = 0) => {
    const subtotal = parseFloat(quantity || 0) * parseFloat(unitPrice || 0);
    const gstAmount = (subtotal * parseFloat(gstPercentage || 0)) / 100;
    return {
      subtotal: subtotal.toFixed(2),
      gstAmount: gstAmount.toFixed(2),
      total: (subtotal + gstAmount).toFixed(2),
    };
  },

  // Validate quotation data before submission
  validateQuotationData: (data) => {
    const errors = [];

    if (!data.customer_name?.trim()) {
      errors.push("Customer name is required");
    }

    if (!data.customer_contact?.trim()) {
      errors.push("Customer contact is required");
    }

    if (!data.items || data.items.length === 0) {
      errors.push("At least one item is required");
    }

    data.items?.forEach((item, index) => {
      if (!item.description?.trim()) {
        errors.push(`Item ${index + 1}: Description is required`);
      }

      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        errors.push(`Item ${index + 1}: Valid quantity is required`);
      }

      if (!item.unit_price || parseFloat(item.unit_price) < 0) {
        errors.push(`Item ${index + 1}: Valid unit price is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  // Get status color for badges
  getStatusColor: (status, type = "quotation") => {
    const configs = {
      quotation: {
        draft: "gray",
        sent: "blue",
        accepted: "green",
        rejected: "red",
        expired: "orange",
      },
      delivery: {
        pending: "yellow",
        delivered: "blue",
        completed: "green",
        cancelled: "red",
      },
    };

    return configs[type]?.[status] || "gray";
  },

  // Format currency for Indian locale
  formatCurrency: (amount, options = {}) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options,
    }).format(amount || 0);
  },

  // Generate quotation summary text
  generateSummary: (quotation) => {
    const itemCount = quotation.items?.length || 0;
    const machineItems =
      quotation.items?.filter((item) => item.item_type === "machine") || [];
    const machineNames = machineItems
      .map((item) => item.description)
      .join(", ");

    return {
      itemCount,
      machineCount: machineItems.length,
      machineNames: machineNames || "No machines",
      totalAmount: quotationUtils.formatCurrency(quotation.grand_total),
    };
  },
};
