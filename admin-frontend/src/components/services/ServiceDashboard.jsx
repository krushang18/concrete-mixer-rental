import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Plus, Filter, Download, Eye, Edit, Trash2, 
  AlertCircle, CheckCircle, Clock, Search, RefreshCw,
  BarChart3, TrendingUp, Users, Wrench, X, Menu,
  MoreVertical, Settings, ChevronDown, MapPin, User, FileText
} from 'lucide-react';
import { serviceApi, serviceUtils } from '../../services/serviceApi';
import Pagination from '../../components/common/Pagination';

// Zustand store for managing component state
const useServiceStore = create((set, get) => ({
  selectedServices: [],
  filters: {
    machine_id: '',
    start_date: '',
    end_date: '',
    operator: '',
    site_location: '',
    sortBy: 'service_date',
    sortOrder: 'DESC',
    page: 1,
    limit: 20
  },
  searchTerm: '',
  showMobileFilters: false,
  
  // Actions
  setSelectedServices: (services) => set({ selectedServices: services }),
  addSelectedService: (serviceId) => set((state) => ({
    selectedServices: state.selectedServices.includes(serviceId) 
      ? state.selectedServices.filter(id => id !== serviceId)
      : [...state.selectedServices, serviceId]
  })),
  clearSelectedServices: () => set({ selectedServices: [] }),
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      machine_id: '',
      start_date: '',
      end_date: '',
      operator: '',
      site_location: '',
      sortBy: 'service_date',
      sortOrder: 'DESC',
      page: 1,
      limit: 20
    },
    searchTerm: '',
    selectedServices: []
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters }))
}));

