import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import { 
  Search, 
  Filter, 
  Eye, 
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
  MoreVertical,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Users,
  Plus,
  ArrowUpDown,
  X,
  Menu
} from 'lucide-react';
import { queryApi } from '../../services/queryApi';
import QueryDetailsModal from '../../components/queries/QueryDetailsModal';
import Pagination from '../../components/common/Pagination';

// Zustand store for managing component state
const useQueryStore = create((set, get) => ({
  selectedQueries: [],
  filters: {
    status: '',
    startDate: '',
    endDate: '',
    sortBy: 'created_at',
    sortOrder: 'DESC',
    page: 1,
    limit: 10
  },
  searchTerm: '',
  showMobileFilters: false,
  
  // Actions
  setSelectedQueries: (queries) => set({ selectedQueries: queries }),
  addSelectedQuery: (queryId) => set((state) => ({
    selectedQueries: state.selectedQueries.includes(queryId) 
      ? state.selectedQueries.filter(id => id !== queryId)
      : [...state.selectedQueries, queryId]
  })),
  clearSelectedQueries: () => set({ selectedQueries: [] }),
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      status: '',
      startDate: '',
      endDate: '',
      sortBy: 'created_at',
      sortOrder: 'DESC',
      page: 1,
      limit: 10
    },
    searchTerm: '',
    selectedQueries: []
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters }))
}));

