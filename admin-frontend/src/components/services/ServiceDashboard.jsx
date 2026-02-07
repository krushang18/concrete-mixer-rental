import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, Plus, Filter, Download, Eye, Edit, Trash2, 
  AlertCircle, CheckCircle, Clock, Search, RefreshCw,
  BarChart3, Users, Wrench, X, Menu,
  MoreVertical, Settings, ChevronDown, MapPin, User, FileText
} from 'lucide-react';
import { serviceApi, serviceUtils } from '../../services/serviceApi';
import { machineApi } from '../../services/machineApi'; // Import machineApi
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';
import SearchResultsIndicator from '../../components/common/SearchResultsIndicator';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Zustand store for managing component state
const useServiceStore = create((set, get) => ({
  // selectedServices removed

  filters: {
    machine_id: '',
    start_date: '',
    end_date: '',
    site_location: '',
    page: 1,
    limit: 20
  },
  searchTerm: '',
  showMobileFilters: false,
  
  // Actions
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      machine_id: '',
      start_date: null,
      end_date: null,
      page: 1,
      limit: 20
    },
    searchTerm: ''
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters }))
}));

const filterSchema = yup.object().shape({
  machine_id: yup.string().nullable(),
  start_date: yup.date()
    .nullable()
    .transform((curr, orig) => orig === '' ? null : curr)
    .when('end_date', {
      is: val => val != null,
      then: () => yup.date().nullable().required('Start date is required when End date is selected')
    }),
  end_date: yup.date()
    .nullable()
    .transform((curr, orig) => orig === '' ? null : curr)
    .min(yup.ref('start_date'), 'End date must be after start date')
    .when('start_date', {
      is: val => val != null,
      then: () => yup.date().nullable().required('End date is required when Start date is selected')
    })
}, [['start_date', 'end_date']]);

// Custom hook for debouncing
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// Mobile-first Status Badge Component
const StatusBadge = ({ lastServiceDate, size = 'sm' }) => {
  const status = serviceUtils.getServiceStatus(lastServiceDate);
  
  const badgeColors = {
    current: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
    due: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    overdue: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    never: "bg-slate-50 text-slate-600 ring-1 ring-slate-600/20"
  };

  const badgeClass = badgeColors[status.status] || badgeColors.never;
  
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[10px]',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };
  
  const getIcon = () => {
    if (status.status === 'current') return CheckCircle;
    if (status.status === 'due') return Clock;
    return AlertCircle;
  };
  
  const Icon = getIcon();
  
  return (
    <span className={`inline-flex items-center rounded-md font-medium ${badgeClass} ${sizeClasses[size]} whitespace-nowrap`}>
      <Icon className={`${size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5'} mr-1.5`} />
      {status.message}
    </span>
  );
};

