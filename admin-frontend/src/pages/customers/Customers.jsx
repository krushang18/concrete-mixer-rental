import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import { 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  MoreHorizontal,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Users,
  Building2,
  TrendingUp,
  Calendar,
  FileText,
  X,
  RefreshCw,
  AlertCircle,
  Menu
} from 'lucide-react';
import { customerApi } from '../../services/customerApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';

// Zustand store for customer state management
const useCustomerStore = create((set, get) => ({
  selectedCustomers: [],
  filters: {
    search: '',
    city: '',
    has_gst: 'all',
    sortBy: 'created_at',
    sortOrder: 'DESC',
    page: 1,
    limit: 10
  },
  searchTerm: '',
  showMobileFilters: false,
  
  // Actions
  setSelectedCustomers: (customers) => set({ selectedCustomers: customers }),
  addSelectedCustomer: (customerId) => set((state) => ({
    selectedCustomers: state.selectedCustomers.includes(customerId) 
      ? state.selectedCustomers.filter(id => id !== customerId)
      : [...state.selectedCustomers, customerId]
  })),
  clearSelectedCustomers: () => set({ selectedCustomers: [] }),
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      search: '',
      city: '',
      has_gst: 'all',
      sortBy: 'created_at',
      sortOrder: 'DESC',
      page: 1,
      limit: 10
    },
    searchTerm: '',
    selectedCustomers: []
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters }))
}));

// Validation schema for filters
const filterSchema = yup.object({
  search: yup.string(),
  city: yup.string(),
  has_gst: yup.string().oneOf(['all', 'has_gst', 'no_gst']),
  sortBy: yup.string().oneOf(['created_at', 'company_name', 'contact_person', 'total_quotations']),
  sortOrder: yup.string().oneOf(['ASC', 'DESC'])
});