// Validation schema for filters
const filterSchema = yup.object({
  status: yup.string(),
  startDate: yup.date().nullable(),
  endDate: yup.date().nullable().min(yup.ref('startDate'), 'End date must be after start date'),
  sortBy: yup.string().oneOf(['created_at', 'updated_at', 'company_name', 'status']),
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

// Status configurations
const statusConfig = {
  new: {
    label: 'New',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: AlertCircle,
    priority: 'high'
  },
  pending: {
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    priority: 'medium'
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: Clock,
    priority: 'medium'
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: CheckCircle2,
    priority: 'low'
  }
};

// Mobile-first Status Badge Component
const StatusBadge = ({ status, size = 'sm' }) => {
  const config = statusConfig[status] || statusConfig.new;
  const Icon = config.icon;
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${config.color} ${sizeClasses[size]}`}>
      <Icon className={`${size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
      {config.label}
    </span>
  );
};

// Mobile-optimized Stats Cards
const QueryStatsCards = ({ queriesData, stats }) => {
  let calculatedStats;
  if (stats?.success && stats?.data) {
    const backendStats = stats.data;
    calculatedStats = {
      total: backendStats.totalQueries || 0,
      recent: backendStats.recentQueries || 0,
      today: backendStats.todayQueries || 0,
      week: backendStats.weekQueries || 0
    };
  } else {
    calculatedStats = { 
      total: queriesData?.pagination?.total || 0, 
      recent: 0, 
      today: 0, 
      week: 0 
    };
  }
  
  const cards = [
    { title: 'Total', value: calculatedStats.total, color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Users },
    { title: 'Recent', value: calculatedStats.recent, color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Clock },
    { title: 'Today', value: calculatedStats.today, color: 'text-green-600', bgColor: 'bg-green-50', icon: Calendar },
    { title: 'Week', value: calculatedStats.week, color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertCircle }
  ];
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`${card.bgColor} rounded-lg p-3 sm:p-4 transform hover:scale-105 transition-transform duration-200`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">{card.title}</p>
                <p className={`text-lg sm:text-2xl font-bold ${card.color}`}>{card.value}</p>
              </div>
              <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${card.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Mobile-first Bulk Actions Component
const BulkActions = ({ selectedQueries, onBulkStatusUpdate, onDeselectAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (selectedQueries.length === 0) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-blue-800 font-medium text-sm">
            {selectedQueries.length} selected
          </span>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
            >
              Actions
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            
            {isOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 sm:right-auto sm:w-48 bg-white border rounded-lg shadow-lg z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onBulkStatusUpdate('in_progress');
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Mark as In Progress
                  </button>
                  <button
                    onClick={() => {
                      onBulkStatusUpdate('completed');
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Mark as Completed
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={onDeselectAll}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm self-start sm:self-center"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
};

// Mobile-first Filters Component with React Hook Form
const QueryFilters = ({ onApplyFilters, onReset }) => {
  const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useQueryStore();
  
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
      status: '',
      startDate: '',
      endDate: '',
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
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Status</option>
                <option value="new">New</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                {...register('startDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {errors.startDate && (
                <p className="text-red-500 text-xs mt-1">{errors.startDate.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {errors.endDate && (
                <p className="text-red-500 text-xs mt-1">{errors.endDate.message}</p>
              )}
            </div>
            
            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                {...register('sortBy')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="created_at">Date Created</option>
                <option value="updated_at">Last Updated</option>
                <option value="company_name">Company Name</option>
                <option value="status">Status</option>
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

// Mobile-optimized Query Actions Dropdown
const QueryActionsDropdown = ({ query, onStatusUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const actions = [
    { label: 'Mark as In Progress', action: () => onStatusUpdate(query.id, 'in_progress'), show: query.status !== 'in_progress' },
    { label: 'Mark as Completed', action: () => onStatusUpdate(query.id, 'completed'), show: query.status !== 'completed' },
    { label: 'Mark as New', action: () => onStatusUpdate(query.id, 'new'), show: query.status !== 'new' }
  ].filter(action => action.show);
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-10 min-w-48">
          <div className="py-1">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile-first Query Card Component for smaller screens
const QueryCard = ({ query, isSelected, onSelect, onViewDetails, onStatusUpdate }) => {
  // Format date directly since this is inside a component, not a callback
  const date = new Date(query.created_at);
  const dateStr = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(query.id)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate" title={query.company_name}>
              {query.company_name}
            </h3>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate" title={query.site_location}>
                {query.site_location}
              </span>
            </p>
          </div>
        </div>
        <QueryActionsDropdown query={query} onStatusUpdate={onStatusUpdate} />
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge status={query.status} size="xs" />
        <div className="text-xs text-gray-500 text-right">
          <div>{dateStr}</div>
          <div>{timeStr}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <a 
            href={`mailto:${query.email}`} 
            className="text-blue-600 hover:text-blue-700 truncate flex-1"
            title={query.email}
          >
            {query.email}
          </a>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <a 
            href={`tel:${query.contact_number}`} 
            className="text-blue-600 hover:text-blue-700"
            title={query.contact_number}
          >
            {query.contact_number}
          </a>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate" title={query.duration}>{query.duration}</span>
        </div>
      </div>

      <button
        onClick={() => onViewDetails(query)}
        className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center"
      >
        <Eye className="w-4 h-4 mr-1" />
        View Details
      </button>
    </div>
  );
};

// Main Query Management Component - Mobile First
const QueryManagementPage = () => {
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const queryClient = useQueryClient();
  const {
    selectedQueries,
    filters,
    searchTerm,
    setSelectedQueries,
    addSelectedQuery,
    clearSelectedQueries,
    setFilters,
    resetFilters,
    setSearchTerm
  } = useQueryStore();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Unified query key for better caching
  const queryKey = useMemo(() => [
    'queries', 
    debouncedSearchTerm, 
    filters.status,
    filters.startDate,
    filters.endDate,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit
  ], [debouncedSearchTerm, filters]);
  
  // Single API call for queries with optimized caching for smooth search
  const { data: queriesData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => queryApi.getQueries({
      ...filters,
      search: debouncedSearchTerm || undefined
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    keepPreviousData: true, // Keep showing previous results while new ones load
    refetchOnWindowFocus: false,
    enabled: true, // Always enabled for immediate search feedback
    placeholderData: (previousData) => previousData, // Show previous data during search
  });
  
  // Fetch stats with reduced frequency
  const { data: statsData } = useQuery({
    queryKey: ['query-stats'],
    queryFn: () => queryApi.getQueryStats(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Optimized mutations with optimistic updates
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => queryApi.updateQueryStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(queryKey);
      
      // Snapshot previous value
      const previousQueries = queryClient.getQueryData(queryKey);
      
      // Optimistically update
      if (previousQueries) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.map(query => 
            query.id === id ? { ...query, status, updated_at: new Date().toISOString() } : query
          )
        }));
      }
      
      return { previousQueries };
    },
    onSuccess: () => {
      toast.success('Query status updated successfully');
      // Invalidate stats after successful update
      queryClient.invalidateQueries(['query-stats']);
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousQueries) {
        queryClient.setQueryData(queryKey, context.previousQueries);
      }
      toast.error(error.response?.data?.message || 'Failed to update query status');
    }
  });
  
  // Bulk update with optimistic updates
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ queryIds, status }) => queryApi.bulkUpdateQueries(queryIds, { status }),
    onMutate: async ({ queryIds, status }) => {
      await queryClient.cancelQueries(queryKey);
      const previousQueries = queryClient.getQueryData(queryKey);
      
      if (previousQueries) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.map(query => 
            queryIds.includes(query.id) ? { ...query, status, updated_at: new Date().toISOString() } : query
          )
        }));
      }
      
      return { previousQueries };
    },
    onSuccess: () => {
      toast.success('Queries updated successfully');
      clearSelectedQueries();
      queryClient.invalidateQueries(['query-stats']);
    },
    onError: (error, variables, context) => {
      if (context?.previousQueries) {
        queryClient.setQueryData(queryKey, context.previousQueries);
      }
      toast.error(error.response?.data?.message || 'Failed to update queries');
    }
  });
  
  // Extract queries and pagination data
  const queries = queriesData?.data || [];
  const pagination = queriesData?.pagination;
  
  // Event handlers - all using useCallback to maintain references
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
    clearSelectedQueries();
  }, [setFilters, clearSelectedQueries]);
  
  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
    clearSelectedQueries();
  }, [setFilters, clearSelectedQueries]);
  
  const handleStatusUpdate = useCallback((queryId, newStatus) => {
    updateStatusMutation.mutate({ id: queryId, status: newStatus });
  }, [updateStatusMutation]);
  
  const handleBulkStatusUpdate = useCallback((newStatus) => {
    bulkUpdateMutation.mutate({ queryIds: selectedQueries, status: newStatus });
  }, [bulkUpdateMutation, selectedQueries]);
  
  const handleViewDetails = useCallback((query) => {
    setSelectedQuery(query);
    setShowDetailsModal(true);
  }, []);
  
  const handleSelectAll = useCallback(() => {
    if (selectedQueries.length === queries.length && queries.length > 0) {
      clearSelectedQueries();
    } else {
      setSelectedQueries(queries.map(q => q.id));
    }
  }, [selectedQueries.length, queries, clearSelectedQueries, setSelectedQueries]);
  
  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);
  
  // Early returns should come after ALL hooks are called
  if (isLoading && !queriesData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading queries...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Queries</h3>
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
                Query Management
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Manage customer inquiries and track responses
                {pagination && (
                  <span className="text-xs sm:text-sm ml-2">
                    ({pagination.total} total)
                  </span>
                )}
              </p>
            </div>
            
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <QueryStatsCards queriesData={queriesData} stats={statsData} />
        
        {/* Mobile-first Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by company name, email, location, or phone..."
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
                          ({pagination.total} {pagination.total === 1 ? 'result' : 'results'})
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
        <QueryFilters onApplyFilters={applyFilters} onReset={resetFilters} />
        
        {/* Bulk Actions */}
        <BulkActions
          selectedQueries={selectedQueries}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onDeselectAll={clearSelectedQueries}
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
                      checked={selectedQueries.length === queries.length && queries.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Information
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queries.map((query) => {
                  // Format date outside of useMemo since it's inside a callback
                  const date = new Date(query.created_at);
                  const dateStr = date.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  const timeStr = date.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  });
                  
                  return (
                    <tr key={query.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedQueries.includes(query.id)}
                          onChange={() => addSelectedQuery(query.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={query.company_name}>
                            {query.company_name}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-xs" title={query.site_location}>
                              {query.site_location}
                            </span>
                          </p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="text-sm text-gray-900 flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                            <a 
                              href={`mailto:${query.email}`} 
                              className="text-blue-600 hover:text-blue-700 truncate max-w-xs"
                              title={query.email}
                            >
                              {query.email}
                            </a>
                          </p>
                          <p className="text-sm text-gray-900 flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                            <a 
                              href={`tel:${query.contact_number}`} 
                              className="text-blue-600 hover:text-blue-700"
                              title={query.contact_number}
                            >
                              {query.contact_number}
                            </a>
                          </p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-900" title={query.duration}>
                            {query.duration}
                          </span>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <StatusBadge status={query.status} />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <p>{dateStr}</p>
                          <sub className="text-xs text-gray-500">{timeStr}</sub>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleViewDetails(query)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <QueryActionsDropdown
                            query={query}
                            onStatusUpdate={handleStatusUpdate}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden">
            {queries.length > 0 && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {queries.length} {queries.length === 1 ? 'query' : 'queries'}
                  </span>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedQueries.length === queries.length && queries.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200">
              {queries.map((query) => (
                <div key={query.id} className="p-4">
                  <QueryCard
                    query={query}
                    isSelected={selectedQueries.includes(query.id)}
                    onSelect={addSelectedQuery}
                    onViewDetails={handleViewDetails}
                    onStatusUpdate={handleStatusUpdate}
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
          {queries.length === 0 && !isFetching && (
            <div className="text-center py-12 px-4">
              <div className="max-w-sm mx-auto">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No queries found</h3>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                  {searchTerm || filters.status || filters.startDate || filters.endDate 
                    ? 'No queries match your current search and filter criteria. Try adjusting your filters or search terms.' 
                    : 'No customer queries have been submitted yet. Queries will appear here once customers start submitting inquiries.'}
                </p>
                {(searchTerm || filters.status || filters.startDate || filters.endDate) && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {queries.length > 0 && pagination && (
          <div className="mt-6">
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}
        
        {/* Query Details Modal */}
        {selectedQuery && (
          <QueryDetailsModal
            query={selectedQuery}
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedQuery(null);
            }}
            onStatusUpdate={handleStatusUpdate}
            isUpdating={updateStatusMutation.isPending}
          />
        )}
      </div>
    </div>
  );
};

export default QueryManagementPage;