// Validation schema for filters
const filterSchema = yup.object({
  machine_id: yup.string(),
  start_date: yup.date().nullable(),
  end_date: yup.date().nullable().min(yup.ref('start_date'), 'End date must be after start date'),
  operator: yup.string(),
  site_location: yup.string(),
  sortBy: yup.string().oneOf(['service_date', 'machine_name', 'operator', 'engine_hours']),
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

// Mobile-first Status Badge Component
const StatusBadge = ({ lastServiceDate, size = 'sm' }) => {
  const status = serviceUtils.getServiceStatus(lastServiceDate);
  const badgeClass = serviceUtils.getStatusBadgeClass(lastServiceDate);
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
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
    <span className={`inline-flex items-center rounded-full font-medium border ${badgeClass} ${sizeClasses[size]}`}>
      <Icon className={`${size === 'xs' ? 'w-3 h-3' : 'w-4 h-4'} mr-1`} />
      {status.message}
    </span>
  );
};

// Mobile-optimized Stats Cards
const ServiceStatsCards = ({ servicesData, stats }) => {
  let calculatedStats;
  if (stats?.success && stats?.data) {
    const backendStats = stats.data;
    calculatedStats = {
      total: backendStats.totalServices || 0,
      thisMonth: backendStats.thisMonth || 0,
      activeOperators: backendStats.activeOperators || 0,
      machinesServiced: backendStats.machinesServiced || 0
    };
  } else {
    calculatedStats = { 
      total: servicesData?.pagination?.total || 0, 
      thisMonth: 0,
      activeOperators: 0,
      machinesServiced: 0
    };
  }
  
  const cards = [
    { title: 'Total Services', value: calculatedStats.total, color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Wrench },
    { title: 'This Month', value: calculatedStats.thisMonth, color: 'text-green-600', bgColor: 'bg-green-50', icon: Calendar },
    { title: 'Active Operators', value: calculatedStats.activeOperators, color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Users },
    { title: 'Machines Serviced', value: calculatedStats.machinesServiced, color: 'text-orange-600', bgColor: 'bg-orange-50', icon: BarChart3 }
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
const BulkActions = ({ selectedServices, onBulkDelete, onDeselectAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (selectedServices.length === 0) return null;
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-red-800 font-medium text-sm">
            {selectedServices.length} selected
          </span>
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm"
            >
              Actions
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>
            
            {isOpen && (
              <div className="absolute top-full mt-1 left-0 right-0 sm:right-auto sm:w-48 bg-white border rounded-lg shadow-lg z-20">
                <div className="py-1">
                  <button
                    onClick={() => {
                      onBulkDelete();
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2 inline" />
                    Delete Selected
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={onDeselectAll}
          className="text-red-600 hover:text-red-700 font-medium text-sm self-start sm:self-center"
        >
          Deselect All
        </button>
      </div>
    </div>
  );
};

// Mobile-first Filters Component with React Hook Form
const ServiceFilters = ({ onApplyFilters, onReset }) => {
  const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useServiceStore();
  
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
      machine_id: '',
      start_date: '',
      end_date: '',
      operator: '',
      site_location: '',
      sortBy: 'service_date',
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
          Service Filters
        </h3>
      </div>
      
      {/* Filter form */}
      <div className={`p-4 ${showMobileFilters ? 'block' : 'hidden lg:block'}`}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                {...register('start_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {errors.start_date && (
                <p className="text-red-500 text-xs mt-1">{errors.start_date.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                {...register('end_date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              {errors.end_date && (
                <p className="text-red-500 text-xs mt-1">{errors.end_date.message}</p>
              )}
            </div>
            
            {/* Operator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <input
                type="text"
                placeholder="Search operator..."
                {...register('operator')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            {/* Site Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Location</label>
              <input
                type="text"
                placeholder="Search location..."
                {...register('site_location')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            
            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                {...register('sortBy')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="service_date">Service Date</option>
                <option value="machine_name">Machine Name</option>
                <option value="operator">Operator</option>
                <option value="engine_hours">Engine Hours</option>
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
const ServiceCard = ({ service, isSelected, onSelect, onView, onEdit, onDelete }) => {
  // Format date
  const date = new Date(service.service_date);
  const dateStr = date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(service.id)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate" title={service.machine_name || `Machine ${service.machine_id}`}>
              {service.machine_name || `Machine ${service.machine_id}`}
            </h3>
            <p className="text-sm text-gray-500 flex items-center mt-1">
              <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
              <span>{dateStr}</span>
            </p>
          </div>
        </div>
        <ServiceActionsDropdown
          service={service}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge lastServiceDate={service.service_date} size="xs" />
        <div className="text-xs text-gray-500 text-right">
          Engine Hours: {serviceUtils.formatEngineHours(service.engine_hours)}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <User className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate flex-1" title={service.operator}>{service.operator}</span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <MapPin className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="truncate" title={service.site_location || 'Not specified'}>
            {service.site_location || 'Not specified'}
          </span>
        </div>
        {service.services && service.services.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {service.services.slice(0, 2).map((svc, index) => (
              <span key={index} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                {svc.name}
              </span>
            ))}
            {service.services.length > 2 && (
              <span className="text-xs text-gray-500">
                +{service.services.length - 2} more
              </span>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => onView(service.id)}
        className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center"
      >
        <Eye className="w-4 h-4 mr-1" />
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
    selectedServices,
    filters,
    searchTerm,
    setSelectedServices,
    addSelectedService,
    clearSelectedServices,
    setFilters,
    resetFilters,
    setSearchTerm
  } = useServiceStore();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Unified query key for better caching
  const queryKey = useMemo(() => [
    'services', 
    debouncedSearchTerm, 
    filters.start_date,
    filters.end_date,
    filters.operator,
    filters.site_location,
    filters.sortBy,
    filters.sortOrder,
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
  
  // Fetch stats with reduced frequency
  const { data: statsData } = useQuery({
    queryKey: ['service-stats'],
    queryFn: () => serviceApi.getStats(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
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
      toast.success('Service record deleted successfully');
      queryClient.invalidateQueries(['service-stats']);
    },
    onError: (error, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(queryKey, context.previousServices);
      }
      toast.error(error.response?.data?.message || 'Failed to delete service record');
    }
  });
  
  // Bulk delete with optimistic updates
  const bulkDeleteMutation = useMutation({
    mutationFn: (serviceIds) => serviceApi.bulkDelete(serviceIds),
    onMutate: async (serviceIds) => {
      await queryClient.cancelQueries(queryKey);
      const previousServices = queryClient.getQueryData(queryKey);
      
      if (previousServices) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.filter(service => !serviceIds.includes(service.id))
        }));
      }
      
      return { previousServices };
    },
    onSuccess: () => {
      toast.success('Service records deleted successfully');
      clearSelectedServices();
      queryClient.invalidateQueries(['service-stats']);
    },
    onError: (error, variables, context) => {
      if (context?.previousServices) {
        queryClient.setQueryData(queryKey, context.previousServices);
      }
      toast.error(error.response?.data?.message || 'Failed to delete service records');
    }
  });
  
  // Extract services and pagination data
  const services = servicesData?.data || [];
  const pagination = servicesData?.pagination;
  
  // Event handlers - all using useCallback to maintain references
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
    clearSelectedServices();
  }, [setFilters, clearSelectedServices]);
  
  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
    clearSelectedServices();
  }, [setFilters, clearSelectedServices]);
  
  const handleDelete = useCallback((serviceId) => {
    if (window.confirm('Are you sure you want to delete this service record?')) {
      deleteMutation.mutate(serviceId);
    }
  }, [deleteMutation]);
  
  const handleBulkDelete = useCallback(() => {
    if (window.confirm(`Are you sure you want to delete ${selectedServices.length} service records?`)) {
      bulkDeleteMutation.mutate(selectedServices);
    }
  }, [bulkDeleteMutation, selectedServices]);
  
  const handleView = useCallback((serviceId) => {
    navigate(`/services/${serviceId}`);
  }, [navigate]);
  
  const handleEdit = useCallback((serviceId) => {
    navigate(`/services/${serviceId}/edit`);
  }, [navigate]);
  
  const handleSelectAll = useCallback(() => {
    if (selectedServices.length === services.length && services.length > 0) {
      clearSelectedServices();
    } else {
      setSelectedServices(services.map(s => s.id));
    }
  }, [selectedServices.length, services, clearSelectedServices, setSelectedServices]);
  
  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);
  
  const handleExport = useCallback(async () => {
    try {
      await serviceApi.exportToCSV({
        ...filters,
        search: debouncedSearchTerm || undefined
      });
      toast.success('Export completed successfully');
    } catch (error) {
      toast.error('Export failed. Please try again.');
    }
  }, [filters, debouncedSearchTerm]);
  
  // Early returns after all hooks
  if (isLoading && !servicesData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading services...</p>
        </div>
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
                Service Records
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
              <button
                onClick={handleExport}
                className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
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
        
        {/* Stats Cards */}
        <ServiceStatsCards servicesData={servicesData} stats={statsData} />
        
        {/* Mobile-first Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by machine, operator, location..."
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
        <ServiceFilters onApplyFilters={applyFilters} onReset={resetFilters} />
        
        {/* Bulk Actions */}
        <BulkActions
          selectedServices={selectedServices}
          onBulkDelete={handleBulkDelete}
          onDeselectAll={clearSelectedServices}
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
                      checked={selectedServices.length === services.length && services.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
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
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service.id)}
                          onChange={() => addSelectedService(service.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      
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
          <div className="lg:hidden">
            {services.length > 0 && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {services.length} {services.length === 1 ? 'service' : 'services'}
                  </span>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedServices.length === services.length && services.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200">
              {services.map((service) => (
                <div key={service.id} className="p-4">
                  <ServiceCard
                    service={service}
                    isSelected={selectedServices.includes(service.id)}
                    onSelect={addSelectedService}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Loading state overlay */}
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
              onLimitChange={handleLimitChange}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceDashboard;