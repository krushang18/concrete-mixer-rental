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
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Menu,
  Building2,
  ChevronDown // Added
} from 'lucide-react';
import { queryApi } from '../../services/queryApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import SearchResultsIndicator from '../../components/common/SearchResultsIndicator';
import QueryDetailsModal from './QueryDetailsModal';

// Zustand store - simplified without batch operations
const useQueryStore = create((set) => ({
  filters: {
    status: '',
    page: 1,
    limit: 10
  },
  searchTerm: '',
  showMobileFilters: false,
  
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      status: '',
      page: 1,
      limit: 10
    },
    searchTerm: ''
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters }))
}));

// Simplified filter schema - only status
const filterSchema = yup.object({
  status: yup.string()
});

// Debounce hook
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
    color: 'bg-blue-50 text-blue-700 border-blue-200', 
    icon: AlertCircle
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-primary-50 text-primary-700 border-primary-200',
    icon: Clock
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-50 text-green-700 border-green-200',
    icon: CheckCircle2
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: X
  }
};

// Status Badge
const StatusBadge = ({ status, size = 'sm' }) => {
  const config = statusConfig[status] || statusConfig.new;
  const Icon = config.icon;
  
  const sizeClasses = {
    xs: 'px-2.5 py-0.5 text-[10px] h-6',
    sm: 'px-3 py-1 text-xs h-7',
    md: 'px-4 py-1.5 text-sm h-8'
  };
  
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-medium border whitespace-nowrap ${config.color} ${sizeClasses[size]}`}>
      <Icon className={`${size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} mr-1.5 flex-shrink-0`} />
      {config.label}
    </span>
  );
};

// Minimal Filter Component
// Minimal Filter Component
const QueryFilters = ({ onApplyFilters, onReset }) => {
  const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useQueryStore();
  
  const { register, handleSubmit, reset } = useForm({
    resolver: yupResolver(filterSchema),
    defaultValues: filters,
    mode: 'onChange'
  });

  const onSubmit = (data) => {
    setFilters(data);
    onApplyFilters();
    toggleMobileFilters();
  };

  const handleReset = () => {
    reset({ status: '' });
    onReset();
    toggleMobileFilters();
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
      {/* Mobile Header */}
      <div 
        onClick={toggleMobileFilters}
        className="flex items-center justify-between p-4 lg:hidden bg-gray-50/50 cursor-pointer active:bg-gray-100 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-700 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-primary-600" />
          Filter Queries
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`} />
      </div>
      
      {/* Filter Content */}
      <div className={`p-4 ${showMobileFilters ? 'block border-t border-gray-100' : 'hidden lg:block'}`}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col lg:flex-row gap-4 items-center">
             {/* Status Select */}
             <div className="w-full lg:w-64 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <Filter className="h-4 w-4 text-gray-400" />
               </div>
               <select
                  {...register('status')}
                  className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 transition-all appearance-none cursor-pointer hover:bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <button
                type="submit"
                className="flex-1 lg:flex-none bg-primary-600 text-white px-5 py-2.5 rounded-lg hover:bg-primary-700 transition-all shadow-sm active:scale-[0.98] text-sm font-medium flex items-center justify-center"
              >
                Apply
              </button>
              
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 lg:flex-none px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// Minimal Mobile Query Card
const QueryCard = ({ query, onView }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div 
      onClick={() => onView(query)}
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer group"
    >
      <div className="flex justify-between items-start mb-3 gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base mb-1 leading-tight line-clamp-2" title={query.company_name}>
            {query.company_name}
          </h3>
          <p className="text-xs text-gray-500 flex items-center font-medium mt-1">
             <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-mono text-[10px] mr-2">
               QRY-{String(query.id).padStart(4, '0')}
             </span>
             {formatDate(query.created_at)}
          </p>
        </div>
        <div className="flex-shrink-0">
           <StatusBadge status={query.status} size="xs" />
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-start text-sm text-gray-600">
          <div className="w-5 h-5 mt-0.5 rounded-full bg-primary-50 flex items-center justify-center mr-2.5 flex-shrink-0">
             <MapPin className="w-3 h-3 text-primary-600" />
          </div>
          <span className="line-clamp-2 leading-snug" title={query.site_location}>
            {query.site_location}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
           <div className="w-5 h-5 rounded-full bg-secondary-50 flex items-center justify-center mr-2.5 flex-shrink-0">
             <Phone className="w-3 h-3 text-secondary-600" />
          </div>
          <span className="font-medium text-gray-700">
            {query.contact_number}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-50 flex justify-end">
         <span className="text-xs font-semibold text-primary-600 flex items-center group-hover:text-primary-700 transition-colors">
            View Details <Eye className="w-3 h-3 ml-1" />
         </span>
      </div>
    </div>
  );
};