// Mobile-first Filters Component with React Hook Form
const ServiceFilters = ({ onApplyFilters, onReset }) => {
  const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useServiceStore();
  
  const { register, handleSubmit, reset, formState: { errors, isValid } } = useForm({
    resolver: yupResolver(filterSchema),
    defaultValues: filters,
    mode: 'onChange'
  });

  const onSubmit = (data) => {
    setFilters(data);
    onApplyFilters();
    toggleMobileFilters(); // Close mobile filters after apply
  };

  const { data: machinesData } = useQuery({
    queryKey: ['machines-list'],
    queryFn: () => machineApi.getAll({ limit: 1000 }), // Get all machines for dropdown
    staleTime: 1000 * 60 * 15 // 15 minutes
  });

  const machines = machinesData?.data || [];

  const handleReset = () => {
    reset({
      machine_id: '',
      start_date: null,
      end_date: null
    });
    onReset();
    toggleMobileFilters(); // Close mobile filters after reset
  };
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 overflow-hidden">
      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between p-4 lg:hidden bg-gray-50/50">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-blue-600" />
          Filter Services
        </h3>
        <button
          onClick={toggleMobileFilters}
          className="flex items-center text-gray-400 hover:text-gray-600"
        >
          {showMobileFilters ? <ChevronDown className="w-4 h-4 rotate-180" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Desktop header */}
      <div className="hidden lg:flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900 flex items-center">
          <Filter className="w-4 h-4 mr-2 text-blue-600" />
          Service Filters
        </h3>
      </div>
      
      {/* Filter form */}
      <div className={`p-4 ${showMobileFilters ? 'block border-t border-gray-100' : 'hidden lg:block'}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                {...register('start_date')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 hover:bg-white transition-colors"
                placeholder="Start Date"
              />
              {errors.start_date && (
                <p className="text-red-500 text-xs mt-1">{errors.start_date.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                {...register('end_date')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 hover:bg-white transition-colors"
              />
              {errors.end_date && (
                <p className="text-red-500 text-xs mt-1">{errors.end_date.message}</p>
              )}
            </div>
            
            {/* Machine Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Machine</label>
              <div className="relative">
                <select
                  {...register('machine_id')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50 hover:bg-white transition-colors appearance-none"
                >
                  <option value="">All Machines</option>
                  {machines.map(machine => (
                    <option key={machine.id} value={machine.id}>
                      {machine.machine_number} - {machine.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:justify-end gap-2">
              <button
                type="submit"
                disabled={!isValid}
                className="flex-1 sm:flex-none lg:flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Apply Filters
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-none lg:flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
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

// Mobile-optimized Service Actions Dropdown
const ServiceActionsDropdown = ({ service, onView, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const actions = [
    { label: 'View Details', action: () => onView(service.id), icon: Eye },
    { label: 'Edit Service', action: () => onEdit(service.id), icon: Edit },
    { label: 'Delete', action: () => onDelete(service.id), icon: Trash2, danger: true }
  ];
  
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
                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center ${
                  action.danger 
                    ? 'text-red-700 hover:bg-red-50' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <action.icon className="w-4 h-4 mr-2" />
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile-first Service Card Component for smaller screens
const ServiceCard = ({ service, onView, onEdit, onDelete }) => {
  // Format date
  const date = new Date(service.service_date);
  const dateStr = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 group">
      {/* Header with Title and Date */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="font-semibold text-gray-900 truncate text-base" title={service.machine_name || `Machine ${service.machine_id}`}>
            {service.machine_name || `Machine ${service.machine_id}`}
          </h3>
          <div className="flex items-center text-xs text-gray-500 mt-1">
             <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
             {dateStr}
          </div>
        </div>
        <ServiceActionsDropdown
          service={service}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* Stats Grid - Cleaner Layout */}
      <div className="grid grid-cols-2 gap-3 mb-4 p-2.5 bg-gray-50/50 rounded-lg border border-gray-100/50">
        <div className="flex flex-col justify-center">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Status</span>
          <div>
            <StatusBadge lastServiceDate={service.service_date} size="xs" />
          </div>
        </div>
        <div className="flex flex-col justify-center items-end border-l border-gray-100 pl-3">
          <span className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Engine Hours</span>
          <div className="font-medium text-gray-900 text-sm flex items-center">
             <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
             {serviceUtils.formatEngineHours(service.engine_hours)}
          </div>
        </div>
      </div>

      {/* Info Rows */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <div className="w-8 flex justify-center">
            <User className="w-4 h-4 text-blue-400" />
          </div>
          <span className="truncate flex-1 font-medium text-gray-700" title={service.operator}>
            {service.operator || 'Unknown Operator'}
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <div className="w-8 flex justify-center">
            <MapPin className="w-4 h-4 text-blue-400" />
          </div>
          <span className="truncate flex-1" title={service.site_location || 'Not specified'}>
            {service.site_location || 'Not specified'}
          </span>
        </div>
        
        {/* Service Tags - Simplified */}
        {service.services && service.services.length > 0 && (
          <div className="flex items-start pt-1">
            <div className="w-8 flex justify-center mt-0.5">
               <Wrench className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex flex-wrap gap-1.5 flex-1">
              {service.services.slice(0, 2).map((svc, index) => (
                <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                  {svc.name}
                </span>
              ))}
              {service.services.length > 2 && (
                <span className="text-xs text-gray-400 px-1 py-0.5">
                  +{service.services.length - 2}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => onView(service.id)}
        className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 border border-blue-200 text-blue-600 py-2 px-3 rounded-lg transition-all duration-200 text-sm flex items-center justify-center font-medium bg-white"
      >
        <Eye className="w-4 h-4 mr-2" />
        View Details
      </button>
    </div>
  );
};

// Main Service Dashboard Component - Mobile First
const ServiceDashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    filters,
    searchTerm,
    setFilters,
    resetFilters,
    setSearchTerm
  } = useServiceStore();
  
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    confirmVariant: 'danger',
    onConfirm: null
  });
  
  const [searchParams] = useSearchParams();
  const machineIdParam = searchParams.get('machine');

  // Fetch machine details if ID is present
  const { data: machineData } = useQuery({
    queryKey: ['machine', machineIdParam],
    queryFn: () => machineApi.getById(machineIdParam),
    enabled: Boolean(machineIdParam)
  });

  // Initialize filters from URL - Force clear other filters if coming from a specific machine link
  React.useEffect(() => {
    if (machineIdParam) {
      // Reset everything first to ensure we see all records for this machine
      resetFilters();
      setSearchTerm('');
      
      // Then apply the machine filter
      // We use a timeout to let the reset propagate or just set it cleanly
      // Since zustand is sync, this should be fine
      setFilters({ machine_id: machineIdParam });
    }
  }, [machineIdParam, resetFilters, setFilters, setSearchTerm]);

  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Unified query key for better caching
  const queryKey = useMemo(() => [
    'services', 
    debouncedSearchTerm, 
    filters.start_date,
    filters.end_date,
    filters.machine_id,
    filters.page,
    filters.limit
  ], [debouncedSearchTerm, filters]);
  
  // Single API call for services with optimized caching
  const { data: servicesData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => serviceApi.getAll({
      ...filters,
      search: debouncedSearchTerm || undefined
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    enabled: true,
    placeholderData: (previousData) => previousData,
  });
  
  
  // Optimized delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id) => serviceApi.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(queryKey);
      const previousServices = queryClient.getQueryData(queryKey);
      
      if (previousServices) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.filter(service => service.id !== id)
        }));
      }
      
      return { previousServices };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['service-stats']);
    },
    onError: (error, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(queryKey, context.previousServices);
      }
    }
  });
  
  // Extract services and pagination data
  const services = servicesData?.data || [];
  const pagination = servicesData?.pagination;
  
  // Event handlers - all using useCallback to maintain references
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
  }, [setFilters]);
  
  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
  }, [setFilters]);
  
  const handleDelete = useCallback((serviceId) => {
    setConfirmDialog({
      open: true,
      title: 'Delete Service Record',
      message: 'Are you sure you want to delete this service record? This action cannot be undone.',
      confirmVariant: 'danger',
      onConfirm: () => {
        deleteMutation.mutate(serviceId);
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  }, [deleteMutation]);
  
  const handleView = useCallback((serviceId) => {
    navigate(`/services/${serviceId}`);
  }, [navigate]);
  
  const handleEdit = useCallback((serviceId) => {
    navigate(`/services/${serviceId}/edit`);
  }, [navigate]);
  
  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);
  
  // Early returns after all hooks
  if (isLoading && !servicesData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoadingSpinner size="large" text="Loading services..." />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Services</h3>
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
                {filters.machine_id 
                  ? (machineData?.data?.name ? `Service Records for ${machineData.data.name}` : `Service Records for Machine ${filters.machine_id}`)
                  : 'Service Records'}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Track and manage machine maintenance
                {pagination && (
                  <span className="text-xs sm:text-sm ml-2">
                    ({pagination.total} total)
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => navigate('/services/categories')}
                className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Categories
              </button>
              {/* <button
                onClick={handleExport}
                className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button> */}
              <button
                onClick={() => navigate('/services/new')}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Service Log
              </button>
            </div>
          </div>
        </div>
        
        
        {/* Search Bar */}
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Search by machine, operator, location..."
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
        <ServiceFilters onApplyFilters={applyFilters} onReset={resetFilters} />
        
        {/* Responsive Table/Card View */}
        <div className="bg-white rounded-lg border overflow-hidden relative">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine & Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operator & Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Engine Hours
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Services Performed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {services.map((service) => {
                  const date = new Date(service.service_date);
                  const dateStr = date.toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                  
                  return (
                    <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={service.machine_name || `Machine ${service.machine_id}`}>
                            {service.machine_name || `Machine ${service.machine_id}`}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span>{dateStr}</span>
                          </p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={service.operator}>
                            {service.operator}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center mt-1">
                            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span className="truncate max-w-xs" title={service.site_location || 'Not specified'}>
                              {service.site_location || 'Not specified'}
                            </span>
                          </p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {serviceUtils.formatEngineHours(service.engine_hours)}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {service.services && service.services.length > 0 ? (
                            <div className="space-y-1">
                              {service.services.slice(0, 2).map((svc, index) => (
                                <div key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {svc.name}
                                </div>
                              ))}
                              {service.services.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{service.services.length - 2} more
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">No services recorded</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge lastServiceDate={service.service_date} />
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleView(service.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <ServiceActionsDropdown
                            service={service}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
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
          <div className="lg:hidden space-y-4 pt-4">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
          
          {/* Loading state overlay */}
          {isFetching && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <LoadingSpinner size="medium" text={searchTerm ? 'Searching...' : 'Loading...'} />
            </div>
          )}
          
          {/* Empty state */}
          {services.length === 0 && !isFetching && (
            <div className="text-center py-12 px-4">
              <div className="max-w-sm mx-auto">
                <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No service records found</h3>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                  {searchTerm || filters.start_date || filters.end_date || filters.operator || filters.site_location
                    ? 'No service records match your current search and filter criteria. Try adjusting your filters or search terms.' 
                    : 'No service records have been created yet. Get started by creating a new service log.'}
                </p>
                {(searchTerm || filters.start_date || filters.end_date || filters.operator || filters.site_location) ? (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/services/new')}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service Log
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {services.length > 0 && pagination && (
          <div className="mt-6">
            <Pagination
              pagination={{
                current_page: Math.floor(pagination.offset / pagination.limit) + 1,
                per_page: pagination.limit,
                total: pagination.total,
                total_pages: Math.ceil(pagination.total / pagination.limit),
                has_prev_page: pagination.offset > 0,
                has_next_page: pagination.offset + services.length < pagination.total,
                from: pagination.offset + 1,
                to: pagination.offset + services.length
              }}
              onPageChange={handlePageChange}
            />
          </div>
        )}
        
        {/* Helper Dialogs */}
        <ConfirmDialog
          open={confirmDialog.open}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmVariant={confirmDialog.confirmVariant}
          confirmLabel="Delete"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        />
      </div>
    </div>
  );
};

export default ServiceDashboard;