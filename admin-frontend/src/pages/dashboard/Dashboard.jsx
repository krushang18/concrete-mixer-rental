import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  MessageSquare, 
  FileText, 
  Truck, 
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Calendar,
  Plus,
  ArrowRight,
  RefreshCw,
  Activity,
  BarChart3,
  XCircle,
  Loader2
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { dashboardApi } from '../../services/dashboardApi'
import { queryApi } from '../../services/queryApi'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')

  // Fetch dashboard data
  const fetchDashboardData = async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      setError(null)

      // Fetch all dashboard data in parallel using available API functions
      const [statsResponse, alerts, businessSummary, recentQueries] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getAlerts(),
        dashboardApi.getBusinessSummary(selectedPeriod),
        queryApi.getQueries({ limit: 10, sortBy: 'created_at', sortOrder: 'desc' })
      ])

      const statsData = statsResponse.data

      setDashboardData({
        overview: statsData.overview || {},
        queries: statsData.queries || {},
        machines: statsData.machines || {},
        customers: statsData.customers || {},
        quotations: statsData.quotations || {},
        documents: statsData.documents || {},
        services: statsData.services || {},
        recentActivity: recentQueries.data || [],
        alerts: alerts.data || [],
        businessSummary: businessSummary.data || {},
        lastUpdated: statsData.lastUpdated || new Date().toISOString()
      })

    } catch (error) {
      console.error('Dashboard fetch error:', error)
      setError(error.message || 'Failed to load dashboard data')
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Refetch data when period changes
  useEffect(() => {
    if (selectedPeriod) {
      fetchDashboardData(true)
    }
  }, [selectedPeriod])

  // Refresh data handler
  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  // Period change handler
  const handlePeriodChange = (period) => {
    setSelectedPeriod(period)
    // Refetch data with new period
    fetchDashboardData(true)
  }

  // Generate sample alerts if none exist
  const generateSampleAlerts = (statsData) => {
    const alerts = []
    
    // Check for pending queries
    if (statsData.queries?.new > 5) {
      alerts.push({
        id: 'pending_queries',
        type: 'info',
        priority: 'medium',
        message: `${statsData.queries.new} new queries require attention`,
        action: 'View Queries'
      })
    }

    // Check for machine availability
    if (statsData.machines?.total > 0) {
      const availability = (statsData.machines.active / statsData.machines.total) * 100
      if (availability < 70) {
        alerts.push({
          id: 'low_availability',
          type: 'warning',
          priority: 'high',
          message: `Only ${availability.toFixed(1)}% of machines are active`,
          action: 'Check Machines'
        })
      }
    }

    // Check for quotations pending
    if (statsData.quotations?.pending > 3) {
      alerts.push({
        id: 'pending_quotations',
        type: 'warning',
        priority: 'medium',
        message: `${statsData.quotations.pending} quotations pending customer response`,
        action: 'Follow Up'
      })
    }

    return alerts
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => fetchDashboardData()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Welcome Header - Mobile Optimized */}
      <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 rounded-lg sm:rounded-xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">
                Welcome back, {user?.username}! 👋
              </h1>
              <p className="text-primary-100 text-sm sm:text-base lg:text-lg max-w-2xl">
                Here's your concrete mixer rental business overview
              </p>
            </div>
            
            {/* Refresh Button & Period Selector */}
            <div className="flex items-center space-x-3">
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-white bg-opacity-20 border border-white border-opacity-30 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              >
                <option value="7d" className="text-gray-900">Last 7 days</option>
                <option value="30d" className="text-gray-900">Last 30 days</option>
                <option value="90d" className="text-gray-900">Last 90 days</option>
              </select>
              
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={clsx("w-5 h-5", refreshing && "animate-spin")} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Background decoration */}
        <div className="absolute top-0 right-0 -mr-8 sm:-mr-16 -mt-8 sm:-mt-16 w-16 h-16 sm:w-32 sm:h-32 lg:w-48 lg:h-48 bg-white bg-opacity-10 rounded-full"></div>
        <div className="absolute bottom-0 right-0 -mr-4 sm:-mr-8 -mb-4 sm:-mb-8 w-12 h-12 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-white bg-opacity-5 rounded-full"></div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Total Queries"
          value={dashboardData?.overview?.totalQueries || 0}
          change={`+${dashboardData?.queries?.today || 0} today`}
          changeType={dashboardData?.queries?.today > 0 ? 'positive' : 'neutral'}
          icon={MessageSquare}
          color="blue"
          onClick={() => navigate('/queries')}
        />
        <StatCard
          title="Active Machines"
          value={dashboardData?.overview?.totalMachines || 0}
          change={`${dashboardData?.machines?.active || 0} active`}
          changeType="positive"
          icon={Truck}
          color="green"
          onClick={() => navigate('/machines')}
        />
        <StatCard
          title="Quotations"
          value={dashboardData?.overview?.totalQuotations || 0}
          change={`${dashboardData?.quotations?.pending || 0} pending`}
          changeType={dashboardData?.quotations?.pending > 0 ? 'warning' : 'neutral'}
          icon={FileText}
          color="purple"
          onClick={() => navigate('/quotations')}
        />
        <StatCard
          title="Customers"
          value={dashboardData?.overview?.totalCustomers || 0}
          change={`+${dashboardData?.customers?.new || 0} this month`}
          changeType={dashboardData?.customers?.new > 0 ? 'positive' : 'neutral'}
          icon={Users}
          color="orange"
          onClick={() => navigate('/customers')}
        />
      </div>

      {/* Main Content Grid - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Recent Activity - Takes full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2 order-1 lg:order-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-primary-600" />
                Recent Activity
              </h2>
              <button 
                onClick={() => navigate('/queries')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center group"
              >
                View All
                <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {dashboardData?.recentActivity?.length > 0 ? (
                dashboardData.recentActivity.slice(0, 6).map((query, index) => (
                  <QueryActivityItem key={query.id || index} query={query} />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions & Alerts - Single column on mobile */}
        <div className="space-y-4 sm:space-y-6 order-2 lg:order-2">
          
          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Quick Actions</h2>
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-3">
              <QuickActionButton
                icon={FileText}
                label="Create Quotation"
                description="Generate new quote"
                onClick={() => navigate('/quotations')}
              />
              <QuickActionButton
                icon={Truck}
                label="Add Machine"
                description="Register equipment"
                onClick={() => navigate('/machines')}
              />
              <QuickActionButton
                icon={Users}
                label="Add Customer"
                description="New client entry"
                onClick={() => navigate('/customers')}
              />
              <QuickActionButton
                icon={Calendar}
                label="Schedule Service"
                description="Book maintenance"
                onClick={() => navigate('/services')}
              />
            </div>
          </div>

          {/* System Alerts */}
          {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">System Alerts</h2>
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {dashboardData?.alerts?.length || 0} alerts
              </span>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {dashboardData?.alerts?.length > 0 ? (
                dashboardData.alerts.slice(0, 4).map((alert, index) => (
                  <AlertItem key={index} alert={alert} />
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
                  <p className="text-sm">No active alerts</p>
                </div>
              )}
            </div>
          </div> */}
        </div>
      </div>

      {/* Performance Overview - Full width card on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
              Performance Overview
            </h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View Details
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <MetricCard
              label="Query Resolution"
              value={`${dashboardData?.queries?.completed || 0}%`}
              trend="up"
              description="Queries completed"
            />
            <MetricCard
              label="Machine Utilization"
              value={`${Math.round(((dashboardData?.machines?.active || 0) / Math.max(dashboardData?.overview?.totalMachines, 1)) * 100)}%`}
              trend="up"
              description="Machines active"
            />
            <MetricCard
              label="New Queries"
              value={dashboardData?.queries?.this_week || 0}
              trend="neutral"
              description="This week"
            />
            <MetricCard
              label="Pending Items"
              value={(dashboardData?.queries?.new || 0) + (dashboardData?.quotations?.pending || 0)}
              trend="down"
              description="Need attention"
            />
          </div>
        </div>

        {/* Business Insights */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Business Insights
            </h2>
          </div>
          
          <div className="space-y-4">
            <InsightCard
              title="Customer Growth"
              description={`${dashboardData?.customers?.new || 0} new customers this month`}
              trend="positive"
            />
            <InsightCard
              title="Query Volume"
              description={`${dashboardData?.queries?.this_week || 0} queries this week`}
              trend="neutral"
            />
            <InsightCard
              title="Machine Availability"
              description={`${dashboardData?.machines?.active || 0}/${dashboardData?.overview?.totalMachines || 0} machines active`}
              trend="positive"
            />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-xs sm:text-sm text-gray-500">
        Last updated: {dashboardData?.lastUpdated ? new Date(dashboardData.lastUpdated).toLocaleString() : 'Unknown'}
      </div>
    </div>
  )
}

// Enhanced Stat Card Component - Mobile Optimized
const StatCard = ({ title, value, change, changeType, icon: Icon, color, onClick }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  }

  const changeTypeClasses = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    warning: 'text-yellow-600',
    neutral: 'text-gray-600'
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{title}</p>
          <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className={clsx("text-xs sm:text-sm mt-1 font-medium", changeTypeClasses[changeType])}>
            {change}
          </p>
        </div>
        <div className={clsx("p-2 sm:p-3 rounded-lg flex-shrink-0", colorClasses[color])}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
        </div>
      </div>
    </div>
  )
}

