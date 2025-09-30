const { executeQuery } = require("../config/database");

class DashboardController {
  // Single optimized endpoint - only essential data
  static async getDashboardOverview(req, res) {
    try {
      const { period = "30d" } = req.query;
      const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

      // Single comprehensive query - only required data
      const [statsData] = await executeQuery(
        `
        SELECT 
          -- Overview counts (for stat cards)
          (SELECT COUNT(*) FROM customer_queries) as total_queries,
          (SELECT COUNT(*) FROM machines ) as total_machines,
          (SELECT COUNT(*) FROM customers) as total_customers,
          (SELECT COUNT(*) FROM quotations) as total_quotations,
          
          -- Stat card details
          (SELECT COUNT(*) FROM customer_queries WHERE DATE(created_at) = CURDATE()) as queries_today,
          (SELECT COUNT(*) FROM machines WHERE is_active = 1) as active_machines,
          (SELECT COUNT(*) FROM quotations WHERE quotation_status = 'draft') as draft_quotations,
          (SELECT COUNT(*) FROM customers WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL ? DAY)) as new_customers_period,
          
          -- Performance Overview data
          (SELECT COUNT(*) FROM customer_queries WHERE status = 'completed') as completed_queries,
          (SELECT COUNT(*) FROM customer_queries WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)) as queries_this_week,
          
          -- Business Insights data  
          (SELECT COUNT(*) FROM quotations WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)) as quotations_this_month,
          
          -- Conversion rate calculation
          (SELECT COUNT(*) FROM quotations WHERE quotation_status = 'accepted') as accepted_quotations,
          (SELECT COUNT(*) FROM quotations WHERE delivery_status IN ('delivered', 'completed')) as successful_quotations
      `,
        [days]
      );

      // Get recent activity (minimal data)
      const recentActivity = await executeQuery(`
        SELECT 
          id, company_name, contact_number, site_location, status, created_at
        FROM customer_queries
        ORDER BY created_at DESC
        LIMIT 6
      `);

      // Get critical alerts only (document expiry within 7 days)
      const alerts = await executeQuery(`
        SELECT 
          CONCAT(m.machine_number, ' - ', md.document_type) as title,
          CASE 
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 0 THEN 'critical'
            WHEN DATEDIFF(md.expiry_date, CURDATE()) <= 7 THEN 'warning'
            ELSE 'info'
          END as severity,
          DATEDIFF(md.expiry_date, CURDATE()) as days_remaining,
          'document_expiry' as type
        FROM machine_documents md
        JOIN machines m ON md.machine_id = m.id
        WHERE m.is_active = 1 
        AND DATEDIFF(md.expiry_date, CURDATE()) <= 7
        ORDER BY md.expiry_date ASC
        LIMIT 5
      `);

      // Calculate metrics
      const queryResolutionRate =
        statsData.total_queries > 0
          ? Math.round(
              (statsData.completed_queries / statsData.total_queries) * 100
            )
          : 0;

      const quotationToSuccessRate =
        statsData.total_quotations > 0
          ? Math.round(
              (statsData.successful_quotations / statsData.total_quotations) *
                100
            )
          : 0;

      const customerGrowth = statsData.new_customers_period || 0;

      res.json({
        success: true,
        message: "Dashboard data retrieved successfully",
        data: {
          // Stat cards data
          overview: {
            totalQueries: statsData.total_queries || 0,
            totalMachines: statsData.total_machines || 0,
            totalCustomers: statsData.total_customers || 0,
            totalQuotations: statsData.total_quotations || 0,
          },

          cards: {
            queries: {
              total: statsData.total_queries || 0,
              today: statsData.queries_today || 0,
            },
            machines: {
              total: statsData.total_machines || 0,
              active: statsData.active_machines || 0,
            },
            quotations: {
              total: statsData.total_quotations || 0,
              pending: statsData.draft_quotations || 0, // FIXED: Now shows draft quotations
            },
            customers: {
              total: statsData.total_customers || 0,
              newPeriod: statsData.new_customers_period || 0,
            },
          },

          // Performance Overview - exactly what you requested
          performance: {
            queryResolutionRate: {
              label: "Query Resolution Rate",
              value: queryResolutionRate,
              description: `${queryResolutionRate}% of queries completed`,
            },
            newQueriesThisWeek: {
              label: "New Queries This Week",
              value: statsData.queries_this_week || 0,
              description: "Customer inquiries this week",
            },
          },

          // Business Insights - exactly what you requested
          insights: {
            customerGrowth: {
              title: "Customer Growth",
              value: customerGrowth,
              description: `New customers in last ${days} days`,
              trend: customerGrowth > 0 ? "positive" : "neutral",
            },
            quotationsThisMonth: {
              title: "Quotations Generated This Month",
              value: statsData.quotations_this_month || 0,
              description: "Quotations created in last 30 days",
              trend:
                statsData.quotations_this_month > 0 ? "positive" : "neutral",
            },
          },

          // Conversion rate stats
          conversionStats: {
            quotationToDelivery: {
              label: "Quotation → Delivery Rate",
              value: quotationToSuccessRate,
              description: `${quotationToSuccessRate}% of quotations successful`,
              accepted: statsData.accepted_quotations || 0,
              successful: statsData.successful_quotations || 0,
              total: statsData.total_quotations || 0,
            },
          },

          // Recent activity
          recentActivity: recentActivity || [],

          // Critical alerts only
          alerts: alerts.map((alert) => ({
            title: alert.title,
            severity: alert.severity,
            message:
              alert.days_remaining <= 0
                ? "EXPIRED"
                : `Expires in ${alert.days_remaining} day${
                    alert.days_remaining !== 1 ? "s" : ""
                  }`,
            type: alert.type,
          })),

          // Metadata
          period: period,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        "Error in DashboardController.getDashboardOverview:",
        error
      );
      res.status(500).json({
        success: false,
        message: "Failed to retrieve dashboard data",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}

// REMOVE these methods - no longer needed:
/*
- getStats()
- getMachineStats() 
- getCustomerStats()
- getQuotationStats()
- getDocumentStats()
- getServiceStats()
- getRecentActivity()
- getChartData()
- getQueriesTrendData()
- getQuotationsTrendData()
- getMachineUtilizationData()
- getRevenueTrendData()
- getDocumentStatusData()
- getPerformanceMetrics()
- getAlerts()
- getBusinessSummary()
*/

module.exports = DashboardController;