// Main Query Management Component
const QueryManagementPage = () => {
  const queryClient = useQueryClient();
  const {
    filters,
    searchTerm,
    setFilters,
    resetFilters,
    setSearchTerm
  } = useQueryStore();
  
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Query key
  const queryKey = useMemo(() => [
    'queries',
    debouncedSearchTerm,
    filters.status,
    filters.page,
    filters.limit
  ], [debouncedSearchTerm, filters]);
  
  // Fetch queries
  const { data: queriesData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => queryApi.getQueries({
      ...filters,
      search: debouncedSearchTerm || undefined
    }),
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
  
  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => queryApi.updateQueryStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['queries']);
      toast.success('Query status updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  });
  
  const queries = queriesData?.data || [];
  const pagination = queriesData?.pagination;
  
  // Event handlers
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
  }, [setFilters]);
  
  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
  }, [setFilters]);
  
  const handleViewQuery = useCallback((query) => {
    setSelectedQuery(query);
    setIsModalOpen(true);
  }, []);
  
  const handleStatusUpdate = useCallback(async (queryId, newStatus) => {
    await updateStatusMutation.mutateAsync({ id: queryId, status: newStatus });
    
    // Update selected query if it's the one being updated
    if (selectedQuery?.id === queryId) {
      setSelectedQuery(prev => ({ ...prev, status: newStatus }));
    }
  }, [updateStatusMutation, selectedQuery]);
  
  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
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
  
  if (error && !queriesData) {
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
        {/* Header */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                Query Management
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Manage customer inquiries and requests
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
        
        {/* Search Bar */}
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by company name, email, location, or phone..."
          isFetching={isFetching}
          className="mb-4"
        />
        
        {/* Search Results */}
        <SearchResultsIndicator
          searchTerm={searchTerm}
          debouncedSearchTerm={debouncedSearchTerm}
          isFetching={isFetching}
          resultCount={pagination?.total}
          onClear={() => setSearchTerm('')}
        />
        
        {/* Filters */}
        <QueryFilters onApplyFilters={applyFilters} onReset={resetFilters} />
        
        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3 mb-4">
          {queries.length === 0 ? (
            <div className="bg-white rounded-lg border p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No queries found</p>
            </div>
          ) : (
            queries.map(query => (
              <QueryCard
                key={query.id}
                query={query}
                onView={handleViewQuery}
              />
            ))
          )}
        </div>
        
        {/* Desktop Table View - Optimized Layout */}
        <div className="hidden lg:block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[240px]">
                      Company & ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[220px]">
                      Contact Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[140px]">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-[120px]">
                      Date
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-[100px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {queries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center bg-gray-50/50">
                        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No queries match your search</p>
                      </td>
                    </tr>
                  ) : (
                    queries.map(query => (
                      <tr key={query.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1" title={query.company_name}>
                              {query.company_name}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 w-fit">
                              QRY-{String(query.id).padStart(4, '0')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center text-sm text-gray-700">
                              <Phone className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
                              <a href={`tel:${query.contact_number}`} className="hover:text-primary-600 transition-colors">
                                {query.contact_number}
                              </a>
                            </div>
                            <div className="flex items-center text-sm text-gray-700">
                              <Mail className="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" />
                              <a href={`mailto:${query.email}`} className="truncate hover:text-primary-600 transition-colors max-w-[180px]" title={query.email}>
                                {query.email}
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-start text-sm text-gray-600">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2" title={query.site_location}>
                              {query.site_location}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            <StatusBadge status={query.status} />
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-sm text-gray-500 whitespace-nowrap">
                          {formatDate(query.created_at).split(',')[0]}
                          <div className="text-xs text-gray-400 mt-0.5">
                            {formatDate(query.created_at).split(',')[1]}
                          </div>
                        </td>
                        <td className="px-6 py-4 align-top text-right">
                          <button
                            onClick={() => handleViewQuery(query)}
                            className="text-gray-400 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-all opacity-0 group-hover:opacity-100"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Pagination */}
        {pagination && (
          <div className="mt-6">
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}
      </div>
      
      {/* Query Details Modal */}
      <QueryDetailsModal
        query={selectedQuery}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdate={handleStatusUpdate}
        isUpdating={updateStatusMutation.isLoading}
      />
    </div>
  );
};

export default QueryManagementPage;