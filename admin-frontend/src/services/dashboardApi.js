// src/services/dashboardApi.js
import apiClient from "./api";

export class DashboardApiError extends Error {
  constructor(message, errors = [], status = null) {
    super(message);
    this.name = "DashboardApiError";
    this.errors = errors;
    this.status = status;
  }
}

/**
 * Minimal Dashboard API Service
 * Single API call approach - only fetches required data
 */
export const dashboardApi = {
  // MAIN ENDPOINT - Single call gets all required data
  getDashboardOverview: async (period = "30d") => {
    try {
      const params = { period };
      const { data } = await apiClient.get("/admin/dashboard/overview", {
        params,
      });
      return {
        success: true,
        data: data.data || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch dashboard overview";
      console.error("Dashboard overview error:", errorMsg);
      throw new DashboardApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // REMOVED METHODS - No longer needed:
  // getStats() - Use getDashboardOverview instead
  // getChartData() - No charts required
  // getPerformanceMetrics() - Data included in overview
  // getAlerts() - Data included in overview
  // getBusinessSummary() - Data included in overview
};

// Minimal utilities - only what's needed for display
export const dashboardUtils = {
  // Format currency for Indian market
  formatCurrency: (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  },

  // Format percentage
  formatPercentage: (value, decimals = 1) => {
    if (value === null || value === undefined || isNaN(value)) return "0%";
    return `${parseFloat(value).toFixed(decimals)}%`;
  },

  // Format large numbers with Indian system
  formatLargeNumber: (num) => {
    if (num === null || num === undefined || isNaN(num)) return "0";

    const absNum = Math.abs(num);
    if (absNum >= 10000000) {
      // 1 Crore
      return (num / 10000000).toFixed(1) + "Cr";
    } else if (absNum >= 100000) {
      // 1 Lakh
      return (num / 100000).toFixed(1) + "L";
    } else if (absNum >= 1000) {
      // 1 Thousand
      return (num / 1000).toFixed(1) + "K";
    } else {
      return num.toString();
    }
  },

  // Mobile-friendly date formatting
  formatMobileDate: (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  },

  // Get default data structure for loading states
  getDefaultDashboardData: () => ({
    overview: {
      totalQueries: 0,
      totalMachines: 0,
      totalCustomers: 0,
      totalQuotations: 0,
    },
    cards: {
      queries: { total: 0, today: 0 },
      machines: { total: 0, active: 0 },
      quotations: { total: 0, pending: 0 },
      customers: { total: 0, newPeriod: 0 },
    },
    performance: {
      queryResolutionRate: {
        label: "Query Resolution Rate",
        value: 0,
        description: "0% of queries completed",
      },
      newQueriesThisWeek: {
        label: "New Queries This Week",
        value: 0,
        description: "Weekly inquiry volume",
      },
    },
    insights: {
      customerGrowth: {
        title: "Customer Growth",
        value: 0,
        description: "No new customers",
        trend: "neutral",
      },
      quotationsThisMonth: {
        title: "Quotations Generated This Month",
        value: 0,
        description: "No quotations this month",
        trend: "neutral",
      },
    },
    conversionStats: {
      quotationToDelivery: {
        label: "Quotation → Delivery Rate",
        value: 0,
        description: "0% conversion rate",
        accepted: 0,
        delivered: 0,
        total: 0,
      },
    },
    recentActivity: [],
    alerts: [],
    lastUpdated: new Date().toISOString(),
  }),

  // Handle API errors gracefully
  handleApiError: (error, fallbackData = null) => {
    console.error("Dashboard API Error:", error);

    if (fallbackData) {
      return fallbackData;
    }

    return dashboardUtils.getDefaultDashboardData();
  },
};
