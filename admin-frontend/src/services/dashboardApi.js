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
 * Dashboard API Service
 * Handles all dashboard-related API operations and business analytics
 */
export const dashboardApi = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      const { data } = await apiClient.get("/admin/dashboard/stats");
      return {
        success: true,
        data: data.data || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch dashboard statistics";
      console.error("Dashboard stats error:", errorMsg);
      throw new DashboardApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get chart data for dashboard visualizations
  getChartData: async (chartType = "all", period = "30d") => {
    try {
      const params = { chart_type: chartType, period };
      const { data } = await apiClient.get("/admin/dashboard/charts", {
        params,
      });
      return {
        success: true,
        data: data.data || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch chart data";
      throw new DashboardApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get performance metrics
  getPerformanceMetrics: async (period = "30d") => {
    try {
      const params = { period };
      const { data } = await apiClient.get("/admin/dashboard/performance", {
        params,
      });
      return {
        success: true,
        data: data.data || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch performance metrics";
      throw new DashboardApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get dashboard alerts
  getAlerts: async () => {
    try {
      const { data } = await apiClient.get("/admin/dashboard/alerts");
      return {
        success: true,
        data: data.data || [],
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch dashboard alerts";
      throw new DashboardApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },

  // Get business summary
  getBusinessSummary: async (period = "30d") => {
    try {
      const params = { period };
      const { data } = await apiClient.get("/admin/dashboard/summary", {
        params,
      });
      return {
        success: true,
        data: data.data || {},
        message: data.message,
      };
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Failed to fetch business summary";
      throw new DashboardApiError(
        errorMsg,
        error.response?.data?.errors,
        error.response?.status
      );
    }
  },
};

// Dashboard utilities
export const dashboardUtils = {
  // Format currency for dashboard display
  formatCurrency: (amount) => {
    if (amount === null || amount === undefined) return "₹0";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  },

  // Format percentage
  formatPercentage: (value, decimals = 1) => {
    if (value === null || value === undefined) return "0%";
    return `${parseFloat(value).toFixed(decimals)}%`;
  },

  // Format large numbers with K, M, B suffixes
  formatLargeNumber: (num) => {
    if (num === null || num === undefined) return "0";

    const absNum = Math.abs(num);
    if (absNum >= 1000000000) {
      return (num / 1000000000).toFixed(1) + "B";
    } else if (absNum >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (absNum >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    } else {
      return num.toString();
    }
  },

  // Calculate growth percentage
  calculateGrowth: (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  },

  // Get growth indicator
  getGrowthIndicator: (growthPercentage) => {
    if (growthPercentage > 0) {
      return { type: "positive", icon: "↗", color: "text-green-600" };
    } else if (growthPercentage < 0) {
      return { type: "negative", icon: "↘", color: "text-red-600" };
    } else {
      return { type: "neutral", icon: "→", color: "text-gray-600" };
    }
  },

  // Format date range for display
  formatDateRange: (period) => {
    const today = new Date();
    let startDate,
      endDate = today;

    switch (period) {
      case "7d":
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "12m":
        startDate = new Date(
          today.getFullYear() - 1,
          today.getMonth(),
          today.getDate()
        );
        break;
      default:
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      label: `${startDate.toLocaleDateString("en-IN")} - ${endDate.toLocaleDateString("en-IN")}`,
    };
  },

  // Generate chart colors
  getChartColors: (count = 1) => {
    const baseColors = [
      "#0081C9", // Primary blue
      "#FFC93C", // Secondary yellow
      "#FF6B6B", // Red
      "#4ECDC4", // Teal
      "#45B7D1", // Light blue
      "#96CEB4", // Light green
      "#FECA57", // Orange
      "#FF9FF3", // Pink
      "#54A0FF", // Blue
      "#5F27CD", // Purple
    ];

    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }

    // Generate additional colors if needed
    const colors = [...baseColors];
    while (colors.length < count) {
      colors.push(`hsl(${(colors.length * 137.5) % 360}, 70%, 60%)`);
    }

    return colors;
  },

  // Process chart data for different chart types
  processChartData: (rawData, chartType) => {
    switch (chartType) {
      case "line":
        return {
          labels: rawData.map((item) => item.label || item.date),
          datasets: [
            {
              label: "Value",
              data: rawData.map((item) => item.value),
              borderColor: "#0081C9",
              backgroundColor: "rgba(0, 129, 201, 0.1)",
              tension: 0.4,
            },
          ],
        };

      case "bar":
        return {
          labels: rawData.map((item) => item.label),
          datasets: [
            {
              label: "Count",
              data: rawData.map((item) => item.count),
              backgroundColor: dashboardUtils.getChartColors(rawData.length),
            },
          ],
        };

      case "pie":
      case "doughnut":
        return {
          labels: rawData.map((item) => item.label),
          datasets: [
            {
              data: rawData.map((item) => item.value),
              backgroundColor: dashboardUtils.getChartColors(rawData.length),
            },
          ],
        };

      default:
        return rawData;
    }
  },

  // Calculate dashboard KPIs
  calculateKPIs: (data) => {
    const kpis = {};

    // Revenue KPIs
    if (data.quotations) {
      const totalRevenue = data.quotations
        .filter((q) => q.quotation_status === "accepted")
        .reduce((sum, q) => sum + (q.grand_total || 0), 0);

      kpis.totalRevenue = totalRevenue;
      kpis.averageQuotationValue =
        data.quotations.length > 0 ? totalRevenue / data.quotations.length : 0;
      kpis.quotationConversionRate =
        data.quotations.length > 0
          ? (data.quotations.filter((q) => q.quotation_status === "accepted")
              .length /
              data.quotations.length) *
            100
          : 0;
    }

    // Customer KPIs
    if (data.customers) {
      kpis.totalCustomers = data.customers.length;
      kpis.newCustomersThisMonth = data.customers.filter((c) => {
        const createdDate = new Date(c.created_at);
        const thisMonth = new Date();
        thisMonth.setDate(1);
        return createdDate >= thisMonth;
      }).length;
    }

    // Machine KPIs
    if (data.machines) {
      kpis.totalMachines = data.machines.length;
      kpis.activeMachines = data.machines.filter((m) => m.is_active).length;
      kpis.machineUtilization =
        data.machines.length > 0
          ? (kpis.activeMachines / kpis.totalMachines) * 100
          : 0;
    }

    // Query KPIs
    if (data.queries) {
      kpis.totalQueries = data.queries.length;
      kpis.pendingQueries = data.queries.filter(
        (q) => q.status === "new" || q.status === "in_progress"
      ).length;
      kpis.queryResolutionRate =
        data.queries.length > 0
          ? (data.queries.filter((q) => q.status === "completed").length /
              data.queries.length) *
            100
          : 0;
    }

    return kpis;
  },

  // Generate dashboard alerts
  generateAlerts: (data) => {
    const alerts = [];

    // Document expiry alerts
    if (data.documents) {
      const expiringDocuments = data.documents.filter((doc) => {
        const expiryDate = new Date(doc.expiry_date);
        const today = new Date();
        const diffDays = Math.ceil(
          (expiryDate - today) / (1000 * 60 * 60 * 24)
        );
        return diffDays <= 30 && diffDays >= 0;
      });

      if (expiringDocuments.length > 0) {
        alerts.push({
          id: "documents_expiring",
          type: "warning",
          title: "Documents Expiring Soon",
          message: `${expiringDocuments.length} document(s) will expire within 30 days`,
          count: expiringDocuments.length,
          action: "View Documents",
          priority: "high",
        });
      }
    }

    // Overdue service alerts
    if (data.serviceRecords) {
      const machinesNeedingService =
        data.machines?.filter((machine) => {
          const lastService = data.serviceRecords
            .filter((sr) => sr.machine_id === machine.id)
            .sort(
              (a, b) => new Date(b.service_date) - new Date(a.service_date)
            )[0];

          if (!lastService) return true;

          const daysSinceService = Math.ceil(
            (new Date() - new Date(lastService.service_date)) /
              (1000 * 60 * 60 * 24)
          );
          return daysSinceService > 30; // Assuming 30-day service interval
        }) || [];

      if (machinesNeedingService.length > 0) {
        alerts.push({
          id: "service_overdue",
          type: "error",
          title: "Service Overdue",
          message: `${machinesNeedingService.length} machine(s) need service`,
          count: machinesNeedingService.length,
          action: "Schedule Service",
          priority: "high",
        });
      }
    }

    // Pending queries alert
    if (data.queries) {
      const pendingQueries = data.queries.filter(
        (q) => q.status === "new"
      ).length;
      if (pendingQueries > 5) {
        alerts.push({
          id: "pending_queries",
          type: "info",
          title: "Pending Queries",
          message: `${pendingQueries} new queries require attention`,
          count: pendingQueries,
          action: "View Queries",
          priority: "medium",
        });
      }
    }

    // Low machine availability
    if (data.machines) {
      const activeMachines = data.machines.filter((m) => m.is_active).length;
      const availabilityPercentage =
        (activeMachines / data.machines.length) * 100;

      if (availabilityPercentage < 70) {
        alerts.push({
          id: "low_availability",
          type: "warning",
          title: "Low Machine Availability",
          message: `Only ${availabilityPercentage.toFixed(1)}% of machines are active`,
          count: activeMachines,
          action: "Check Machines",
          priority: "medium",
        });
      }
    }

    return alerts.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  },

  // Calculate trends
  calculateTrends: (currentPeriodData, previousPeriodData) => {
    const trends = {};

    // Revenue trend
    const currentRevenue = currentPeriodData.totalRevenue || 0;
    const previousRevenue = previousPeriodData.totalRevenue || 0;
    trends.revenue = {
      current: currentRevenue,
      previous: previousRevenue,
      growth: dashboardUtils.calculateGrowth(currentRevenue, previousRevenue),
      indicator: dashboardUtils.getGrowthIndicator(
        dashboardUtils.calculateGrowth(currentRevenue, previousRevenue)
      ),
    };

    // Customer trend
    const currentCustomers = currentPeriodData.newCustomers || 0;
    const previousCustomers = previousPeriodData.newCustomers || 0;
    trends.customers = {
      current: currentCustomers,
      previous: previousCustomers,
      growth: dashboardUtils.calculateGrowth(
        currentCustomers,
        previousCustomers
      ),
      indicator: dashboardUtils.getGrowthIndicator(
        dashboardUtils.calculateGrowth(currentCustomers, previousCustomers)
      ),
    };

    // Quotation trend
    const currentQuotations = currentPeriodData.quotationCount || 0;
    const previousQuotations = previousPeriodData.quotationCount || 0;
    trends.quotations = {
      current: currentQuotations,
      previous: previousQuotations,
      growth: dashboardUtils.calculateGrowth(
        currentQuotations,
        previousQuotations
      ),
      indicator: dashboardUtils.getGrowthIndicator(
        dashboardUtils.calculateGrowth(currentQuotations, previousQuotations)
      ),
    };

    return trends;
  },

  // Format dashboard data for widgets
  formatWidgetData: (data, widgetType) => {
    switch (widgetType) {
      case "stat_card":
        return {
          title: data.title,
          value: dashboardUtils.formatLargeNumber(data.value),
          change: data.change
            ? dashboardUtils.formatPercentage(data.change)
            : null,
          trend: data.change
            ? dashboardUtils.getGrowthIndicator(data.change)
            : null,
          icon: data.icon,
          color: data.color || "blue",
        };

      case "progress_card":
        return {
          title: data.title,
          current: data.current,
          total: data.total,
          percentage: data.total > 0 ? (data.current / data.total) * 100 : 0,
          color: data.color || "blue",
        };

      case "chart_widget":
        return {
          title: data.title,
          chartData: dashboardUtils.processChartData(
            data.chartData,
            data.chartType
          ),
          chartType: data.chartType,
          options: data.options || {},
        };

      default:
        return data;
    }
  },
};
