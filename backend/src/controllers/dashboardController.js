const { executeQuery } = require("../config/database");

class DashboardController {
  // Get comprehensive dashboard statistics
  static async getStats(req, res) {
    try {
      // Get statistics from all major modules
      const [
        queryStats,
        machineStats,
        customerStats,
        quotationStats,
        documentStats,
        serviceStats,
        recentActivity,
      ] = await Promise.all([
        DashboardController.getQueryStats(),
        DashboardController.getMachineStats(),
        DashboardController.getCustomerStats(),
        DashboardController.getQuotationStats(),
        DashboardController.getDocumentStats(),
        DashboardController.getServiceStats(),
        DashboardController.getRecentActivity(),
      ]);

      res.json({
        success: true,
        message: "Dashboard statistics retrieved successfully",
        data: {
          overview: {
            totalQueries: queryStats.total || 0,
            totalMachines: machineStats.total || 0,
            totalCustomers: customerStats.total || 0,
            totalQuotations: quotationStats.total || 0,
          },
          queries: queryStats,
          machines: machineStats,
          customers: customerStats,
          quotations: quotationStats,
          documents: documentStats,
          services: serviceStats,
          recentActivity: recentActivity,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error in DashboardController.getStats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard statistics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get query statistics
  static async getQueryStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'new' THEN 1 END) as new_queries,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as this_week,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as this_month
        FROM customer_queries
      `);

      return stats[0];
    } catch (error) {
      console.error("Error getting query stats:", error);
      return {};
    }
  }

  // Get machine statistics
  static async getMachineStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active,
          COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive,
          AVG(priceByDay) as avg_daily_rate,
          MIN(priceByDay) as min_daily_rate,
          MAX(priceByDay) as max_daily_rate
        FROM machines
      `);

      return {
        ...stats[0],
        avg_daily_rate: Math.round(stats[0].avg_daily_rate || 0),
        min_daily_rate: stats[0].min_daily_rate || 0,
        max_daily_rate: stats[0].max_daily_rate || 0,
      };
    } catch (error) {
      console.error("Error getting machine stats:", error);
      return {};
    }
  }

  // Get customer statistics
  static async getCustomerStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN gst_number IS NOT NULL AND gst_number != '' THEN 1 END) as with_gst,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as new_this_week,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as new_this_month
        FROM customers
      `);

      return stats[0];
    } catch (error) {
      console.error("Error getting customer stats:", error);
      return {};
    }
  }

  // Get quotation statistics
  static async getQuotationStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN quotation_status = 'draft' THEN 1 END) as draft,
          COUNT(CASE WHEN quotation_status = 'sent' THEN 1 END) as sent,
          COUNT(CASE WHEN quotation_status = 'accepted' THEN 1 END) as accepted,
          COUNT(CASE WHEN quotation_status = 'rejected' THEN 1 END) as rejected,
          COUNT(CASE WHEN delivery_status = 'delivered' THEN 1 END) as delivered,
          AVG(total_amount) as avg_amount,
          SUM(CASE WHEN quotation_status = 'accepted' THEN total_amount ELSE 0 END) as total_accepted_value,
          COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as today,
          COUNT(CASE WHEN DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as this_week
        FROM quotations
      `);

      return {
        ...stats[0],
        avg_amount: Math.round(stats[0].avg_amount || 0),
        total_accepted_value: stats[0].total_accepted_value || 0,
        conversion_rate:
          stats[0].total > 0
            ? Math.round((stats[0].accepted / stats[0].total) * 100)
            : 0,
      };
    } catch (error) {
      console.error("Error getting quotation stats:", error);
      return {};
    }
  }

  // Get document statistics
  static async getDocumentStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATEDIFF(expiry_date, CURDATE()) <= 0 THEN 1 END) as expired,
          COUNT(CASE WHEN DATEDIFF(expiry_date, CURDATE()) BETWEEN 1 AND 7 THEN 1 END) as expiring_week,
          COUNT(CASE WHEN DATEDIFF(expiry_date, CURDATE()) BETWEEN 8 AND 30 THEN 1 END) as expiring_month,
          COUNT(CASE WHEN document_type = 'RC_Book' THEN 1 END) as rc_books,
          COUNT(CASE WHEN document_type = 'PUC' THEN 1 END) as puc_certificates,
          COUNT(CASE WHEN document_type = 'Fitness' THEN 1 END) as fitness_certificates,
          COUNT(CASE WHEN document_type = 'Insurance' THEN 1 END) as insurance_policies
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        WHERE m.is_active = 1
      `);

      return stats[0];
    } catch (error) {
      console.error("Error getting document stats:", error);
      return {};
    }
  }

  // Get service statistics
  static async getServiceStats() {
    try {
      const stats = await executeQuery(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN DATE(service_date) = CURDATE() THEN 1 END) as today,
          COUNT(CASE WHEN DATE(service_date) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 END) as this_week,
          COUNT(CASE WHEN DATE(service_date) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as this_month,
          COUNT(DISTINCT machine_id) as machines_serviced,
          AVG(engine_hours) as avg_engine_hours
        FROM service_records
      `);

      return {
        ...stats[0],
        avg_engine_hours: Math.round(stats[0].avg_engine_hours || 0),
      };
    } catch (error) {
      console.error("Error getting service stats:", error);
      return {};
    }
  }

  // Get recent activity
  static async getRecentActivity() {
    try {
      const activities = [];

      // Recent queries
      const recentQueries = await executeQuery(`
        SELECT 'query' as type, company_name as title, status, created_at as timestamp
        FROM customer_queries
        ORDER BY created_at DESC
        LIMIT 5
      `);

      // Recent quotations
      const recentQuotations = await executeQuery(`
        SELECT 'quotation' as type, 
               CONCAT('QUO for ', customer_name) as title, 
               quotation_status as status, 
               created_at as timestamp
        FROM quotations
        ORDER BY created_at DESC
        LIMIT 5
      `);

      // Recent service records
      const recentServices = await executeQuery(`
        SELECT 'service' as type,
               CONCAT('Service for ', m.machine_number) as title,
               'completed' as status,
               sr.created_at as timestamp
        FROM service_records sr
        JOIN machines m ON sr.machine_id = m.id
        ORDER BY sr.created_at DESC
        LIMIT 5
      `);

      // Combine and sort by timestamp
      activities.push(...recentQueries, ...recentQuotations, ...recentServices);
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return activities.slice(0, 10); // Return top 10 most recent activities
    } catch (error) {
      console.error("Error getting recent activity:", error);
      return [];
    }
  }

  // Fixed DashboardController.getChartData method
  static async getChartData(req, res) {
    try {
      const { chart_type, period } = req.query;

      let chartData = {};

      switch (chart_type) {
        case "queries_trend":
          chartData = await DashboardController.getQueriesTrendData(period); // ✅ Fixed
          break;
        case "quotations_trend":
          chartData = await DashboardController.getQuotationsTrendData(period); // ✅ Fixed
          break;
        case "machine_utilization":
          chartData = await DashboardController.getMachineUtilizationData(); // ✅ Fixed
          break;
        case "revenue_trend":
          chartData = await DashboardController.getRevenueTrendData(period); // ✅ Fixed
          break;
        case "document_status":
          chartData = await DashboardController.getDocumentStatusData(); // ✅ Fixed
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid chart type",
          });
      }

      res.json({
        success: true,
        message: "Chart data retrieved successfully",
        data: chartData,
        chart_type,
        period,
      });
    } catch (error) {
      console.error("Error in DashboardController.getChartData:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve chart data",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get queries trend data
  static async getQueriesTrendData(period = "30d") {
    try {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

      const data = await executeQuery(
        `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as queries
        FROM customer_queries
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
        [days]
      );

      return {
        labels: data.map((item) => item.date),
        datasets: [
          {
            label: "Queries",
            data: data.map((item) => item.queries),
          },
        ],
      };
    } catch (error) {
      console.error("Error getting queries trend data:", error);
      return { labels: [], datasets: [] };
    }
  }

  // Get quotations trend data
  static async getQuotationsTrendData(period = "30d") {
    try {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

      const data = await executeQuery(
        `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as quotations,
          SUM(CASE WHEN quotation_status = 'accepted' THEN 1 ELSE 0 END) as accepted
        FROM quotations
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
        [days]
      );

      return {
        labels: data.map((item) => item.date),
        datasets: [
          {
            label: "Total Quotations",
            data: data.map((item) => item.quotations),
          },
          {
            label: "Accepted Quotations",
            data: data.map((item) => item.accepted),
          },
        ],
      };
    } catch (error) {
      console.error("Error getting quotations trend data:", error);
      return { labels: [], datasets: [] };
    }
  }

  // Get machine utilization data
  static async getMachineUtilizationData() {
    try {
      const data = await executeQuery(`
        SELECT 
          m.machine_number,
          m.name,
          COUNT(q.id) as quotation_count,
          SUM(CASE WHEN q.quotation_status = 'accepted' THEN 1 ELSE 0 END) as accepted_count
        FROM machines m
        LEFT JOIN quotations q ON m.id = q.machine_id
        WHERE m.is_active = 1
        GROUP BY m.id
        ORDER BY quotation_count DESC
        LIMIT 10
      `);

      return {
        labels: data.map((item) => item.machine_number),
        datasets: [
          {
            label: "Quotations",
            data: data.map((item) => item.quotation_count),
          },
          {
            label: "Accepted",
            data: data.map((item) => item.accepted_count),
          },
        ],
      };
    } catch (error) {
      console.error("Error getting machine utilization data:", error);
      return { labels: [], datasets: [] };
    }
  }

  // Get revenue trend data
  static async getRevenueTrendData(period = "30d") {
    try {
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

      const data = await executeQuery(
        `
        SELECT 
          DATE(created_at) as date,
          SUM(CASE WHEN quotation_status = 'accepted' THEN total_amount ELSE 0 END) as revenue
        FROM quotations
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `,
        [days]
      );

      return {
        labels: data.map((item) => item.date),
        datasets: [
          {
            label: "Revenue (₹)",
            data: data.map((item) => item.revenue || 0),
          },
        ],
      };
    } catch (error) {
      console.error("Error getting revenue trend data:", error);
      return { labels: [], datasets: [] };
    }
  }

  // Get document status data
  static async getDocumentStatusData() {
    try {
      const data = await executeQuery(`
        SELECT 
          CASE 
            WHEN DATEDIFF(expiry_date, CURDATE()) <= 0 THEN 'Expired'
            WHEN DATEDIFF(expiry_date, CURDATE()) <= 7 THEN 'Critical'
            WHEN DATEDIFF(expiry_date, CURDATE()) <= 30 THEN 'Warning'
            ELSE 'OK'
          END as status,
          COUNT(*) as count
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        WHERE m.is_active = 1
        GROUP BY status
      `);

      return {
        labels: data.map((item) => item.status),
        datasets: [
          {
            label: "Documents",
            data: data.map((item) => item.count),
          },
        ],
      };
    } catch (error) {
      console.error("Error getting document status data:", error);
      return { labels: [], datasets: [] };
    }
  }

  // Get business performance metrics
  static async getPerformanceMetrics(req, res) {
    try {
      const { period } = req.query;
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

      const metrics = await executeQuery(
        `
        SELECT 
          -- Query metrics
          COUNT(DISTINCT cq.id) as total_queries,
          COUNT(DISTINCT CASE WHEN cq.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN cq.id END) as recent_queries,
          
          -- Quotation metrics
          COUNT(DISTINCT q.id) as total_quotations,
          COUNT(DISTINCT CASE WHEN q.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN q.id END) as recent_quotations,
          COUNT(DISTINCT CASE WHEN q.quotation_status = 'accepted' AND q.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN q.id END) as recent_accepted,
          
          -- Revenue metrics
          SUM(CASE WHEN q.quotation_status = 'accepted' AND q.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN q.total_amount ELSE 0 END) as recent_revenue,
          AVG(CASE WHEN q.quotation_status = 'accepted' AND q.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN q.total_amount END) as avg_deal_size,
          
          -- Customer metrics
          COUNT(DISTINCT c.id) as total_customers,
          COUNT(DISTINCT CASE WHEN c.created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY) THEN c.id END) as new_customers
          
        FROM customer_queries cq
        LEFT JOIN quotations q ON 1=1  -- Cross join to get all combinations
        LEFT JOIN customers c ON 1=1   -- Cross join to get all combinations
      `,
        [days, days, days, days, days, days]
      );

      const result = metrics[0];

      // Calculate performance indicators
      const conversionRate =
        result.recent_quotations > 0
          ? Math.round(
              (result.recent_accepted / result.recent_quotations) * 100
            )
          : 0;

      const queryToQuotationRate =
        result.recent_queries > 0
          ? Math.round((result.recent_quotations / result.recent_queries) * 100)
          : 0;

      res.json({
        success: true,
        message: "Performance metrics retrieved successfully",
        data: {
          queries: {
            total: result.total_queries || 0,
            recent: result.recent_queries || 0,
          },
          quotations: {
            total: result.total_quotations || 0,
            recent: result.recent_quotations || 0,
            accepted: result.recent_accepted || 0,
            conversionRate: conversionRate,
          },
          revenue: {
            recent: result.recent_revenue || 0,
            averageDealSize: Math.round(result.avg_deal_size || 0),
          },
          customers: {
            total: result.total_customers || 0,
            new: result.new_customers || 0,
          },
          performance: {
            conversionRate: conversionRate,
            queryToQuotationRate: queryToQuotationRate,
          },
          period: period || "30d",
        },
      });
    } catch (error) {
      console.error(
        "Error in DashboardController.getPerformanceMetrics:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to retrieve performance metrics",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get alerts and notifications
  static async getAlerts(req, res) {
    try {
      const alerts = [];

      // Document expiry alerts
      const expiringDocuments = await executeQuery(`
        SELECT 
          CONCAT(m.machine_number, ' - ', md.document_type) as title,
          CASE 
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 0 THEN 'critical'
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 7 THEN 'warning'
            ELSE 'info'
          END as severity,
          CONCAT('Expires ', 
            CASE 
              WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 0 THEN 'EXPIRED'
              ELSE CONCAT('in ', DATEDIFF(md.expiry_date, CURDATE()), ' days')
            END
          ) as message,
          'document_expiry' as type,
          md.expiry_date as timestamp
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        WHERE m.is_active = 1 
        AND DATEDIFF(md.expiry_date, CURDATE()) <= 14
        ORDER BY md.expiry_date ASC
        LIMIT 10
      `);

      alerts.push(...expiringDocuments);

      // Service due alerts
      const servicesDue = await executeQuery(`
        SELECT 
          CONCAT(m.machine_number, ' - Service Due') as title,
          'warning' as severity,
          CONCAT('Last serviced ', 
            CASE 
              WHEN MAX(sr.service_date) IS NULL THEN 'Never'
              ELSE CONCAT(DATEDIFF(CURDATE(), MAX(sr.service_date)), ' days ago')
            END
          ) as message,
          'service_due' as type,
          COALESCE(MAX(sr.service_date), m.created_at) as timestamp
        FROM machines m
        LEFT JOIN service_records sr ON m.id = sr.machine_id
        WHERE m.is_active = 1
        GROUP BY m.id
        HAVING 
          MAX(sr.service_date) IS NULL OR 
          DATEDIFF(CURDATE(), MAX(sr.service_date)) >= 30
        ORDER BY timestamp ASC
        LIMIT 5
      `);

      alerts.push(...servicesDue);

      // Pending queries alerts
      const pendingQueries = await executeQuery(`
        SELECT 
          CONCAT('Query from ', company_name) as title,
          CASE 
            WHEN DATEDIFF(CURDATE(), created_at) >= 3 THEN 'warning'
            ELSE 'info'
          END as severity,
          CONCAT('Pending for ', DATEDIFF(CURDATE(), created_at), ' days') as message,
          'pending_query' as type,
          created_at as timestamp
        FROM customer_queries
        WHERE status IN ('new', 'in_progress')
        ORDER BY created_at ASC
        LIMIT 5
      `);

      alerts.push(...pendingQueries);

      // Sort alerts by severity and timestamp
      alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return new Date(a.timestamp) - new Date(b.timestamp);
      });

      res.json({
        success: true,
        message: "Alerts retrieved successfully",
        data: alerts,
        count: alerts.length,
      });
    } catch (error) {
      console.error("Error in DashboardController.getAlerts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve alerts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Get business summary for specific date range
  static async getBusinessSummary(req, res) {
    try {
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
      }

      const summary = await executeQuery(
        `
        SELECT 
          -- Queries
          COUNT(DISTINCT cq.id) as total_queries,
          COUNT(DISTINCT CASE WHEN cq.status = 'completed' THEN cq.id END) as completed_queries,
          
          -- Quotations
          COUNT(DISTINCT q.id) as total_quotations,
          COUNT(DISTINCT CASE WHEN q.quotation_status = 'accepted' THEN q.id END) as accepted_quotations,
          COUNT(DISTINCT CASE WHEN q.delivery_status = 'delivered' THEN q.id END) as delivered_orders,
          
          -- Revenue
          SUM(CASE WHEN q.quotation_status = 'accepted' THEN q.total_amount ELSE 0 END) as total_revenue,
          AVG(CASE WHEN q.quotation_status = 'accepted' THEN q.total_amount END) as avg_order_value,
          
          -- Customers
          COUNT(DISTINCT c.id) as new_customers,
          COUNT(DISTINCT q.customer_id) as active_customers
          
        FROM customer_queries cq
        LEFT JOIN quotations q ON DATE(q.created_at) BETWEEN ? AND ?
        LEFT JOIN customers c ON DATE(c.created_at) BETWEEN ? AND ?
        WHERE DATE(cq.created_at) BETWEEN ? AND ?
      `,
        [start_date, end_date, start_date, end_date, start_date, end_date]
      );

      const result = summary[0];

      res.json({
        success: true,
        message: "Business summary retrieved successfully",
        data: {
          period: {
            startDate: start_date,
            endDate: end_date,
          },
          queries: {
            total: result.total_queries || 0,
            completed: result.completed_queries || 0,
            completionRate:
              result.total_queries > 0
                ? Math.round(
                    (result.completed_queries / result.total_queries) * 100
                  )
                : 0,
          },
          quotations: {
            total: result.total_quotations || 0,
            accepted: result.accepted_quotations || 0,
            delivered: result.delivered_orders || 0,
            conversionRate:
              result.total_quotations > 0
                ? Math.round(
                    (result.accepted_quotations / result.total_quotations) * 100
                  )
                : 0,
          },
          revenue: {
            total: result.total_revenue || 0,
            average: Math.round(result.avg_order_value || 0),
          },
          customers: {
            new: result.new_customers || 0,
            active: result.active_customers || 0,
          },
        },
      });
    } catch (error) {
      console.error("Error in DashboardController.getBusinessSummary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve business summary",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

module.exports = DashboardController;
