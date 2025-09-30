import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';
import { create } from 'zustand';
import {
  Search,
  Plus,
  FileText,
  Calendar,
  Filter,
  Eye,
  Edit2,
  Trash2,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  Truck,
  CircleCheck,
  Ban,
  Building2,
  Phone,
  IndianRupee,
  CalendarSync, 
  X,
  Users,
  Menu
} from 'lucide-react';

import { quotationApi } from '../../services/quotationApi';
import { machineApi } from '../../services/machineApi';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';

// Zustand store for quotation state management
const useQuotationStore = create((set, get) => ({
  selectedQuotations: [],
  filters: {
    status: '',
    delivery_status: '',
    machine_id: '',
    start_date: '',
    end_date: '',
    sort_by: 'created_at',
    sort_order: 'DESC',
    page: 1,
    limit: 20
  },
  searchTerm: '',
  showMobileFilters: false,
  deleteDialog: { open: false, id: null },
  
  // Actions
  setSelectedQuotations: (quotations) => set({ selectedQuotations: quotations }),
  addSelectedQuotation: (quotationId) => set((state) => ({
    selectedQuotations: state.selectedQuotations.includes(quotationId) 
      ? state.selectedQuotations.filter(id => id !== quotationId)
      : [...state.selectedQuotations, quotationId]
  })),
  clearSelectedQuotations: () => set({ selectedQuotations: [] }),
  setFilters: (newFilters) => set((state) => ({
    filters: { ...state.filters, ...newFilters }
  })),
  resetFilters: () => set({
    filters: {
      status: '',
      delivery_status: '',
      machine_id: '',
      start_date: '',
      end_date: '',
      sort_by: 'created_at',
      sort_order: 'DESC',
      page: 1,
      limit: 20
    },
    searchTerm: '',
    selectedQuotations: []
  }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  toggleMobileFilters: () => set((state) => ({ showMobileFilters: !state.showMobileFilters })),
  setDeleteDialog: (dialog) => set({ deleteDialog: dialog })
}));

// Validation schema for filters
const filterSchema = yup.object({
  status: yup.string(),
  delivery_status: yup.string(),
  machine_id: yup.string(),
  start_date: yup.date().nullable(),
  end_date: yup.date().nullable().min(yup.ref('start_date'), 'End date must be after start date'),
  sort_by: yup.string().oneOf(['created_at', 'quotation_number', 'customer_name', 'grand_total']),
  sort_order: yup.string().oneOf(['ASC', 'DESC'])
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
const quotationStatusConfig = {
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: FileText },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  accepted: { label: 'Accepted', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle }
};

const deliveryStatusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Package },
  delivered: { label: 'Delivered', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Truck },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200', icon: CircleCheck },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: Ban }
};

// Format currency in Indian format
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

// Format phone number
const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};