// Custom hook for debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Mobile-optimized Customer Stats Cards Component
const CustomerStatsCards = ({ customersData, stats }) => {
  let calculatedStats;
  if (stats?.success && stats?.data) {
    calculatedStats = stats.data;
  } else {
    // Fallback calculation from customers data
    const customers = customersData || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    calculatedStats = {
      totalCustomers: customers.length,
      customersWithGST: customers.filter(c => c.gst_number).length,
      newToday: customers.filter(c => new Date(c.created_at) >= today).length,
      newThisWeek: customers.filter(c => new Date(c.created_at) >= thisWeek).length,
      newThisMonth: customers.filter(c => new Date(c.created_at) >= thisMonth).length
    };
  }

  const statItems = [
    {
      title: 'Total',
      value: calculatedStats.totalCustomers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: 'All customers',
      trend: calculatedStats.newThisMonth || 0,
      trendLabel: 'new this month'
    },
    {
      title: 'With GST',
      value: calculatedStats.customersWithGST || 0,
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: 'Have GST number',
      trend: calculatedStats.totalCustomers > 0 
        ? Math.round((calculatedStats.customersWithGST / calculatedStats.totalCustomers) * 100)
        : 0,
      trendLabel: 'of total customers',
      isPercentage: true
    },
    {
      title: 'This Week',
      value: calculatedStats.newThisWeek || 0,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: 'Added this week',
      trend: calculatedStats.newToday || 0,
      trendLabel: 'added today'
    },
    {
      title: 'This Month',
      value: calculatedStats.newThisMonth || 0,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      subtitle: 'Added this month',
      trend: null,
      trendLabel: 'monthly growth'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {statItems.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <div
            key={index}
            className={`${stat.bgColor} rounded-lg p-3 sm:p-4 transform hover:scale-105 transition-transform duration-200`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">
                  {stat.title}
                </p>
                <p className={`text-lg sm:text-2xl font-bold ${stat.color} mb-1`}>
                  {stat.isPercentage ? `${stat.value}%` : stat.value.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {stat.subtitle}
                </p>
                {stat.trend !== null && (
                  <p className={`text-xs ${stat.color} mt-1 font-medium`}>
                    {stat.isPercentage ? '' : stat.trend} {stat.trendLabel}
                  </p>
                )}
              </div>
              <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${stat.color} flex-shrink-0`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Mobile-first Bulk Actions Component
const BulkActions = ({ selectedCustomers, onExport, onDeselectAll }) => {
  if (selectedCustomers.length === 0) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="text-blue-800 font-medium text-sm">
          {selectedCustomers.length} selected
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={onDeselectAll}
            className="px-3 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            Deselect All
          </button>
        </div>
      </div>
    </div>
  );
};

// Mobile-first Filters Component with React Hook Form
const CustomerFilters = ({ onApplyFilters, onReset }) => {
  const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useCustomerStore();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(filterSchema),
    defaultValues: filters,
    mode: 'onChange'
  });

  const onSubmit = (data) => {
    setFilters(data);
    onApplyFilters();
    toggleMobileFilters(); // Close mobile filters after apply
  };

  const handleReset = () => {
    reset({
      search: '',
      city: '',
      has_gst: 'all',
      sortBy: 'created_at',
      sortOrder: 'DESC'
    });
    onReset();
    toggleMobileFilters(); // Close mobile filters after reset
  };
  
  return (
    <div className="bg-white rounded-lg border mb-4">
      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between p-4 lg:hidden">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h3>
        <button
          onClick={toggleMobileFilters}
          className="flex items-center text-gray-500 hover:text-gray-700"
        >
          {showMobileFilters ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h3>
      </div>
      
      {/* Filter form */}
      <div className={`p-4 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City/Location</label>
              <input
                type="text"
                placeholder="Filter by city"
                {...register('city')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            {/* GST Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Status</label>
              <select
                {...register('has_gst')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Customers</option>
                <option value="has_gst">Has GST Number</option>
                <option value="no_gst">No GST Number</option>
              </select>
            </div>
            
            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                {...register('sortBy')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="created_at">Date Created</option>
                <option value="company_name">Company Name</option>
                <option value="contact_person">Contact Person</option>
                <option value="total_quotations">Total Quotations</option>
              </select>
            </div>
            
            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                {...register('sortOrder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="DESC">Newest First</option>
                <option value="ASC">Oldest First</option>
              </select>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:justify-end gap-2">
              <button
                type="submit"
                className="flex-1 sm:flex-none lg:flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-none lg:flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Mobile-first Customer Card Component for smaller screens
const CustomerCard = ({ customer, isSelected, onSelect, onView, onEdit }) => {
  return (
    <div className="bg-white border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(customer.id)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate" title={customer.company_name}>
              {customer.company_name}
            </h3>
            <p className="text-sm text-gray-500">{customer.contact_person}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <a 
            href={`tel:${customer.phone}`} 
            className="text-blue-600 hover:text-blue-700"
            title={customer.phone}
          >
            {customer.phone}
          </a>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <a 
            href={`mailto:${customer.email}`} 
            className="text-blue-600 hover:text-blue-700 truncate flex-1"
            title={customer.email}
          >
            {customer.email}
          </a>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate" title={customer.site_location}>{customer.site_location}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {customer.gst_number ? (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
            GST: {customer.gst_number}
          </span>
        ) : (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
            No GST
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={() => onView(customer)}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center"
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </button>
        <button
          onClick={() => onEdit(customer)}
          className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center justify-center"
        >
          <Edit className="w-4 h-4 mr-1" />
          Edit
        </button>
      </div>
    </div>
  );
};

// Main Customers Component - Mobile First
const Customers = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const {
    selectedCustomers,
    filters,
    searchTerm,
    setSelectedCustomers,
    addSelectedCustomer,
    clearSelectedCustomers,
    setFilters,
    resetFilters,
    setSearchTerm
  } = useCustomerStore();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Unified query key for better caching
  const queryKey = useMemo(() => [
    'customers', 
    debouncedSearchTerm, 
    filters.city,
    filters.has_gst,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit
  ], [debouncedSearchTerm, filters]);
  
  // Single API call for customers with optimized caching
  const { data: customersData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => {
      const queryFilters = {
        ...filters,
        search: debouncedSearchTerm || undefined
      };
      
      // Clean up undefined values
      Object.keys(queryFilters).forEach(key => {
        if (queryFilters[key] === undefined || queryFilters[key] === '') {
          delete queryFilters[key];
        }
      });
      
      return customerApi.getAllPaginated(filters.page, filters.limit, queryFilters);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
  
  // Fetch stats with reduced frequency
  const { data: statsData } = useQuery({
    queryKey: ['customer-stats'],
    queryFn: () => customerApi.getStats(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Optimized mutations
  const deleteMutation = useMutation({
    mutationFn: customerApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries(['customers']);
      queryClient.invalidateQueries(['customer-stats']);
      toast.success('Customer deleted successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete customer');
    }
  });

  const exportMutation = useMutation({
    mutationFn: (exportFilters) => customerApi.exportToExcel(exportFilters),
    onSuccess: () => {
      toast.success('Customers exported successfully');
    },
    onError: (error) => {
      toast.error('Failed to export customers');
    }
  });
  
  const customers = customersData?.customers || [];
  const pagination = customersData?.pagination || {};
  
  // Event handlers - all using useCallback to maintain references
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
    clearSelectedCustomers();
  }, [setFilters, clearSelectedCustomers]);

  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
    clearSelectedCustomers();
  }, [setFilters, clearSelectedCustomers]);

  const handleSelectAll = useCallback(() => {
    if (selectedCustomers.length === customers.length && customers.length > 0) {
      clearSelectedCustomers();
    } else {
      setSelectedCustomers(customers.map(customer => customer.id));
    }
  }, [selectedCustomers.length, customers, clearSelectedCustomers, setSelectedCustomers]);

  const handleViewCustomer = useCallback((customer) => {
    navigate(`/customers/${customer.id}`);
  }, [navigate]);

  const handleEditCustomer = useCallback((customer) => {
    navigate(`/customers/${customer.id}/edit`);
  }, [navigate]);

  const handleExport = useCallback(() => {
    const exportFilters = {};
    
    if (debouncedSearchTerm.trim()) {
      exportFilters.search = debouncedSearchTerm.trim();
    }
    
    if (filters.city.trim()) {
      exportFilters.city = filters.city.trim();
    }
    
    if (filters.has_gst !== 'all') {
      exportFilters.has_gst = filters.has_gst === 'has_gst';
    }
    
    exportMutation.mutate(exportFilters);
  }, [debouncedSearchTerm, filters.city, filters.has_gst, exportMutation]);

  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);

  // Early returns should come after ALL hooks are called
  if (isLoading && !customersData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  if (error && !customersData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Customers</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Mobile-first Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Customer Management
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Manage your customer database
                {pagination && (
                  <span className="text-xs sm:text-sm ml-2">
                    ({pagination.totalItems || 0} total)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={handleExport}
                disabled={exportMutation.isLoading}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
              >
                <Download className="w-4 h-4" />
                {exportMutation.isLoading ? 'Exporting...' : 'Export'}
              </button>
              <button
                onClick={() => navigate('/customers/new')}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Customer
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <CustomerStatsCards customersData={customersData?.customers} stats={statsData} />

        {/* Mobile-first Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search customers by name, email, phone, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            autoComplete="off"
            spellCheck="false"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Indicator */}
        {(searchTerm || debouncedSearchTerm) && (
          <div className="mb-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Search className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-800">
                  {isFetching ? (
                    'Searching...'
                  ) : (
                    <>
                      Search results for "<strong>{debouncedSearchTerm}</strong>"
                      {pagination && (
                        <span className="ml-1">
                          ({pagination.totalItems || 0} {(pagination.totalItems || 0) === 1 ? 'result' : 'results'})
                        </span>
                      )}
                    </>
                  )}
                </span>
              </div>
              <button
                onClick={() => setSearchTerm('')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear search
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <CustomerFilters onApplyFilters={applyFilters} onReset={resetFilters} />

        {/* Bulk Actions */}
        <BulkActions
          selectedCustomers={selectedCustomers}
          onExport={handleExport}
          onDeselectAll={clearSelectedCustomers}
        />

        {/* Responsive Table/Card View */}
        <div className="bg-white rounded-lg border overflow-hidden relative">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.length === customers.length && customers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST Number
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.includes(customer.id)}
                        onChange={() => addSelectedCustomer(customer.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900 truncate max-w-xs" title={customer.company_name}>
                          {customer.company_name}
                        </div>
                        <div className="text-sm text-gray-500">{customer.contact_person}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <a 
                            href={`tel:${customer.phone}`}
                            className="text-blue-600 hover:text-blue-700"
                            title={customer.phone}
                          >
                            {customer.phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <a 
                            href={`mailto:${customer.email}`}
                            className="text-blue-600 hover:text-blue-700 truncate max-w-xs"
                            title={customer.email}
                          >
                            {customer.email}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-xs" title={customer.site_location}>
                          {customer.site_location}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.gst_number ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md">
                          {customer.gst_number}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                          No GST
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditCustomer(customer)}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {customers.length > 0 && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
                  </span>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedCustomers.length === customers.length && customers.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200">
              {customers.map((customer) => (
                <div key={customer.id} className="p-4">
                  <CustomerCard
                    customer={customer}
                    isSelected={selectedCustomers.includes(customer.id)}
                    onSelect={addSelectedCustomer}
                    onView={handleViewCustomer}
                    onEdit={handleEditCustomer}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Loading state overlay - Only on table content, not entire page */}
          {isFetching && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">
                  {searchTerm ? 'Searching...' : 'Loading...'}
                </span>
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {customers.length === 0 && !isFetching && (
            <div className="text-center py-12 px-4">
              <div className="max-w-sm mx-auto">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                  {searchTerm || filters.city || filters.has_gst !== 'all'
                    ? 'No customers match your current search and filter criteria. Try adjusting your filters or search terms.'
                    : 'No customers have been added yet. Add your first customer to start managing your database.'}
                </p>
                {(searchTerm || filters.city || filters.has_gst !== 'all') && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </button>
                )}
                {(!searchTerm && !filters.city && filters.has_gst === 'all') && (
                  <button
                    onClick={() => navigate('/customers/new')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Customer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {customers.length > 0 && pagination && (
          <div className="mt-6">
            <Pagination
              pagination={{
                current_page: pagination.currentPage || 1,
                per_page: pagination.limit || filters.limit,
                total: pagination.totalItems || 0,
                total_pages: pagination.totalPages || 1,
                has_prev_page: pagination.hasPrevPage || false,
                has_next_page: pagination.hasNextPage || false,
                from: pagination.offset ? pagination.offset + 1 : 1,
                to: pagination.offset ? Math.min(pagination.offset + customers.length, pagination.totalItems || 0) : customers.length,
              }}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}

        {/* Loading Overlay for Actions */}
        {(deleteMutation.isPending || exportMutation.isPending) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-4 shadow-xl min-w-[300px]">
              <LoadingSpinner size="lg" />
              <div>
                <div className="text-gray-900 font-medium">
                  {deleteMutation.isPending && 'Deleting Customer'}
                  {exportMutation.isPending && 'Exporting Customers'}
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  {deleteMutation.isPending && 'Please wait while we delete the customer...'}
                  {exportMutation.isPending && 'Please wait while we prepare your export...'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;