// Quick Action Button Component - Mobile Optimized
const QuickActionButton = ({ icon: Icon, label, description, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center p-3 sm:p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 hover:shadow-sm transition-all duration-200 group"
  >
    <div className="flex items-center flex-1 min-w-0">
      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-primary-500 mr-3 flex-shrink-0 transition-colors duration-200" />
      <div className="min-w-0 flex-1">
        <span className="text-sm sm:text-base font-medium text-gray-700 group-hover:text-gray-900 block truncate">
          {label}
        </span>
        {description && (
          <span className="text-xs sm:text-sm text-gray-500 block truncate">
            {description}
          </span>
        )}
      </div>
    </div>
    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
  </button>
)

// Query Activity Item Component - Using actual query data
const QueryActivityItem = ({ query }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'text-blue-500 bg-blue-50'
      case 'in_progress': return 'text-yellow-500 bg-yellow-50'
      case 'completed': return 'text-green-500 bg-green-50'
      default: return 'text-gray-500 bg-gray-50'
    }
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Recent'
    }
  }

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
      <div className={clsx("p-2 rounded-lg flex-shrink-0", getStatusColor(query.status))}>
        <MessageSquare className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-tight truncate">
          {query.company_name}
        </p>
        <p className="text-xs text-gray-600 truncate mt-1">
          {query.site_location} • {query.contact_number}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            {formatDate(query.created_at)}
          </p>
          <span className={clsx(
            "text-xs px-2 py-1 rounded-full font-medium capitalize",
            getStatusColor(query.status)
          )}>
            {query.status || 'new'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Activity Item Component - Mobile Optimized
const ActivityItem = ({ activity }) => {
  const getActivityIcon = (type) => {
    switch (type) {
      case 'query': return MessageSquare
      case 'quotation': return FileText
      case 'machine': return Truck
      case 'customer': return Users
      default: return Activity
    }
  }

  const getActivityColor = (type) => {
    switch (type) {
      case 'query': return 'text-blue-500 bg-blue-50'
      case 'quotation': return 'text-green-500 bg-green-50'
      case 'machine': return 'text-purple-500 bg-purple-50'
      case 'customer': return 'text-orange-500 bg-orange-50'
      default: return 'text-gray-500 bg-gray-50'
    }
  }

  const ActivityIcon = getActivityIcon(activity.type)

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
      <div className={clsx("p-2 rounded-lg flex-shrink-0", getActivityColor(activity.type))}>
        <ActivityIcon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-tight">
          {activity.description || activity.title}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-500">
            {activity.timestamp ? new Date(activity.timestamp).toLocaleDateString() : 'Recent'}
          </p>
          {activity.status && (
            <span className={clsx(
              "text-xs px-2 py-1 rounded-full font-medium",
              activity.status === 'completed' ? 'bg-green-100 text-green-700' :
              activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            )}>
              {activity.status}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Alert Item Component - Mobile Optimized
const AlertItem = ({ alert }) => {
  const priorityColors = {
    high: 'text-red-600 bg-red-50 border-red-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const iconColors = {
    high: 'text-red-500',
    medium: 'text-yellow-500',
    low: 'text-gray-500'
  }

  return (
    <div className={clsx(
      "flex items-start p-3 sm:p-4 border rounded-lg transition-all duration-200 hover:shadow-sm",
      priorityColors[alert.priority] || priorityColors.low
    )}>
      <AlertCircle className={clsx(
        "w-4 h-4 sm:w-5 sm:h-5 mr-3 mt-0.5 flex-shrink-0",
        iconColors[alert.priority] || iconColors.low
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-tight">
          {alert.message || alert.title}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 capitalize">
            {alert.priority || 'medium'} priority • {alert.type || 'general'}
          </p>
          {alert.action && (
            <button className="text-xs sm:text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200">
              {alert.action}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Metric Card Component
const MetricCard = ({ label, value, trend, description }) => (
  <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs sm:text-sm text-gray-600">{label}</span>
      {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
      {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
    </div>
    <p className="text-lg sm:text-xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500">{description}</p>
  </div>
)

// Insight Card Component
const InsightCard = ({ title, description, trend }) => (
  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <p className="text-xs sm:text-sm text-gray-600 mt-1">{description}</p>
    </div>
    <div className="ml-3">
      {trend === 'positive' && <TrendingUp className="w-5 h-5 text-green-500" />}
      {trend === 'negative' && <TrendingDown className="w-5 h-5 text-red-500" />}
      {trend === 'neutral' && <Activity className="w-5 h-5 text-gray-500" />}
    </div>
  </div>
)

export default Dashboard