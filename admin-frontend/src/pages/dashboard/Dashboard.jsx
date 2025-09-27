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
  ArrowRight,
  RefreshCw,
  Activity,
  BarChart3,
  XCircle,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Target
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import { dashboardApi } from '../../services/dashboardApi'
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

  // Single API call to get all required data
  const fetchDashboardData = async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      
      setError(null)

      // Single optimized API call
      const response = await dashboardApi.getDashboardOverview(selectedPeriod)
      setDashboardData(response.data)

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
    if (selectedPeriod && dashboardData) {
      fetchDashboardData(true)
    }
  }, [selectedPeriod])

  // Refresh data handler
  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm sm:text-base">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md mx-auto">
          <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-600 mb-4 text-sm sm:text-base">{error}</p>
          <button 
            onClick={() => fetchDashboardData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { overview, cards, performance, insights, conversionStats, recentActivity, alerts } = dashboardData
  console.log("----------------------------------------------------------------");
  console.log("conversionStats: "+JSON.stringify(conversionStats));
  console.log("----------------------------------------------------------------");
  
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-first container */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        
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
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 sm:w-32 sm:h-32 bg-white bg-opacity-10 rounded-full"></div>
          <div className="absolute bottom-0 right-0 -mr-4 -mb-4 w-16 h-16 sm:w-24 sm:h-24 bg-white bg-opacity-5 rounded-full"></div>
        </div>

        {/* Stats Grid - Original Colors & Improved Active Machines */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            title="Total Queries"
            value={overview?.totalQueries || 0}
            change={`+${cards?.queries?.today || 0} today`}
            changeType={cards?.queries?.today > 0 ? 'positive' : 'neutral'}
            icon={MessageSquare}
            color="blue"
            onClick={() => navigate('/queries')}
          />
          <StatCard
            title="Machines"
            value={cards?.machines?.total || 0}
            change={`${cards?.machines?.active || 0} Active`}
            changeType="positive"
            icon={Truck}
            color="green"
            onClick={() => navigate('/machines')}
          />
          <StatCard
            title="Quotations"
            value={overview?.totalQuotations || 0}
            change={`${cards?.quotations?.pending || 0} Drafted`}
            changeType={cards?.quotations?.pending > 0 ? 'warning' : 'neutral'}
            icon={FileText}
            color="purple"
            onClick={() => navigate('/quotations')}
          />
          <StatCard
            title="Customers"
            value={overview?.totalCustomers || 0}
            change={`+${cards?.customers?.newPeriod || 0} this period`}
            changeType={cards?.customers?.newPeriod > 0 ? 'positive' : 'neutral'}
            icon={Users}
            color="orange"
            onClick={() => navigate('/customers')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          
          {/* Recent Activity - Show only 5 queries */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-600" />
                  Recent Activity
                </h2>
                <button 
                  onClick={() => navigate('/queries')}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center group"
                >
                  View All
                  <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </div>
              
              <div className="space-y-3">
                {recentActivity?.length > 0 ? (
                  recentActivity.slice(0, 5).map((query, index) => (
                    <QueryActivityItem key={query.id || index} query={query} />
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm sm:text-base">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Alerts - Enhanced with more info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center mb-4 sm:mb-6">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-600" />
                Alerts
                {alerts?.length > 0 && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                    {alerts.length}
                  </span>
                )}
              </h2>
              
              <div className="space-y-3">
                {alerts?.length > 0 ? (
                  alerts.map((alert, index) => (
                    <AlertItem key={index} alert={alert} />
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-400" />
                    <p className="text-sm">All systems running smoothly</p>
                    <p className="text-xs text-gray-400 mt-1">No urgent alerts</p>
                  </div>
                )}
              </div>
              
              {/* Alert Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium">Alert Types Monitored:</p>
                <ul className="text-xs text-blue-600 mt-1 space-y-1">
                  <li>• Document expiry (within 7 days)</li>
                  <li>• Insurance expiration</li>
                  <li>• PUC certificate renewal</li>
                  <li>• RC Book renewal</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Performance & Insights - Original styling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Performance Overview - Your exact requirements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
                Performance Overview
              </h2>
            </div>
            
            <div className="space-y-4">
              <MetricCard
                label={performance?.queryResolutionRate?.label || "Query Resolution Rate"}
                value={`${performance?.queryResolutionRate?.value || 0}%`}
                description={performance?.queryResolutionRate?.description || "Query completion rate"}
                trend={performance?.queryResolutionRate?.value >= 80 ? "up" : "down"}
              />
              <MetricCard
                label={performance?.newQueriesThisWeek?.label || "New Queries This Week"}
                value={performance?.newQueriesThisWeek?.value || 0}
                description={performance?.newQueriesThisWeek?.description || "Weekly inquiry volume"}
                trend="neutral"
              />
            </div>
          </div>

          {/* Business Insights - Your exact requirements */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Business Insights
              </h2>
            </div>
            
            <div className="space-y-4">
              <InsightCard
                title={insights?.customerGrowth?.title || "Customer Growth"}
                value={insights?.customerGrowth?.value || 0}
                description={insights?.customerGrowth?.description || "New customer acquisitions"}
                trend={insights?.customerGrowth?.trend || "neutral"}
              />
              <InsightCard
                title={insights?.quotationsThisMonth?.title || "Quotations Generated This Month"}
                value={insights?.quotationsThisMonth?.value || 0}
                description={insights?.quotationsThisMonth?.description || "Monthly quotation volume"}
                trend={insights?.quotationsThisMonth?.trend || "neutral"}
              />
            </div>
          </div>
        </div>

        {/* Conversion Rate Stats - New section for quotation → delivery tracking */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center">
              <Target className="w-5 h-5 mr-2 text-purple-600" />
              Conversion Tracking
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<ConversionCard
  label="Quotation → Success Rate"
  value={`${conversionStats?.quotationToDelivery?.value || 0}%`}
  description={conversionStats?.quotationToSuccess?.description || "Overall success rate"}
/>
            <ConversionCard
              label="Total Quotations"
              value={conversionStats?.quotationToDelivery?.total || 0}
              description="All quotations created"
            />
<ConversionCard
  label="Successful Orders"
  value={conversionStats?.quotationToDelivery?.successful || 0}
  description="Delivered + Completed"
/>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-center text-xs text-gray-500">
          Last updated: {dashboardData?.lastUpdated ? new Date(dashboardData.lastUpdated).toLocaleString() : 'Unknown'}
        </div>
      </div>
    </div>
  )
}

// Enhanced Stat Card Component - Original Colors
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
    warning: 'text-orange-600',
    neutral: 'text-gray-600'
  }

  return (
    <div 
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 truncate mb-1">{title}</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-900 mb-1">{value}</p>
          <p className={clsx("text-xs font-medium truncate", changeTypeClasses[changeType])}>
            {change}
          </p>
        </div>
        <div className={clsx("p-2 rounded-lg flex-shrink-0 ml-2", colorClasses[color])}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </div>
  )
}

// Query Activity Item Component
const QueryActivityItem = ({ query }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'text-blue-600 bg-blue-50'
      case 'in_progress': return 'text-yellow-600 bg-yellow-50'
      case 'completed': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
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
        <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" />
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

// Alert Item Component
const AlertItem = ({ alert }) => {
  const severityColors = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    info: 'text-blue-600 bg-blue-50 border-blue-200'
  }

  const iconColors = {
    critical: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500'
  }

  return (
    <div className={clsx(
      "flex items-start p-3 border rounded-lg transition-all duration-200",
      severityColors[alert.severity] || severityColors.info
    )}>
      <AlertCircle className={clsx(
        "w-4 h-4 mr-3 mt-0.5 flex-shrink-0",
        iconColors[alert.severity] || iconColors.info
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 leading-tight">
          {alert.title}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          {alert.message}
        </p>
      </div>
    </div>
  )
}

// Metric Card Component
const MetricCard = ({ label, value, description, trend }) => (
  <div className="p-4 bg-gray-50 rounded-lg">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
      {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
      {trend === 'neutral' && <Activity className="w-4 h-4 text-gray-500" />}
    </div>
    <p className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-xs text-gray-500">{description}</p>
  </div>
)

// Insight Card Component
const InsightCard = ({ title, value, description, trend }) => (
  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      <p className="text-lg font-bold text-gray-900 mt-1">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{description}</p>
    </div>
    <div className="ml-3 flex-shrink-0">
      {trend === 'positive' && <TrendingUp className="w-5 h-5 text-green-500" />}
      {trend === 'negative' && <TrendingDown className="w-5 h-5 text-red-500" />}
      {trend === 'neutral' && <Activity className="w-5 h-5 text-gray-500" />}
    </div>
  </div>
)

// Conversion Card Component - New for tracking quotation to delivery
const ConversionCard = ({ label, value, description }) => (
  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
    <div className="text-center">
      <p className="text-sm font-medium text-purple-700 mb-2">{label}</p>
      <p className="text-2xl font-bold text-purple-900">{value}</p>
      <p className="text-xs text-purple-600 mt-1">{description}</p>
    </div>
  </div>
)

export default Dashboard