// Mobile-first Status Badge Component
const StatusBadge = ({ status, type = 'quotation', size = 'sm' }) => {
  const config = type === 'quotation' ? quotationStatusConfig : deliveryStatusConfig;
  const statusInfo = config[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: AlertCircle };
  const Icon = statusInfo.icon;

  const sizeClasses = {
    xs: 'px-2 py-1 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm'
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium border ${statusInfo.color} ${sizeClasses[size]}`}>
      <Icon className="w-3 h-3 mr-1" />
      {statusInfo.label}
    </span>
  );
};

// Mobile-optimized Stats Cards Component
const QuotationStatsCards = ({ quotationsData, stats }) => {
  let calculatedStats;
  if (stats?.success && stats?.data) {
    calculatedStats = stats.data;
  } else {
    // Fallback calculation from quotations data
    const quotations = quotationsData || [];
    calculatedStats = {
      totalQuotations: quotations.length,
      pendingQuotations: quotations.filter(q => q.quotation_status === 'sent').length,
      acceptedQuotations: quotations.filter(q => q.quotation_status === 'accepted').length,
      totalRevenue: quotations.filter(q => q.quotation_status === 'accepted').reduce((sum, q) => sum + (q.grand_total || 0), 0)
    };
  }

  const cards = [
    { title: 'Total', value: calculatedStats.totalQuotations || 0, color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Users },
    { title: 'Pending', value: calculatedStats.pendingQuotations || 0, color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: Clock },
    { title: 'Accepted', value: calculatedStats.acceptedQuotations || 0, color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
    { title: 'Conversion Rate', value: calculatedStats.conversion_rate || 0, color: 'text-purple-600', bgColor: 'bg-purple-50', icon: CalendarSync }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className={`${card.bgColor} rounded-lg p-3 sm:p-4 transform hover:scale-105 transition-transform duration-200`}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 truncate">
                  {card.title}
                </p>
                <p className={`text-lg sm:text-2xl font-bold ${card.color} mb-1`}>
                  {typeof card.value === 'string' ? card.value : card.value.toLocaleString('en-IN')}
                </p>
              </div>
              <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${card.color} flex-shrink-0`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Mobile-first Bulk Actions Component
const BulkActions = ({ selectedQuotations, onBulkUpdate, onDeselectAll }) => {
  if (selectedQuotations.length === 0) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <span className="text-blue-800 font-medium text-sm">
          {selectedQuotations.length} selected
        </span>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            onChange={(e) => {
              if (e.target.value) {
                onBulkUpdate({ ids: selectedQuotations, action: 'status', value: e.target.value });
                e.target.value = '';
              }
            }}
            className="text-sm rounded border-blue-300 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Update Status</option>
            {Object.entries(quotationStatusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
          <select
            onChange={(e) => {
              if (e.target.value) {
                onBulkUpdate({ ids: selectedQuotations, action: 'delivery_status', value: e.target.value });
                e.target.value = '';
              }
            }}
            className="text-sm rounded border-blue-300 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Update Delivery</option>
            {Object.entries(deliveryStatusConfig).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
          </select>
          
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
const QuotationFilters = ({ onApplyFilters, onReset, machinesData }) => {
  const { filters, showMobileFilters, setFilters, toggleMobileFilters } = useQuotationStore();
  
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
      delivery_status: '',
      machine_id: '',
      start_date: '',
      end_date: '',
      sort_by: 'created_at',
      sort_order: 'DESC'
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Status</option>
                {Object.entries(quotationStatusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            
            {/* Delivery Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Status</label>
              <select
                {...register('delivery_status')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Status</option>
                {Object.entries(deliveryStatusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            
            {/* Machine Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Machine</label>
              <select
                {...register('machine_id')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">All Machines</option>
                {machinesData?.data?.map(machine => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Range */}
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

// Mobile-first Quotation Card Component
const QuotationCard = ({ quotation, isSelected, onSelect, onDelete }) => {
  return (
    <div className="bg-white border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(quotation.id)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-gray-900 text-sm">{quotation.quotation_number}</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              <StatusBadge status={quotation.quotation_status} size="xs" />
              <StatusBadge status={quotation.delivery_status} type="delivery" size="xs" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <Building2 className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="font-medium truncate">{quotation.customer_name}</span>
          {quotation.company_name && (
            <span className="ml-1 truncate">({quotation.company_name})</span>
          )}
        </div>
        
        <div className="flex items-center">
          <Phone className="w-4 h-4 mr-2 flex-shrink-0" />
          <a href={`tel:${quotation.customer_contact}`} className="text-blue-600">
            {formatPhone(quotation.customer_contact)}
          </a>
        </div>

        <div className="flex items-center">
          <IndianRupee className="w-4 h-4 mr-2 flex-shrink-0" />
          <span className="font-semibold text-lg">
            {formatCurrency(quotation.grand_total)}
          </span>
        </div>

        {quotation.machines && (
          <div className="flex items-start">
            <Package className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <span className="text-xs line-clamp-2">{quotation.machines}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span className="text-xs">
              {new Date(quotation.created_at).toLocaleDateString('en-IN')}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {quotation.days_ago} days ago
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
        <Link
          to={`/quotations/${quotation.id}`}
          className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center justify-center"
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Link>
        <Link
          to={`/quotations/${quotation.id}/edit`}
          className="flex-1 bg-blue-100 text-blue-700 py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center justify-center"
        >
          <Edit2 className="w-4 h-4 mr-1" />
          Edit
        </Link>
        <button
          onClick={() => onDelete(quotation.id)}
          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Main QuotationList Component - Mobile First
const QuotationList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const {
    selectedQuotations,
    filters,
    searchTerm,
    deleteDialog,
    setSelectedQuotations,
    addSelectedQuotation,
    clearSelectedQuotations,
    setFilters,
    resetFilters,
    setSearchTerm,
    setDeleteDialog
  } = useQuotationStore();
  
  // Debounce search term
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  
  // Unified query key for better caching
  const queryKey = useMemo(() => [
    'quotations', 
    debouncedSearchTerm,
    filters.status,
    filters.delivery_status,
    filters.machine_id,
    filters.start_date,
    filters.end_date,
    filters.sort_by,
    filters.sort_order,
    filters.page,
    filters.limit
  ], [debouncedSearchTerm, filters]);
  
  // Single API call for quotations with optimized caching
  const { data: quotationsData, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => quotationApi.getAll({
      search: debouncedSearchTerm || undefined,
      status: filters.status || undefined,
      delivery_status: filters.delivery_status || undefined,
      machine_id: filters.machine_id || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      page: filters.page,
      limit: filters.limit
    }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 10, // 10 minutes
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
  
  // Fetch machines for filter dropdown with reduced frequency
  const { data: machinesData } = useQuery({
    queryKey: ['machines-filter'],
    queryFn: () => machineApi.getAll({ is_active: true }),
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch stats with reduced frequency
  const { data: statsData } = useQuery({
    queryKey: ['quotation-stats'],
    queryFn: () => quotationApi.getStats(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
  
  // Optimized mutations with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: quotationApi.delete,
    onMutate: async (quotationId) => {
      await queryClient.cancelQueries(queryKey);
      const previousData = queryClient.getQueryData(queryKey);
      
      if (previousData) {
        queryClient.setQueryData(queryKey, (old) => ({
          ...old,
          data: old.data.filter(quotation => quotation.id !== quotationId)
        }));
      }
      
      return { previousData };
    },
    onSuccess: () => {
      toast.success('Quotation deleted successfully');
      queryClient.invalidateQueries(['quotation-stats']);
      setDeleteDialog({ open: false, id: null });
    },
    onError: (error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      toast.error(error.message || 'Failed to delete quotation');
    }
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, action, value }) => {
      const promises = ids.map(id => {
        if (action === 'status') {
          return quotationApi.updateStatus(id, value);
        } else if (action === 'delivery_status') {
          return quotationApi.updateDeliveryStatus(id, value);
        }
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Quotations updated successfully');
      queryClient.invalidateQueries(['quotations']);
      queryClient.invalidateQueries(['quotation-stats']);
      clearSelectedQuotations();
    },
    onError: (error) => {
      toast.error('Failed to update quotations');
    }
  });
  
  const quotations = quotationsData?.data || [];
  const pagination = quotationsData?.pagination || {};
  
  // Event handlers - all using useCallback to maintain references
  const handlePageChange = useCallback((newPage) => {
    setFilters({ page: newPage });
    clearSelectedQuotations();
  }, [setFilters, clearSelectedQuotations]);

  const handleLimitChange = useCallback((newLimit) => {
    setFilters({ limit: newLimit, page: 1 });
    clearSelectedQuotations();
  }, [setFilters, clearSelectedQuotations]);

  const handleSelectAll = useCallback(() => {
    if (selectedQuotations.length === quotations.length && quotations.length > 0) {
      clearSelectedQuotations();
    } else {
      setSelectedQuotations(quotations.map(q => q.id));
    }
  }, [selectedQuotations.length, quotations, clearSelectedQuotations, setSelectedQuotations]);

  const handleBulkUpdate = useCallback((updateData) => {
    bulkUpdateMutation.mutate(updateData);
  }, [bulkUpdateMutation]);

  const applyFilters = useCallback(() => {
    setFilters({ page: 1 });
  }, [setFilters]);

  const handleExport = useCallback(async () => {
    try {
      const exportData = await quotationApi.getAll({
        search: debouncedSearchTerm,
        status: filters.status,
        delivery_status: filters.delivery_status,
        machine_id: filters.machine_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        limit: 1000
      });

      const csvData = exportData.data.map(quotation => ({
        'Quotation Number': quotation.quotation_number,
        'Customer Name': quotation.customer_name,
        'Company Name': quotation.company_name || '',
        'Customer GST': quotation.customer_gst_number || '',
        'Contact': quotation.customer_contact,
        'Total Amount': quotation.grand_total,
        'Status': quotation.quotation_status,
        'Delivery Status': quotation.delivery_status,
        'Created Date': new Date(quotation.created_at).toLocaleDateString('en-IN'),
        'Machines': quotation.machines || '',
        'Days Ago': quotation.days_ago
      }));

      const csvString = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(value => 
          typeof value === 'string' && value.includes(',') ? `"${value}"` : value
        ).join(','))
      ].join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quotations-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Quotations exported successfully');
    } catch (error) {
      toast.error('Failed to export quotations');
    }
  }, [debouncedSearchTerm, filters]);

  // Early returns should come after ALL hooks are called
  if (isLoading && !quotationsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCcw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading quotations...</p>
        </div>
      </div>
    );
  }

  if (error && !quotationsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Quotations</h3>
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
                Quotation Management
              </h1>
              <p className="text-gray-600 text-sm sm:text-base mt-1">
                Manage quotations and track delivery status
                {pagination?.total && (
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
                <RefreshCcw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              {/* <button
                onClick={handleExport}
                className="flex items-center px-3 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button> */}
              <Link
                to="/quotations/new"
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Quotation
              </Link>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <QuotationStatsCards quotationsData={quotationsData?.data} stats={statsData} />
        
        {/* Mobile-first Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by customer name, company, contact, or quotation number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            autoComplete="off"
            spellCheck="false"
          />
          {isFetching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <RefreshCcw className="w-4 h-4 animate-spin text-gray-400" />
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
                          ({pagination.total || 0} {(pagination.total || 0) === 1 ? 'result' : 'results'})
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
        <QuotationFilters 
          onApplyFilters={applyFilters} 
          onReset={resetFilters} 
          machinesData={machinesData} 
        />
        
        {/* Bulk Actions */}
        <BulkActions
          selectedQuotations={selectedQuotations}
          onBulkUpdate={handleBulkUpdate}
          onDeselectAll={clearSelectedQuotations}
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
                      checked={selectedQuotations.length === quotations.length && quotations.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quotation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery
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
                {quotations.map((quotation) => (
                  <tr key={quotation.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedQuotations.includes(quotation.id)}
                        onChange={() => addSelectedQuotation(quotation.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{quotation.quotation_number}</p>
                        {quotation.machines && (
                          <p className="text-sm text-gray-500 flex items-center mt-1 truncate max-w-xs">
                            <Package className="w-4 h-4 mr-1 flex-shrink-0" />
                            <span title={quotation.machines}>{quotation.machines}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs" title={quotation.customer_name}>
                          {quotation.customer_name}
                        </p>
                        {quotation.company_name && (
                          <p className="text-sm text-gray-500 truncate max-w-xs" title={quotation.company_name}>
                            {quotation.company_name}
                          </p>
                        )}
                        <p className="text-sm text-gray-900 flex items-center">
                          <Phone className="w-4 h-4 mr-1 text-gray-400 flex-shrink-0" />
                          <a href={`tel:${quotation.customer_contact}`} className="text-blue-600 hover:text-blue-700">
                            {formatPhone(quotation.customer_contact)}
                          </a>
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(quotation.grand_total)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {quotation.total_items} item(s)
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <StatusBadge status={quotation.quotation_status} />
                    </td>
                    
                    <td className="px-6 py-4">
                      <StatusBadge status={quotation.delivery_status} type="delivery" />
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <p>{new Date(quotation.created_at).toLocaleDateString('en-IN')}</p>
                        <p className="text-xs text-gray-500">{quotation.days_ago} days ago</p>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/quotations/${quotation.id}`}
                          className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link
                          to={`/quotations/${quotation.id}/edit`}
                          className="p-2 text-green-600 hover:text-green-800 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Edit quotation"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteDialog({ open: true, id: quotation.id })}
                          className="p-2 text-red-600 hover:text-red-800 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Delete quotation"
                        >
                          <Trash2 className="w-4 h-4" />
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
            {quotations.length > 0 && (
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedQuotations.length === quotations.length && quotations.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {quotations.length} {quotations.length === 1 ? 'quotation' : 'quotations'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {pagination.total || quotations.length} total
                  </span>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200">
              {quotations.map((quotation) => (
                <div key={quotation.id} className="p-4">
                  <QuotationCard
                    quotation={quotation}
                    isSelected={selectedQuotations.includes(quotation.id)}
                    onSelect={addSelectedQuotation}
                    onDelete={(id) => setDeleteDialog({ open: true, id })}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Loading state overlay - Only on table content, not entire page */}
          {isFetching && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="flex flex-col items-center space-y-2">
                <RefreshCcw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-sm text-gray-600">
                  {searchTerm ? 'Searching...' : 'Loading...'}
                </span>
              </div>
            </div>
          )}
          
          {/* Empty state */}
          {quotations.length === 0 && !isFetching && (
            <div className="text-center py-12 px-4">
              <div className="max-w-sm mx-auto">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quotations found</h3>
                <p className="text-gray-500 mb-4 text-sm leading-relaxed">
                  {searchTerm || filters.status || filters.start_date || filters.end_date 
                    ? 'No quotations match your current search and filter criteria. Try adjusting your filters or search terms.'
                    : 'No quotations have been created yet. Create your first quotation to get started.'}
                </p>
                {(searchTerm || filters.status || filters.start_date || filters.end_date) && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear all filters
                  </button>
                )}
                {(!searchTerm && !filters.status && !filters.start_date && !filters.end_date) && (
                  <Link
                    to="/quotations/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Quotation
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {quotations.length > 0 && pagination && (
          <div className="mt-6">
            <Pagination
              pagination={{
                current_page: pagination.current_page || 1,
                per_page: pagination.per_page || filters.limit,
                total: pagination.total || 0,
                total_pages: pagination.total_pages || 1,
                has_prev_page: pagination.has_prev || false,
                has_next_page: pagination.has_next || false,
                from: ((pagination.current_page || 1) - 1) * (pagination.per_page || filters.limit) + 1,
                to: Math.min((pagination.current_page || 1) * (pagination.per_page || filters.limit), pagination.total || 0),
              }}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
            />
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialog.open}
          title="Delete Quotation"
          message="Are you sure you want to delete this quotation? This action cannot be undone."
          confirmLabel="Delete"
          confirmVariant="danger"
          onConfirm={() => {
            if (deleteDialog.id) {
              deleteMutation.mutate(deleteDialog.id);
            }
          }}
          onCancel={() => setDeleteDialog({ open: false, id: null })}
          loading={deleteMutation.isPending}
        />

        {/* Loading Overlay for Actions */}
        {(deleteMutation.isPending || bulkUpdateMutation.isPending) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-4 shadow-xl min-w-[300px]">
              <LoadingSpinner size="lg" />
              <div>
                <div className="text-gray-900 font-medium">
                  {deleteMutation.isPending && 'Deleting Quotation'}
                  {bulkUpdateMutation.isPending && 'Updating Quotations'}
                </div>
                <div className="text-gray-500 text-sm mt-1">
                  {deleteMutation.isPending && 'Please wait while we delete the quotation...'}
                  {bulkUpdateMutation.isPending && `Please wait while we update ${selectedQuotations.length} quotations...`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotationList;