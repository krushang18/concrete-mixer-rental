import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Power, 
  Eye,
  Package,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  MoreVertical,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  IndianRupee,
  TrendingUp,
  Activity,
  AlertTriangle,
  X,
  Menu
} from 'lucide-react';
import { machineApi, machineUtils } from '../../services/machineApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import MachineForm from './MachineForm';
import Pagination from '../../components/common/Pagination';

// Zustand store for machine state management
const useMachineStore = create((set, get) => ({
  selectedMachines: [],
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
  showForm: false,
  selectedMachine: null,
  
  // Actions
  setSelectedMachines: (machines) => set({ selectedMachines: machines }),
  addSelectedMachine: (machineId) => set((state) => ({
    selectedMachines: state.selectedMachines.includes(machineId) 
      ? state.selectedMachines.filter(id => id !== machineId)
      : [...state.selectedMachines, machineId]
  })),
  clearSelectedMachines: () => set({ selectedMachines: [] }),
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
    selectedMachines: []
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters })),
  setShowForm: (show) => set({ showForm: show }),
  setSelectedMachine: (machine) => set({ selectedMachine: machine })
}));

// Validation schema for filters
const filterSchema = yup.object({
  status: yup.string(),
  startDate: yup.date().nullable(),
  endDate: yup.date().nullable().min(yup.ref('startDate'), 'End date must be after start date'),
  sortBy: yup.string().oneOf(['created_at', 'updated_at', 'name', 'machine_number', 'priceByDay', 'is_active']),
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
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 border-green-200',
    priority: 'high'
  },
  inactive: {
    label: 'Inactive',
    color: 'bg-red-100 text-red-800 border-red-200',
    priority: 'low'
  }
};

// Mobile-first Status Badge Component
const StatusBadge = ({ isActive, size = 'sm' }) => {
  const status = isActive ? 'active' : 'inactive';
  const config = statusConfig[status];
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm'
  };
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${config.color} ${sizeClasses[size]}`}>
      {config.label}
    </span>
  );
};

// Mobile-optimized Stats Cards Component
const MachineStatsCards = ({ machinesData, stats }) => {
  let calculatedStats;
  if (stats?.success && stats?.data) {
    const backendStats = stats.data;
    calculatedStats = {
      total: backendStats.totalMachines || 0,
      active: backendStats.activeMachines || 0,
      inactive: backendStats.inactiveMachines || 0,
      avgPrice: backendStats.averageDailyPrice || 0,
      minPrice: backendStats.minDailyPrice || 0,
      maxPrice: backendStats.maxDailyPrice || 0
    };
  } else {
    // Fallback calculation from machines data
    const machines = machinesData || [];
    const activeMachines = machines.filter(m => m.is_active);
    const inactiveMachines = machines.filter(m => !m.is_active);
    const prices = machines.filter(m => m.priceByDay > 0).map(m => m.priceByDay);
    
    calculatedStats = {
      total: machines.length,
      active: activeMachines.length,
      inactive: inactiveMachines.length,
      avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0
    };
  }

  const activityRate = calculatedStats.total > 0 ? Math.round((calculatedStats.active / calculatedStats.total) * 100) : 0;
  const hasValidPricing = calculatedStats.avgPrice > 0 || calculatedStats.minPrice > 0 || calculatedStats.maxPrice > 0;

  const statsCards = [
    {
      title: 'Total',
      value: calculatedStats.total.toLocaleString('en-IN'),
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: 'All machines',
      trend: null
    },
    {
      title: 'Active',
      value: calculatedStats.active.toLocaleString('en-IN'),
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: 'Available for rental',
      trend: calculatedStats.total > 0 ? `${activityRate}% active` : null
    },
    {
      title: 'Inactive',
      value: calculatedStats.inactive.toLocaleString('en-IN'),
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      subtitle: 'Not available',
      trend: calculatedStats.total > 0 ? `${100 - activityRate}% inactive` : null
    },
    {
      title: 'Avg Rate',
      value: hasValidPricing ? `₹${Math.round(calculatedStats.avgPrice).toLocaleString('en-IN')}` : '₹0',
      icon: IndianRupee,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      subtitle: 'Daily rate',
      trend: hasValidPricing && calculatedStats.minPrice > 0 && calculatedStats.maxPrice > 0 
        ? `₹${Math.round(calculatedStats.minPrice).toLocaleString('en-IN')} - ₹${Math.round(calculatedStats.maxPrice).toLocaleString('en-IN')}`
        : null
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {statsCards.map((stat, index) => {
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
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {stat.subtitle}
                </p>
                {stat.trend && (
                  <p className={`text-xs ${stat.color} mt-1 font-medium`}>
                    {stat.trend}
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
const BulkActions = ({ selectedMachines, onBulkStatusUpdate, onDeselectAll }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  if (selectedMachines.length === 0) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-blue-800 font-medium text-sm">
            {selectedMachines.length} selected
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
                      onBulkStatusUpdate(true);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Activate All
                  </button>
                  <button
                    onClick={() => {
                      onBulkStatusUpdate(false);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Deactivate All
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
const MachineFilters = ({ onApplyFilters, onReset }) => {
  const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useMachineStore();
  
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                <option value="name">Machine Name</option>
                <option value="machine_number">Machine Number</option>
                <option value="priceByDay">Daily Price</option>
                <option value="is_active">Status</option>
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

// Mobile-optimized Machine Actions Dropdown
const MachineActionsDropdown = ({ machine, onEdit, onToggleStatus }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const actions = [
    { label: 'Edit Machine', action: () => onEdit(machine), show: true, icon: Edit },
    { 
      label: machine.is_active ? 'Deactivate' : 'Activate', 
      action: () => onToggleStatus(machine), 
      show: true, 
      icon: Power 
    }
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
            {actions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => {
                    action.action();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors flex items-center text-gray-700"
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile-first Machine Card Component for smaller screens
const MachineCard = ({ machine, isSelected, onSelect, onView, onEdit, onToggleStatus }) => {
  const date = new Date(machine.created_at);
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
            onChange={() => onSelect(machine.id)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 truncate" title={machine.name}>
              {machine.name}
            </h3>
            <p className="text-sm text-gray-500">{machine.machine_number}</p>
            {machine.description && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-2" title={machine.description}>
                {machine.description}
              </p>
            )}
          </div>
        </div>
        <MachineActionsDropdown 
          machine={machine} 
          onEdit={onEdit} 
          onToggleStatus={onToggleStatus} 
        />
      </div>

      <div className="flex items-center justify-between">
        <StatusBadge isActive={machine.is_active} size="xs" />
        <div className="text-xs text-gray-500 text-right">
          <div>{dateStr}</div>
          <div>{timeStr}</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm">
          <span className="font-medium text-gray-900">
            ₹{machine.priceByMonth?.toLocaleString('en-IN')}/month
          </span>
        </div>
        <div className="text-xs text-gray-500">
          <span>Day: ₹{machine.priceByDay?.toLocaleString('en-IN')}</span>
          <span className="mx-1">|</span>
          <span>Week: ₹{machine.priceByWeek?.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <button
        onClick={() => onView(machine)}
        className="w-full bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center"
      >
        <Eye className="w-4 h-4 mr-1" />
        View Details
      </button>
    </div>
  );
};

// Main Machines Component - Mobile First
const Machines = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const {
    selectedMachines,
    filters,
    searchTerm,
    showForm,
    selectedMachine,
    setSelectedMachines,
    addSelectedMachine,
    clearSelectedMachines,
    setFilters,
    resetFilters,
    setSearchTerm,
    setShowForm,
    setSelectedMachine
  } = useMachineStore();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Unified query key for better caching
  const queryKey = useMemo(() => [
    'machines', 
    debouncedSearchTerm, 
    filters.status,
    filters.startDate,
    filters.endDate,
    filters.sortBy,
    filters.sortOrder,
    filters.page,
    filters.limit
  ], [debouncedSearchTerm, filters]);
  
  // Single API call for machines with optimized caching
  const { data: machinesData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => machineApi.getAll({
      ...filters,
      search: debouncedSearchTerm || undefined,
      limit: 1000 // Get all machines for client-side processing
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
  
  // Fetch stats with reduced frequency
  const { data: statsData } = useQuery({
    queryKey: ['machine-stats'],
    queryFn: () => machineApi.getStats(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Process machines with client-side filtering, sorting, and pagination
  const processedData = useMemo(() => {
    let machines = machinesData?.data || [];

    // Apply search filter
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      machines = machines.filter(machine => 
        machine.name.toLowerCase().includes(searchLower) ||
        machine.machine_number.toLowerCase().includes(searchLower) ||
        (machine.description && machine.description.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (filters.status) {
      machines = machines.filter(machine => 
        (filters.status === 'active' && machine.is_active) ||
        (filters.status === 'inactive' && !machine.is_active)
      );
    }

    // Apply date filters
    if (filters.startDate) {
      machines = machines.filter(machine => 
        new Date(machine.created_at) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      machines = machines.filter(machine => 
        new Date(machine.created_at) <= new Date(filters.endDate)
      );
    }

    // Apply sorting
    machines.sort((a, b) => {
      const sortBy = filters.sortBy || 'created_at';
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'priceByDay' || sortBy === 'priceByWeek' || sortBy === 'priceByMonth') {
        aVal = parseFloat(aVal) || 0;
        bVal = parseFloat(bVal) || 0;
        return filters.sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
      }

      if (sortBy === 'is_active') {
        return filters.sortOrder === 'ASC' ? aVal - bVal : bVal - aVal;
      }

      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        const dateA = new Date(aVal);
        const dateB = new Date(bVal);
        return filters.sortOrder === 'ASC' ? dateA - dateB : dateB - dateA;
      }

      // String comparison
      const stringA = (aVal || '').toString().toLowerCase();
      const stringB = (bVal || '').toString().toLowerCase();
      return filters.sortOrder === 'ASC' 
        ? stringA.localeCompare(stringB)
        : stringB.localeCompare(stringA);
    });

    // Apply pagination
    const total = machines.length;
    const totalPages = Math.ceil(total / filters.limit);
    const from = (filters.page - 1) * filters.limit + 1;
    const to = Math.min(filters.page * filters.limit, total);
    
    const paginatedMachines = machines.slice(
      (filters.page - 1) * filters.limit,
      filters.page * filters.limit
    );

    return {
      machines: paginatedMachines,
      pagination: {
        current_page: filters.page,
        per_page: filters.limit,
        total,
        total_pages: totalPages,
        has_prev_page: filters.page > 1,
        has_next_page: filters.page < totalPages,
        from: total > 0 ? from : 0,
        to: total > 0 ? to : 0
      }
    };
  }, [machinesData?.data, debouncedSearchTerm, filters]);
  
  // Optimized mutations with optimistic updates
  const toggleStatusMutation = useMutation({
    mutationFn: machineApi.toggleStatus,
    onMutate: async (machineId) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.map(machine => 
            machine.id === machineId 
              ? { ...machine, is_active: !machine.is_active, updated_at: new Date().toISOString() }
              : machine
          )
        }));
      }
      
      return { previousData };
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Machine status updated successfully');
      queryClient.invalidateQueries(['machine-stats']);
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.message || 'Failed to update machine status');
    }
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: ({ machineIds, updates }) => machineApi.bulkUpdate(machineIds, updates),
    onMutate: async ({ machineIds, updates }) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.map(machine => 
            machineIds.includes(machine.id) 
              ? { ...machine, ...updates, updated_at: new Date().toISOString() }
              : machine
          )
        }));
      }
      
      return { previousData };
    },
    onSuccess: (data) => {
      toast.success(data.message || `${data.updatedCount || 0} machines updated successfully`);
      clearSelectedMachines();
      queryClient.invalidateQueries(['machine-stats']);
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.message || 'Failed to bulk update machines');
    }
  });
  
  const machines = processedData.machines;
  const pagination = processedData.pagination;
  
  // Event handlers - all using useCallback to maintain references
  const handleCreateMachine = useCallback(() => {
    setSelectedMachine(null);
    setShowForm(true);
  }, [setSelectedMachine, setShowForm]);

  const handleEditMachine = useCallback((machine) => {
    setSelectedMachine(machine);
    setShowForm(true);
  }, [setSelectedMachine, setShowForm]);

  const handleViewMachine = useCallback((machine) => {
    navigate(`/machines/${machine.id}`);
  }, [navigate]);

  const handleToggleStatus = useCallback(async (machine) => {
    const action = machine.is_active ? 'deactivate' : 'activate';
    const confirmMessage = `Are you sure you want to ${action} "${machine.name}"?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await toggleStatusMutation.mutateAsync(machine.id);
      } catch (error) {
        console.error('Error toggling status:', error);
      }
    }
  }, [toggleStatusMutation]);

  const handleSelectAll = useCallback(() => {
    if (selectedMachines.length === machines.length && machines.length > 0) {
      clearSelectedMachines();
    } else {
      setSelectedMachines(machines.map(m => m.id));
    }
  }, [selectedMachines.length, machines, clearSelectedMachines, setSelectedMachines]);

  const handleBulkStatusUpdate = useCallback((isActive) => {
    if (selectedMachines.length === 0) {
      toast.error('Please select machines to update');
      return;
    }

    const action = isActive ? 'activate' : 'deactivate';
    const confirmMessage = `Are you sure you want to ${action} ${selectedMachines.length} selected machines?`;
    
    if (window.confirm(confirmMessage)) {
      bulkUpdateMutation.mutate({
        machineIds: selectedMachines,
        updates: { is_active: isActive }
      });
    }
  }, [selectedMachines, bulkUpdateMutation]);

  const handleFormSuccess = useCallback(() => {
    setShowForm(false);
    setSelectedMachine(null);
    queryClient.invalidateQueries(['machines']);
    queryClient.invalidateQueries(['machine-stats']);
  }, [setShowForm, setSelectedMachine, queryClient]);

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
    setSelectedMachine(null);
  }, [setShowForm, setSelectedMachine]);

  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
    clearSelectedMachines();
  }, [setFilters, clearSelectedMachines]);

  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
    clearSelectedMachines();
  }, [setFilters, clearSelectedMachines]);

  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);

  // Format currency in Indian format
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Early returns should come after ALL hooks are called
  if (isLoading && !machinesData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading machines...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Machines</h3>
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
                Machine Management
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Manage your concrete mixer inventory and equipment catalog
                {pagination && (
                  <span className="text-xs sm:text-sm ml-2">
                    ({pagination.total} total)
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
                onClick={handleCreateMachine}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Machine
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <MachineStatsCards machinesData={machinesData?.data} stats={statsData} />

        {/* Mobile-first Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by machine name, number, or description..."
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
        <MachineFilters onApplyFilters={applyFilters} onReset={resetFilters} />

        {/* Bulk Actions */}
        <BulkActions
          selectedMachines={selectedMachines}
          onBulkStatusUpdate={handleBulkStatusUpdate}
          onDeselectAll={clearSelectedMachines}
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
                      checked={selectedMachines.length === machines.length && machines.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Machine Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {machines.map((machine) => {
                  const date = new Date(machine.created_at);
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
                    <tr key={machine.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedMachines.includes(machine.id)}
                          onChange={() => addSelectedMachine(machine.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={machine.name}>
                            {machine.name}
                          </p>
                          <p className="text-sm text-gray-500">{machine.machine_number}</p>
                          {machine.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-1 max-w-xs" title={machine.description}>
                              {machine.description}
                            </p>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            ₹{machine.priceByMonth?.toLocaleString('en-IN')}/month
                          </p>
                          <div className="text-xs text-gray-500 mt-1">
                            <span>Day: ₹{machine.priceByDay?.toLocaleString('en-IN')}</span>
                            <span className="mx-1">|</span>
                            <span>Week: ₹{machine.priceByWeek?.toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <StatusBadge isActive={machine.is_active} />
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <p>{dateStr}</p>
                          <p className="text-xs text-gray-500">{timeStr}</p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleViewMachine(machine)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <MachineActionsDropdown
                            machine={machine}
                            onEdit={handleEditMachine}
                            onToggleStatus={handleToggleStatus}
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
            {machines.length > 0 && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {machines.length} {machines.length === 1 ? 'machine' : 'machines'}
                  </span>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedMachines.length === machines.length && machines.length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200">
              {machines.map((machine) => (
                <div key={machine.id} className="p-4">
                  <MachineCard
                    machine={machine}
                    isSelected={selectedMachines.includes(machine.id)}
                    onSelect={addSelectedMachine}
                    onView={handleViewMachine}
                    onEdit={handleEditMachine}
                    onToggleStatus={handleToggleStatus}
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
          {machines.length === 0 && !isFetching && (
            <div className="text-center py-12 px-4">
              <div className="max-w-sm mx-auto">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No machines found</h3>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                  {searchTerm || filters.status || filters.startDate || filters.endDate
                    ? 'No machines match your current search and filter criteria. Try adjusting your filters or search terms.'
                    : 'No machines have been added yet. Add your first machine to start managing your inventory.'}
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
                {(!searchTerm && !filters.status && !filters.startDate && !filters.endDate) && (
                  <button
                    onClick={handleCreateMachine}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Machine
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {machines.length > 0 && pagination && (
          <div className="mt-6">
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}

        {/* Machine Form Modal */}
        {showForm && (
          <MachineForm
            machine={selectedMachine}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        )}

        {/* Loading Overlay for Actions */}
        {(toggleStatusMutation.isPending || bulkUpdateMutation.isPending) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-4 shadow-xl min-w-[300px]">
              <LoadingSpinner size="lg" />
              <div>
                <div className="text-gray-900 font-medium">
                  {toggleStatusMutation.isPending && 'Updating Status'}
                  {bulkUpdateMutation.isPending && 'Updating Machines'}
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  {toggleStatusMutation.isPending && 'Please wait while we update the machine status...'}
                  {bulkUpdateMutation.isPending && `Please wait while we update ${selectedMachines.length} machines...`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Machines;